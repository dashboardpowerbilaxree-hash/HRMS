import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function calcHours(checkIn: string, checkOut: string): number {
  const [h1, m1] = checkIn.split(':').map(Number);
  const [h2, m2] = checkOut.split(':').map(Number);
  return Math.max(0, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || '';
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const date = searchParams.get('date') || '';

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (date) {
      const d = new Date(date);
      where.date = { gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()), lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) };
    } else {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      where.date = { gte: start, lt: end };
    }

    const records = await db.attendance.findMany({
      where,
      include: { employee: { select: { fullName: true, employeeId: true, department: true } } },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(records);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, date, checkIn, checkOut } = body;

    const employee = await db.employee.findUnique({ where: { employeeId } });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const d = new Date(date);
    const dayOfWeek = d.getDay();
    const isWeeklyOff = dayOfWeek === 0;

    const holidays = await db.holiday.findMany({
      where: {
        date: { gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()), lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) },
      },
    });
    const isHoliday = holidays.length > 0;

    let totalHours = 0;
    let lateEntry = false;
    let halfDay = false;
    let overtimeHours = 0;
    let status = 'present';

    if (checkIn && checkOut) {
      totalHours = calcHours(checkIn, checkOut);
      const gracePeriod = 15;
      const [shiftH, shiftM] = employee.shiftStart.split(':').map(Number);
      const [checkInH, checkInM] = checkIn.split(':').map(Number);
      const shiftMinutes = shiftH * 60 + shiftM;
      const checkInMinutes = checkInH * 60 + checkInM;
      lateEntry = checkInMinutes > shiftMinutes + gracePeriod;
      halfDay = totalHours < employee.shiftHours / 2;
      overtimeHours = Math.max(0, totalHours - employee.shiftHours);
      status = isWeeklyOff ? 'weekly_off' : isHoliday ? 'holiday' : halfDay ? 'half_day' : lateEntry ? 'late' : 'present';
    } else if (isWeeklyOff) {
      status = 'weekly_off';
    } else if (isHoliday) {
      status = 'holiday';
    } else {
      status = 'absent';
    }

    const existing = await db.attendance.findFirst({
      where: { employeeId, date: { gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()), lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) } },
    });

    let record;
    if (existing) {
      record = await db.attendance.update({
        where: { id: existing.id },
        data: { checkIn, checkOut, totalHours, status, lateEntry, halfDay, overtimeHours, isHoliday, isWeeklyOff, remarks: body.remarks },
      });
    } else {
      record = await db.attendance.create({
        data: { employeeId, date: d, checkIn, checkOut, totalHours, status, lateEntry, halfDay, overtimeHours, isHoliday, isWeeklyOff, remarks: body.remarks },
      });
    }

    if (overtimeHours > 0) {
      await db.overtime.upsert({
        where: { id: `ot-${record.id}` },
        update: { hours: overtimeHours, rate: employee.overtimeRate, amount: overtimeHours * employee.overtimeRate, isHoliday: isHoliday || isWeeklyOff },
        create: { id: `ot-${record.id}`, employeeId, date: d, hours: overtimeHours, rate: employee.overtimeRate, amount: overtimeHours * employee.overtimeRate, isHoliday: isHoliday || isWeeklyOff },
      });
    }

    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
