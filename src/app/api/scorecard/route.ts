import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ── Attendance Compliance Scorecard Logic ──

// Official Reporting Time = 10:00 AM
const OFFICIAL_TIME = '10:00';
// Grace period in minutes (configurable via query param, default 15)
// With 15 min grace, reporting up to 10:15 AM is considered on-time
const DEFAULT_GRACE_MINUTES = 15;

function calculateRating(lateCount: number, hasLateBeyondGrace: boolean): number {
  // If any late coming beyond grace period, max rating is 4
  // Strict Attendance Discipline Score:
  // 100% On-Time = 5
  // 1 Late Mark = 4
  // 2-3 Late Marks = 3
  // 4-5 Late Marks = 2
  // More Than 5 Late Marks = 1
  if (lateCount === 0) return 5;
  if (lateCount === 1) return 4;
  if (lateCount <= 3) return 3;
  if (lateCount <= 5) return 2;
  return 1;
}

function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function isLate(checkIn: string, officialTime: string, graceMinutes: number): boolean {
  const checkInMin = timeToMinutes(checkIn);
  const officialMin = timeToMinutes(officialTime) + graceMinutes;
  return checkInMin > officialMin;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const firm = searchParams.get('firm') || '';
    const location = searchParams.get('location') || '';
    const employeeId = searchParams.get('employeeId') || '';
    const graceMinutes = parseInt(searchParams.get('grace') || String(DEFAULT_GRACE_MINUTES));

    // Build employee filter
    const empWhere: any = { status: 'Yes' };
    if (firm) empWhere.firm = firm;
    if (location) empWhere.location = location;
    if (employeeId) empWhere.employeeId = employeeId;

    const employees = await db.employee.findMany({
      where: empWhere,
      select: {
        employeeId: true, fullName: true, firm: true, location: true,
        designation: true, shiftStart: true, shiftEnd: true, shiftHours: true,
      },
    });

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Get attendance
    const attendance = await db.attendance.findMany({
      where: {
        date: { gte: startDate, lt: endDate },
        employee: empWhere,
      },
      orderBy: { date: 'asc' },
    });

    // Get leaves
    const leaves = await db.leave.findMany({
      where: {
        startDate: { lt: endDate },
        endDate: { gte: startDate },
        status: 'approved',
      },
    });

    // Working days — LIVE scorecard calculation:
    // For the current month, only count working days up to the latest date that has
    // attendance data. Employees should NOT be penalized for days where attendance
    // hasn't been uploaded yet or days that haven't happened.
    // For past months, use the full month's working days.
    const today = new Date();
    const isCurrentMonth = (today.getFullYear() === year && today.getMonth() + 1 === month);

    const daysInMonth = new Date(year, month, 0).getDate();

    // Find the latest date in actual attendance data
    const latestAttendanceDate = attendance.length > 0
      ? new Date(Math.max(...attendance.map(a => new Date(a.date).getTime())))
      : null;
    const latestAttendanceDay = latestAttendanceDate
      ? Math.min(latestAttendanceDate.getDate(), daysInMonth)
      : 0;

    // Cutoff day for scorecard calculation:
    // - Current month: use the latest attendance date (data-driven, not today)
    //   If no attendance yet, use today
    // - Past months: use full month
    let scorecardCutoffDay: number;
    if (isCurrentMonth) {
      scorecardCutoffDay = latestAttendanceDay > 0 ? latestAttendanceDay : Math.min(today.getDate(), daysInMonth);
    } else {
      scorecardCutoffDay = daysInMonth;
    }

    let totalWorkingDays = 0;
    let elapsedWorkingDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      if (dayOfWeek !== 0) totalWorkingDays++;
      if (d <= scorecardCutoffDay && dayOfWeek !== 0) elapsedWorkingDays++;
    }
    const holidays = await db.holiday.findMany({ where: { date: { gte: startDate, lt: endDate } } });

    // Count only holidays that fall within the elapsed period
    const elapsedHolidays = holidays.filter(h => {
      const hd = new Date(h.date);
      return hd.getDate() <= scorecardCutoffDay;
    }).length;
    const totalHolidaysCount = holidays.length;

    totalWorkingDays = Math.max(totalWorkingDays - totalHolidaysCount, 1);
    elapsedWorkingDays = Math.max(elapsedWorkingDays - elapsedHolidays, 1);

    // For live scorecard: use elapsed working days as the effective working days
    const workingDays = isCurrentMonth ? elapsedWorkingDays : totalWorkingDays;

    // Group attendance by employee
    const empAttendance = new Map<string, typeof attendance>();
    for (const rec of attendance) {
      if (!empAttendance.has(rec.employeeId)) empAttendance.set(rec.employeeId, []);
      empAttendance.get(rec.employeeId)!.push(rec);
    }

    // Calculate scorecard for each employee
    const scorecards = employees.map(emp => {
      const records = empAttendance.get(emp.employeeId) || [];

      let presentDays = 0;
      let absentDays = 0;
      let onTimeDays = 0;
      let lateDays = 0;
      let earlyOutDays = 0;
      let halfDays = 0;
      let uninformedLeaveDays = 0;
      let overtimeDays = 0;
      let totalOvertimeHours = 0;
      let totalWorkHours = 0;
      let sundayWorkingDays = 0;

      const lateInstances: { date: string; checkIn: string; minutesLate: number }[] = [];
      const earlyOutInstances: { date: string; checkOut: string }[] = [];

      for (const rec of records) {
        // Skip holidays, Sundays, weekly offs from work-day counting
        if (rec.isSunday) {
          if (rec.status !== 'absent') sundayWorkingDays++;
          continue;
        }
        if (rec.isHoliday || rec.isWeeklyOff) continue;

        if (rec.status === 'absent') {
          absentDays++;
          // Check if this absent day has an approved leave
          const hasLeave = leaves.some(l => l.employeeId === emp.employeeId && {
            start: new Date(l.startDate), end: new Date(l.endDate)
          } && rec.date >= new Date(leaves.find(l => l.employeeId === emp.employeeId)!.startDate) && rec.date <= new Date(leaves.find(l => l.employeeId === emp.employeeId)!.endDate));
          if (!hasLeave) uninformedLeaveDays++;
        } else {
          presentDays++;
          if (rec.halfDay) halfDays++;

          // Check late using ONLY the scorecard's official reporting time + grace period.
          // Do NOT use rec.lateEntry here — that flag comes from the attendance system
          // which may use a different grace period. The scorecard has its own grace logic.
          const checkInTime = rec.checkIn || '';
          const late = isLate(checkInTime, OFFICIAL_TIME, graceMinutes);
          if (late) {
            lateDays++;
            const minutesLate = Math.max(0, timeToMinutes(checkInTime) - timeToMinutes(OFFICIAL_TIME) - graceMinutes);
            lateInstances.push({
              date: new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
              checkIn: checkInTime,
              minutesLate,
            });
          } else {
            onTimeDays++;
          }

          if (rec.earlyOut) {
            earlyOutDays++;
            earlyOutInstances.push({
              date: new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
              checkOut: rec.checkOut || '',
            });
          }

          if (rec.overtimeHours > 0) {
            overtimeDays++;
            totalOvertimeHours += rec.overtimeHours;
          }

          totalWorkHours += rec.totalHours || 0;
        }
      }

      // Calculate attendance rate
      const attendanceRate = workingDays > 0 ? (presentDays / workingDays) * 100 : 0;
      const punctualityRate = presentDays > 0 ? (onTimeDays / presentDays) * 100 : 0;

      // Strict Attendance Discipline Score
      const disciplineRating = calculateRating(lateDays, lateDays > 0);

      // Attendance Excellence Award eligibility
      const isExcellenceEligible =
        lateDays === 0 &&
        earlyOutDays === 0 &&
        uninformedLeaveDays === 0 &&
        attendanceRate >= 98;

      // Overall rating (1-5) considering attendance % and discipline
      let overallRating = disciplineRating;
      // Adjust for attendance rate
      if (attendanceRate < 80 && overallRating > 2) overallRating = 2;
      else if (attendanceRate < 90 && overallRating > 3) overallRating = 3;

      // Generate alerts
      const alerts: { type: 'danger' | 'warning' | 'success' | 'info'; message: string }[] = [];

      if (lateDays > 0) {
        const cutoffTime = graceMinutes > 0 ? `${OFFICIAL_TIME} (+${graceMinutes} min grace)` : OFFICIAL_TIME;
        alerts.push({ type: 'danger', message: `Reported after ${cutoffTime} AM on ${lateDays} occasion${lateDays > 1 ? 's' : ''} this month.` });
      }
      if (lateDays >= 3) {
        alerts.push({ type: 'danger', message: `Crossed monthly late-coming threshold (${lateDays} late marks).` });
      }
      if (lateDays >= 1 && lateDays < 3) {
        alerts.push({ type: 'warning', message: `Close to warning level — ${lateDays} late mark${lateDays > 1 ? 's' : ''} so far.` });
      }
      if (lateDays === 0 && presentDays > 0) {
        alerts.push({ type: 'success', message: 'Maintained perfect punctuality this month!' });
      }
      if (absentDays > 3) {
        alerts.push({ type: 'danger', message: `High absenteeism — ${absentDays} absent days this month.` });
      }
      if (earlyOutDays > 0) {
        alerts.push({ type: 'warning', message: `Early checkout on ${earlyOutDays} occasion${earlyOutDays > 1 ? 's' : ''}.` });
      }
      if (isExcellenceEligible) {
        alerts.push({ type: 'success', message: 'Qualifies for Attendance Excellence recognition! 🏆' });
      }

      // Generate AI insights
      const insights: string[] = [];
      if (lateDays > 0) {
        insights.push(`Employee reported after official reporting time on ${lateDays} occasion${lateDays > 1 ? 's' : ''} this month.`);
      }
      if (disciplineRating < 5) {
        insights.push(`Attendance discipline score is ${disciplineRating}/5 due to late reporting.`);
      }
      if (lateDays === 0 && presentDays > 0) {
        insights.push('Employee maintained 100% punctuality and qualifies for attendance excellence recognition.');
      }
      if (earlyOutDays > 0) {
        insights.push(`Early departure detected on ${earlyOutDays} day${earlyOutDays > 1 ? 's' : ''} — review required.`);
      }
      if (attendanceRate >= 98) {
        insights.push(`Outstanding attendance rate of ${attendanceRate.toFixed(1)}% — excellent commitment.`);
      } else if (attendanceRate < 80) {
        insights.push(`Attendance rate of ${attendanceRate.toFixed(1)}% is below acceptable threshold — needs attention.`);
      }

      return {
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        firm: emp.firm || '',
        location: emp.location || '',
        designation: emp.designation || '',
        shiftStart: emp.shiftStart,
        shiftEnd: emp.shiftEnd,
        workingDays,
        presentDays,
        absentDays,
        onTimeDays,
        lateDays,
        halfDays,
        earlyOutDays,
        uninformedLeaveDays,
        overtimeDays,
        totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
        totalWorkHours: Math.round(totalWorkHours * 100) / 100,
        sundayWorkingDays,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        punctualityRate: Math.round(punctualityRate * 10) / 10,
        disciplineRating,
        overallRating,
        isExcellenceEligible,
        lateInstances,
        earlyOutInstances,
        alerts,
        insights,
      };
    });

    // Sort by overall rating desc, then by attendance rate desc
    scorecards.sort((a, b) => b.overallRating - a.overallRating || b.attendanceRate - a.attendanceRate);

    // Department-wise punctuality compliance
    const deptMap: Record<string, { firm: string; employees: number; totalPunctuality: number; totalAttendance: number; avgRating: number }> = {};
    for (const sc of scorecards) {
      const f = sc.firm || 'Other';
      if (!deptMap[f]) deptMap[f] = { firm: f, employees: 0, totalPunctuality: 0, totalAttendance: 0, avgRating: 0 };
      deptMap[f].employees++;
      deptMap[f].totalPunctuality += sc.punctualityRate;
      deptMap[f].totalAttendance += sc.attendanceRate;
      deptMap[f].avgRating += sc.overallRating;
    }
    const deptCompliance = Object.values(deptMap).map(d => ({
      firm: d.firm,
      employees: d.employees,
      punctualityCompliance: Math.round((d.totalPunctuality / d.employees) * 10) / 10,
      attendanceCompliance: Math.round((d.totalAttendance / d.employees) * 10) / 10,
      avgRating: Math.round((d.avgRating / d.employees) * 10) / 10,
    }));

    // Summary
    const totalEmployees = scorecards.length;
    const avgRating = totalEmployees > 0 ? Math.round((scorecards.reduce((s, e) => s + e.overallRating, 0) / totalEmployees) * 10) / 10 : 0;
    const perfectAttendance = scorecards.filter(e => e.disciplineRating === 5).length;
    const atRisk = scorecards.filter(e => e.overallRating <= 2).length;
    const excellenceEligible = scorecards.filter(e => e.isExcellenceEligible).length;

    return NextResponse.json({
      month,
      year,
      workingDays,
      totalWorkingDays,
      isLiveMonth: isCurrentMonth,
      dataUptoDay: isCurrentMonth ? scorecardCutoffDay : daysInMonth,
      officialTime: OFFICIAL_TIME,
      graceMinutes,
      summary: { totalEmployees, avgRating, perfectAttendance, atRisk, excellenceEligible },
      deptCompliance,
      scorecards,
    });
  } catch (error: any) {
    console.error('Scorecard error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
