import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper: convert "HH:MM" string to total minutes
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

// Helper: convert total minutes back to "HH:MM"
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Helper: get week number within a month (1-based)
function getWeekOfMonth(date: Date): number {
  const dayOfMonth = date.getDate();
  return Math.ceil(dayOfMonth / 7);
}

// Helper: count working days in a month (Mon-Sat)
function countWorkingDays(year: number, month: number): number {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  let count = 0;
  const d = new Date(start);
  while (d < end) {
    const day = d.getDay();
    if (day !== 0) count++; // exclude Sunday
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()));

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ─── 1. Gender Ratio ────────────────────────────────────────
    const activeEmployees = await db.employee.findMany({
      where: { status: { notIn: ['inactive', 'No'] } },
      select: { gender: true },
    });

    const genderRatio = { male: 0, female: 0, other: 0 };
    for (const emp of activeEmployees) {
      const g = (emp.gender || '').toLowerCase();
      if (g === 'male') genderRatio.male++;
      else if (g === 'female') genderRatio.female++;
      else genderRatio.other++;
    }

    // ─── 2. Attendance Analytics ────────────────────────────────
    const attendanceRecords = await db.attendance.findMany({
      where: { date: { gte: monthStart, lt: monthEnd } },
      include: {
        employee: {
          select: { firm: true, location: true, shiftHours: true, shiftStart: true, shiftEnd: true, employmentType: true },
        },
      },
    });

    // Average check-in time
    const checkIns = attendanceRecords
      .filter(r => r.checkIn && r.status !== 'absent')
      .map(r => timeToMinutes(r.checkIn!));
    const avgCheckInMinutes = checkIns.length > 0
      ? checkIns.reduce((a, b) => a + b, 0) / checkIns.length
      : 0;

    // Average check-out time
    const checkOuts = attendanceRecords
      .filter(r => r.checkOut && r.status !== 'absent')
      .map(r => timeToMinutes(r.checkOut!));
    const avgCheckOutMinutes = checkOuts.length > 0
      ? checkOuts.reduce((a, b) => a + b, 0) / checkOuts.length
      : 0;

    // Average shift hours from all active employees
    const avgShiftHours = activeEmployees.length > 0
      ? await db.employee.aggregate({
          _avg: { shiftHours: true },
          where: { status: { notIn: ['inactive', 'No'] } },
        }).then(r => r._avg.shiftHours ?? 0)
      : 0;

    // On-time arrival: records with checkIn and lateEntry=false and status not absent
    const recordsWithCheckIn = attendanceRecords.filter(r => r.checkIn && r.status !== 'absent');
    const onTimeRecords = recordsWithCheckIn.filter(r => !r.lateEntry);
    const lateRecords = attendanceRecords.filter(r => r.lateEntry);
    const earlyOutRecords = attendanceRecords.filter(r => r.earlyOut);

    const onTimeArrivalPct = recordsWithCheckIn.length > 0
      ? Math.round((onTimeRecords.length / recordsWithCheckIn.length) * 1000) / 10
      : 0;

    const lateArrivalPct = recordsWithCheckIn.length > 0
      ? Math.round((lateRecords.length / recordsWithCheckIn.length) * 1000) / 10
      : 0;

    const earlyOutPct = recordsWithCheckIn.length > 0
      ? Math.round((earlyOutRecords.length / recordsWithCheckIn.length) * 1000) / 10
      : 0;

    // Average work hours (totalHours where > 0)
    const presentRecords = attendanceRecords.filter(r => r.totalHours > 0);
    const avgWorkHours = presentRecords.length > 0
      ? Math.round((presentRecords.reduce((sum, r) => sum + r.totalHours, 0) / presentRecords.length) * 100) / 100
      : 0;

    // Attendance rate: (present + late + early-out records) / (working days × active employees) × 100
    const workingDays = countWorkingDays(year, month);
    const presentOrLateCount = attendanceRecords.filter(
      r => !r.isSunday && !r.isHoliday && !r.isWeeklyOff && r.status !== 'absent'
    ).length;
    const totalExpected = workingDays * activeEmployees.length;
    const attendanceRate = totalExpected > 0
      ? Math.round((presentOrLateCount / totalExpected) * 1000) / 10
      : 0;
    const absenteeismRate = Math.round((100 - attendanceRate) * 10) / 10;

    const attendanceAnalytics = {
      avgCheckInTime: minutesToTime(avgCheckInMinutes),
      avgCheckOutTime: minutesToTime(avgCheckOutMinutes),
      avgShiftHours: Math.round(avgShiftHours * 100) / 100,
      onTimeArrivalPct,
      lateArrivalPct,
      earlyOutPct,
      avgWorkHours,
      attendanceRate,
      absenteeismRate,
    };

    // ─── 3. Daily Summary (for today) ──────────────────────────
    const todayRecords = await db.attendance.findMany({
      where: { date: { gte: today, lt: tomorrow } },
    });

    const isSunday = today.getDay() === 0;
    const todayHoliday = await db.holiday.findFirst({
      where: { date: { gte: today, lt: tomorrow } },
    });

    const dailySummary = {
      totalEmployees: activeEmployees.length,
      present: todayRecords.filter(r => ['present', 'late', 'half-day', 'half_day'].includes(r.status) || (r.status !== 'absent' && r.totalHours > 0)).length,
      absent: todayRecords.filter(r => r.status === 'absent').length,
      late: todayRecords.filter(r => r.lateEntry).length,
      earlyOut: todayRecords.filter(r => r.earlyOut).length,
      onTime: todayRecords.filter(r => !r.lateEntry && r.status !== 'absent' && r.checkIn).length,
      halfDay: todayRecords.filter(r => r.halfDay).length,
      holiday: !!todayHoliday,
      sunday: isSunday,
    };

    // ─── 4. Firm Analytics ─────────────────────────────────────
    const employeesByFirm = await db.employee.findMany({
      where: { status: { notIn: ['inactive', 'No'] } },
      select: { employeeId: true, firm: true },
    });

    const firmEmployeeMap: Record<string, string[]> = {};
    for (const emp of employeesByFirm) {
      if (!firmEmployeeMap[emp.firm]) firmEmployeeMap[emp.firm] = [];
      firmEmployeeMap[emp.firm].push(emp.employeeId);
    }

    const todayAttendanceByEmp = await db.attendance.findMany({
      where: { date: { gte: today, lt: tomorrow }, status: { not: 'absent' } },
      select: { employeeId: true, totalHours: true },
    });

    const todayPresentSet = new Set(todayAttendanceByEmp.map(a => a.employeeId));

    const monthAttendanceByEmp = await db.attendance.findMany({
      where: {
        date: { gte: monthStart, lt: monthEnd },
        status: { not: 'absent' },
        isSunday: false,
        isHoliday: false,
        isWeeklyOff: false,
      },
      select: { employeeId: true, totalHours: true },
    });

    const firmAnalytics = Object.entries(firmEmployeeMap).map(([firm, empIds]) => {
      const presentToday = empIds.filter(id => todayPresentSet.has(id)).length;
      const firmAttendanceRecords = monthAttendanceByEmp.filter(r => empIds.includes(r.employeeId));
      const totalPossible = workingDays * empIds.length;
      const attRate = totalPossible > 0
        ? Math.round((firmAttendanceRecords.length / totalPossible) * 1000) / 10
        : 0;
      const avgWH = firmAttendanceRecords.length > 0
        ? Math.round((firmAttendanceRecords.reduce((sum, r) => sum + r.totalHours, 0) / firmAttendanceRecords.length) * 100) / 100
        : 0;

      return {
        firm,
        employees: empIds.length,
        presentToday,
        attendanceRate: attRate,
        avgWorkHours: avgWH,
      };
    });

    // ─── 5. Location Analytics ──────────────────────────────────
    const employeesByLocation = await db.employee.findMany({
      where: { status: { notIn: ['inactive', 'No'] } },
      select: { employeeId: true, location: true },
    });

    const locationEmployeeMap: Record<string, string[]> = {};
    for (const emp of employeesByLocation) {
      if (!locationEmployeeMap[emp.location]) locationEmployeeMap[emp.location] = [];
      locationEmployeeMap[emp.location].push(emp.employeeId);
    }

    const locationAnalytics = Object.entries(locationEmployeeMap).map(([location, empIds]) => {
      const presentToday = empIds.filter(id => todayPresentSet.has(id)).length;
      const locAttendanceRecords = monthAttendanceByEmp.filter(r => empIds.includes(r.employeeId));
      const totalPossible = workingDays * empIds.length;
      const attRate = totalPossible > 0
        ? Math.round((locAttendanceRecords.length / totalPossible) * 1000) / 10
        : 0;

      return {
        location,
        employees: empIds.length,
        presentToday,
        attendanceRate: attRate,
      };
    });

    // ─── 6. Weekly Trend ───────────────────────────────────────
    const weeklyMap: Record<number, { present: number; absent: number; late: number; earlyOut: number }> = {};

    for (const record of attendanceRecords) {
      const weekNum = getWeekOfMonth(new Date(record.date));
      if (!weeklyMap[weekNum]) {
        weeklyMap[weekNum] = { present: 0, absent: 0, late: 0, earlyOut: 0 };
      }
      if (record.status === 'absent') {
        weeklyMap[weekNum].absent++;
      } else {
        weeklyMap[weekNum].present++;
      }
      if (record.lateEntry) weeklyMap[weekNum].late++;
      if (record.earlyOut) weeklyMap[weekNum].earlyOut++;
    }

    const weeklyTrend = Object.entries(weeklyMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([weekNum, data]) => ({
        week: `Week ${weekNum}`,
        ...data,
      }));

    // ─── 7. Employment Type Breakdown ───────────────────────────
    const empTypeCounts = await db.employee.groupBy({
      by: ['employmentType'],
      _count: { employmentType: true },
      where: { status: { notIn: ['inactive', 'No'] } },
    });

    const employmentTypeBreakdown = empTypeCounts.map(item => ({
      type: item.employmentType || 'Unspecified',
      count: item._count.employmentType,
    }));

    // ─── 8. Shift Distribution ─────────────────────────────────
    const shiftCounts = await db.employee.groupBy({
      by: ['shiftStart', 'shiftEnd'],
      _count: { shiftStart: true },
      where: { status: { notIn: ['inactive', 'No'] } },
    });

    const shiftDistribution = shiftCounts.map(item => ({
      shift: `${item.shiftStart}-${item.shiftEnd}`,
      count: item._count.shiftStart,
    }));

    // ─── Build Response ────────────────────────────────────────
    return NextResponse.json({
      genderRatio,
      attendanceAnalytics,
      dailySummary,
      firmAnalytics,
      locationAnalytics,
      weeklyTrend,
      employmentTypeBreakdown,
      shiftDistribution,
    });
  } catch (error: unknown) {
    console.error('Analytics API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
