import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || '';
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const department = searchParams.get('department') || '';

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    where.date = { gte: start, lt: end };

    if (department) {
      const emps = await db.employee.findMany({
        where: { department },
        select: { employeeId: true },
      });
      where.employeeId = { in: emps.map(e => e.employeeId) };
    }

    const records = await db.overtime.findMany({
      where,
      include: {
        employee: {
          select: {
            fullName: true,
            employeeId: true,
            department: true,
            location: true,
            overtimeRate: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Summary
    const summary = {
      totalRecords: records.length,
      totalHours: records.reduce((sum, r) => sum + r.hours, 0),
      totalAmount: records.reduce((sum, r) => sum + r.amount, 0),
      sundayOT: records.filter(r => r.isSunday).reduce((sum, r) => sum + r.hours, 0),
      holidayOT: records.filter(r => r.isHoliday).reduce((sum, r) => sum + r.hours, 0),
    };

    return NextResponse.json({ records, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify employee exists
    const employee = await db.employee.findUnique({ where: { employeeId: body.employeeId } });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Auto-detect Sunday
    const d = new Date(body.date);
    const isSunday = d.getDay() === 0;

    // Use provided rate or employee's overtime rate
    const rate = body.rate || employee.overtimeRate;
    const hours = body.hours || 0;
    const amount = hours * rate;

    // Auto-detect if it's a holiday
    let isHoliday = body.isHoliday || false;
    if (!isHoliday) {
      const holidayDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const nextDay = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      const holidays = await db.holiday.findMany({
        where: { date: { gte: holidayDate, lt: nextDay } },
      });
      isHoliday = holidays.length > 0;
    }

    const record = await db.overtime.create({
      data: {
        employeeId: body.employeeId,
        date: d,
        hours,
        rate,
        amount: Math.round(amount * 100) / 100,
        isHoliday,
        isSunday: body.isSunday !== undefined ? body.isSunday : isSunday,
        status: body.status || 'approved',
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
