import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const department = searchParams.get('department') || '';
    const location = searchParams.get('location') || '';

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const where: any = { date: { gte: startDate, lt: endDate } };
    if (department || location) {
      const empFilter: any = {};
      if (department) empFilter.department = department;
      if (location) empFilter.location = location;
      const emps = await db.employee.findMany({ where: empFilter, select: { employeeId: true } });
      where.employeeId = { in: emps.map(e => e.employeeId) };
    }

    const records = await db.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            fullName: true,
            employeeId: true,
            department: true,
            designation: true,
            location: true,
            shiftHours: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const summary = {
      totalRecords: records.length,
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.lateEntry).length,
      halfDay: records.filter(r => r.halfDay).length,
      holiday: records.filter(r => r.isHoliday && !r.isPH).length,
      weeklyOff: records.filter(r => r.isWeeklyOff && !r.isSunday).length,
      sundayWorked: records.filter(r => r.isSunday && r.totalHours > 0).length,
      phWorked: records.filter(r => r.isPH && r.totalHours > 0).length,
      totalWorkHours: records.reduce((sum, r) => sum + r.totalHours, 0),
      totalOvertimeHours: records.reduce((sum, r) => sum + r.overtimeHours, 0),
      totalSundayHours: records.reduce((sum, r) => sum + r.sundayHours, 0),
      totalPHHours: records.reduce((sum, r) => sum + r.phHours, 0),
    };

    // Firm-wise attendance breakdown
    const firmBreakdown: Record<string, {
      total: number;
      present: number;
      absent: number;
      late: number;
      sundayWorked: number;
      phWorked: number;
    }> = {};
    records.forEach(r => {
      const firm = (r.employee as any)?.department || 'Unknown';
      if (!firmBreakdown[firm]) {
        firmBreakdown[firm] = { total: 0, present: 0, absent: 0, late: 0, sundayWorked: 0, phWorked: 0 };
      }
      firmBreakdown[firm].total++;
      if (r.status === 'present') firmBreakdown[firm].present++;
      if (r.status === 'absent') firmBreakdown[firm].absent++;
      if (r.lateEntry) firmBreakdown[firm].late++;
      if (r.isSunday && r.totalHours > 0) firmBreakdown[firm].sundayWorked++;
      if (r.isPH && r.totalHours > 0) firmBreakdown[firm].phWorked++;
    });

    // Location-wise attendance breakdown
    const locationBreakdown: Record<string, {
      total: number;
      present: number;
      absent: number;
      late: number;
    }> = {};
    records.forEach(r => {
      const loc = (r.employee as any)?.location || 'Unknown';
      if (!locationBreakdown[loc]) {
        locationBreakdown[loc] = { total: 0, present: 0, absent: 0, late: 0 };
      }
      locationBreakdown[loc].total++;
      if (r.status === 'present') locationBreakdown[loc].present++;
      if (r.status === 'absent') locationBreakdown[loc].absent++;
      if (r.lateEntry) locationBreakdown[loc].late++;
    });

    return NextResponse.json({ records, summary, firmBreakdown, locationBreakdown });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
