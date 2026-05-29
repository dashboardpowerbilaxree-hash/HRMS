import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const department = searchParams.get('department') || '';

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const where: any = { date: { gte: startDate, lt: endDate } };
    if (department) {
      const emps = await db.employee.findMany({ where: { department }, select: { employeeId: true } });
      where.employeeId = { in: emps.map(e => e.employeeId) };
    }

    const records = await db.attendance.findMany({
      where,
      include: { employee: { select: { fullName: true, employeeId: true, department: true, designation: true } } },
      orderBy: { date: 'desc' },
    });

    const summary = {
      totalRecords: records.length,
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.lateEntry).length,
      halfDay: records.filter(r => r.halfDay).length,
      holiday: records.filter(r => r.isHoliday).length,
      weeklyOff: records.filter(r => r.isWeeklyOff).length,
      totalOvertimeHours: records.reduce((sum, r) => sum + r.overtimeHours, 0),
    };

    return NextResponse.json({ records, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
