import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || '';
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    where.date = { gte: start, lt: end };

    const records = await db.overtime.findMany({
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
    const amount = (body.hours || 0) * (body.rate || 0);
    const record = await db.overtime.create({
      data: {
        employeeId: body.employeeId,
        date: new Date(body.date),
        hours: body.hours || 0,
        rate: body.rate || 0,
        amount,
        isHoliday: body.isHoliday || false,
        status: body.status || 'approved',
      },
    });
    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
