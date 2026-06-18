import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const firm = searchParams.get('firm') || '';
    const location = searchParams.get('location') || '';

    // Build employee filter
    const empWhere: any = {};
    if (firm) empWhere.firm = firm;
    if (location) empWhere.location = location;
    empWhere.status = 'Yes';

    // Get all active employees
    const employees = await db.employee.findMany({
      where: empWhere,
      select: {
        employeeId: true,
        fullName: true,
        firm: true,
        location: true,
        designation: true,
        shiftStart: true,
        shiftEnd: true,
        shiftHours: true,
      },
    });

    // Get attendance for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const attendance = await db.attendance.findMany({
      where: {
        date: { gte: startDate, lt: endDate },
        employee: empWhere,
      },
      include: {
        employee: {
          select: { fullName: true, firm: true, location: true, designation: true, shiftStart: true, shiftEnd: true, shiftHours: true },
        },
      },
    });

    // Total working days in month (excluding Sundays)
    const daysInMonth = new Date(year, month, 0).getDate();
    // ── Cutoff-aware working day count ──
    // For the current month, only count working days up to today
    // (so future days don't artificially inflate the "expected" total and
    // make everyone look absent).
    const today = new Date();
    const isCurrentMonth = (today.getFullYear() === year && today.getMonth() + 1 === month);
    const cutoffDay = isCurrentMonth ? today.getDate() : daysInMonth;
    let workingDays = 0;
    for (let d = 1; d <= cutoffDay; d++) {
      const day = new Date(year, month - 1, d).getDay();
      if (day !== 0) workingDays++;
    }

    // Subtract holidays (only those on/before cutoff day)
    const holidays = await db.holiday.findMany({
      where: { date: { gte: startDate, lt: endDate } },
    });
    const elapsedHolidays = holidays.filter(h => new Date(h.date).getDate() <= cutoffDay).length;
    workingDays = Math.max(workingDays - elapsedHolidays, 1);

    // Calculate per-employee metrics
    const empMap = new Map<string, {
      employeeId: string;
      fullName: string;
      firm: string;
      location: string;
      designation: string;
      shiftHours: number;
      totalDays: number;
      presentDays: number;
      absentDays: number;
      lateDays: number;
      halfDays: number;
      earlyOutDays: number;
      onTimeDays: number;
      overtimeDays: number;
      totalOvertimeHours: number;
      totalWorkHours: number;
      weeklyData: { week: number; present: number; absent: number; late: number; onTime: number }[];
    }>();

    // Initialize map for all employees
    for (const emp of employees) {
      empMap.set(emp.employeeId, {
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        firm: emp.firm || '',
        location: emp.location || '',
        designation: emp.designation || '',
        shiftHours: emp.shiftHours || 9,
        totalDays: workingDays,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        halfDays: 0,
        earlyOutDays: 0,
        onTimeDays: 0,
        overtimeDays: 0,
        totalOvertimeHours: 0,
        totalWorkHours: 0,
        weeklyData: [],
      });
    }

    // Process attendance records
    for (const rec of attendance) {
      const emp = empMap.get(rec.employeeId);
      if (!emp) continue;

      // Skip holidays and weekly offs for counting
      if (rec.isHoliday || rec.isSunday || rec.isWeeklyOff) continue;

      if (rec.status === 'absent') {
        emp.absentDays++;
      } else {
        emp.presentDays++;
        if (rec.lateEntry) emp.lateDays++;
        else emp.onTimeDays++;
        if (rec.halfDay) emp.halfDays++;
        if (rec.earlyOut) emp.earlyOutDays++;
        if (rec.overtimeHours > 0) {
          emp.overtimeDays++;
          emp.totalOvertimeHours += rec.overtimeHours;
        }
        emp.totalWorkHours += rec.totalHours || 0;
      }

      // Weekly breakdown
      const recDate = new Date(rec.date);
      const weekNum = Math.ceil(recDate.getDate() / 7);
      let weekData = emp.weeklyData.find(w => w.week === weekNum);
      if (!weekData) {
        weekData = { week: weekNum, present: 0, absent: 0, late: 0, onTime: 0 };
        emp.weeklyData.push(weekData);
      }
      if (rec.status === 'absent') weekData.absent++;
      else {
        weekData.present++;
        if (rec.lateEntry) weekData.late++;
        else weekData.onTime++;
      }
    }

    // Sort weekly data
    for (const emp of empMap.values()) {
      emp.weeklyData.sort((a, b) => a.week - b.week);
    }

    // Calculate scores and build results
    const results = Array.from(empMap.values()).map(emp => {
      const attendanceRate = emp.totalDays > 0 ? (emp.presentDays / emp.totalDays) * 100 : 0;
      const punctualityRate = emp.presentDays > 0 ? (emp.onTimeDays / emp.presentDays) * 100 : 0;
      const consistencyScore = attendanceRate * 0.6 + punctualityRate * 0.4;
      const avgWorkHours = emp.presentDays > 0 ? emp.totalWorkHours / emp.presentDays : 0;

      return {
        ...emp,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        punctualityRate: Math.round(punctualityRate * 10) / 10,
        consistencyScore: Math.round(consistencyScore * 10) / 10,
        avgWorkHours: Math.round(avgWorkHours * 100) / 100,
        totalOvertimeHours: Math.round(emp.totalOvertimeHours * 100) / 100,
      };
    });

    // Top Performers: highest consistency score
    const topPerformers = [...results]
      .sort((a, b) => b.consistencyScore - a.consistencyScore)
      .slice(0, 10);

    // Most Punctual: highest punctuality rate (min 5 present days)
    const mostPunctual = [...results]
      .filter(e => e.presentDays >= Math.min(5, workingDays * 0.3))
      .sort((a, b) => b.punctualityRate - a.punctualityRate)
      .slice(0, 10);

    // Irregular / Absentees: lowest attendance rate
    const irregularEmployees = [...results]
      .filter(e => e.absentDays > 0)
      .sort((a, b) => a.attendanceRate - b.attendanceRate)
      .slice(0, 10);

    // Inconsistent: high variance in weekly attendance
    const inconsistentEmployees = results.map(emp => {
      if (emp.weeklyData.length < 2) return { ...emp, variance: 0 };
      const weeklyPresent = emp.weeklyData.map(w => w.present);
      const avg = weeklyPresent.reduce((a, b) => a + b, 0) / weeklyPresent.length;
      const variance = weeklyPresent.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / weeklyPresent.length;
      return { ...emp, variance: Math.round(variance * 100) / 100 };
    }).sort((a, b) => b.variance - a.variance).slice(0, 10);

    // Most Overtime
    const mostOvertime = [...results]
      .filter(e => e.totalOvertimeHours > 0)
      .sort((a, b) => b.totalOvertimeHours - a.totalOvertimeHours)
      .slice(0, 10);

    // Weekly trend across all employees
    const maxWeeks = Math.ceil(daysInMonth / 7);
    const weeklyTrend = [];
    for (let w = 1; w <= maxWeeks; w++) {
      const weekStart = (w - 1) * 7 + 1;
      const weekEnd = Math.min(w * 7, daysInMonth);
      let present = 0, absent = 0, late = 0, onTime = 0, halfDay = 0;
      for (const rec of attendance) {
        const recDate = new Date(rec.date);
        const dayOfMonth = recDate.getDate();
        if (dayOfMonth >= weekStart && dayOfMonth <= weekEnd) {
          if (rec.isHoliday || rec.isSunday || rec.isWeeklyOff) continue;
          if (rec.status === 'absent') absent++;
          else {
            present++;
            if (rec.lateEntry) late++;
            else onTime++;
            if (rec.halfDay) halfDay++;
          }
        }
      }
      weeklyTrend.push({
        week: `Week ${w}`,
        weekNum: w,
        period: `${weekStart}-${weekEnd}`,
        present,
        absent,
        late,
        onTime,
        halfDay,
      });
    }

    // Firm-wise performance
    const firmPerformance: Record<string, { firm: string; employees: number; avgAttendance: number; avgPunctuality: number; avgConsistency: number }> = {};
    for (const r of results) {
      const f = r.firm || 'Other';
      if (!firmPerformance[f]) firmPerformance[f] = { firm: f, employees: 0, avgAttendance: 0, avgPunctuality: 0, avgConsistency: 0 };
      firmPerformance[f].employees++;
      firmPerformance[f].avgAttendance += r.attendanceRate;
      firmPerformance[f].avgPunctuality += r.punctualityRate;
      firmPerformance[f].avgConsistency += r.consistencyScore;
    }
    const firmWisePerformance = Object.values(firmPerformance).map(f => ({
      ...f,
      avgAttendance: Math.round((f.avgAttendance / f.employees) * 10) / 10,
      avgPunctuality: Math.round((f.avgPunctuality / f.employees) * 10) / 10,
      avgConsistency: Math.round((f.avgConsistency / f.employees) * 10) / 10,
    }));

    // Summary stats
    const totalEmployees = results.length;
    const avgAttendanceRate = totalEmployees > 0 ? Math.round((results.reduce((s, e) => s + e.attendanceRate, 0) / totalEmployees) * 10) / 10 : 0;
    const avgPunctualityRate = totalEmployees > 0 ? Math.round((results.reduce((s, e) => s + e.punctualityRate, 0) / totalEmployees) * 10) / 10 : 0;
    const avgConsistencyScore = totalEmployees > 0 ? Math.round((results.reduce((s, e) => s + e.consistencyScore, 0) / totalEmployees) * 10) / 10 : 0;
    const totalAbsenteeism = results.reduce((s, e) => s + e.absentDays, 0);

    return NextResponse.json({
      month,
      year,
      workingDays,
      totalEmployees,
      summary: {
        avgAttendanceRate,
        avgPunctualityRate,
        avgConsistencyScore,
        totalAbsenteeism,
      },
      topPerformers,
      mostPunctual,
      irregularEmployees,
      inconsistentEmployees,
      mostOvertime,
      weeklyTrend,
      firmWisePerformance,
      allEmployees: results.sort((a, b) => b.consistencyScore - a.consistencyScore),
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
