import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getEffectiveCutoffDay,
  countSundaysUpTo,
  countHolidaysUpTo,
  filterAttendanceUpTo,
  getActualShiftHours,
  recomputeStatus,
  recomputeEarlyOutFlag,
} from '@/lib/payroll-calc';

const FIRM_NAMES: Record<string, string> = {
  LAPL: 'LAXREE AMENITIES PVT LTD',
  LRSL: 'LAXREE ROOFING SOLUTION',
  SI: 'SMARTH INTERNATIONAL',
  SDF: 'SANGRAH DECOR & FURNITURE',
};

// ── Get firm code from employee ID prefix ──
function getFirmFromEmployeeId(employeeId: string): string {
  const id = employeeId.toUpperCase();
  if (id.startsWith('LAPL')) return 'LAPL';
  if (id.startsWith('LRSL')) return 'LRSL';
  if (id.startsWith('SI-') || id.startsWith('SI0')) return 'SI';
  if (id.startsWith('SDF')) return 'SDF';
  return ''; // fallback to existing firm field
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || '';
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }

    const employee = await db.employee.findUnique({
      where: { employeeId },
      select: {
        fullName: true,
        employeeId: true,
        firm: true,
        location: true,
        department: true,
        designation: true,
        shiftHours: true,
        shiftStart: true,
        shiftEnd: true,
        employmentType: true,
        hourlyRate: true,
        monthlySalary: true,
        overtimeRate: true,
        relievingDate: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Get all attendance records for this employee in this month
    const attendance = await db.attendance.findMany({
      where: { employeeId, date: { gte: startDate, lt: endDate } },
      orderBy: { date: 'asc' },
    });

    // Get approved leaves — use OVERLAP query so leaves spanning month
    // boundaries (e.g., June 27 to July 1) are correctly included in both
    // months. The previous query (startDate >= startOfMonth AND endDate <
    // endOfMonth) missed leaves that cross month boundaries.
    const leaves = await db.leave.findMany({
      where: { employeeId, status: 'approved', startDate: { lt: endDate }, endDate: { gte: startDate } },
    });
    const leaveDays = leaves.reduce((sum, l) => sum + l.days, 0);

    // Get holidays in this month
    const holidays = await db.holiday.findMany({
      where: { date: { gte: startDate, lt: endDate } },
    });
    const holidayDays = holidays.length;

    // ── Effective cutoff day ──
    // For the current month, cap at today (so future days are NOT counted as absent).
    // For past months, use the full month.
    // If the employee has a relievingDate in/before this month, cap at that day.
    const cutoffDay = getEffectiveCutoffDay(year, month, daysInMonth, employee.relievingDate);

    // Count Sundays only up to the cutoff day (NOT the whole month)
    const sundays = countSundaysUpTo(year, month, cutoffDay);

    // Holidays only count if they fall on or before the cutoff day
    const elapsedHolidays = countHolidaysUpTo(holidays, cutoffDay);

    // Filter attendance records defensively — drop any rows past the cutoff
    // (in case future-dated rows were uploaded)
    const effectiveAttendance = filterAttendanceUpTo(attendance, year, month, cutoffDay);

    // ── Compute this employee's ACTUAL shift hours ──
    // Stored shiftHours may be wrong (default 9h) if shiftEnd was uploaded in
    // 12-hour format. We recompute from shiftStart/shiftEnd with a 12h fix-up
    // so half-day detection uses the REAL shift duration (e.g., 4h for 10-14:00).
    const actualShiftHours = getActualShiftHours(employee.shiftHours, employee.shiftStart, employee.shiftEnd);

    // ── Recompute half-day AND early-out status on-the-fly for each record ──
    // Existing DB records may have status='half-day' or status='early-out'
    // set wrongly due to (a) the 12-hour format bug in upload routes, or
    // (b) the employee's shift being updated AFTER attendance was uploaded.
    // We recompute the effective status here WITHOUT modifying the DB
    // (per user's "no data tampering" instruction).
    // The corrected status is used for ALL display and calculation below.
    const correctedAttendance = effectiveAttendance.map(a => ({
      ...a,
      status: recomputeStatus(a, actualShiftHours, employee.shiftStart, employee.shiftEnd),
    }));

    // Calculate summary — use RECOMPUTED status so half-days that were
    // actually full shifts are counted as present, not half-day.
    // rawPresentDays = actual days with present/late/early-out status (working days only)
    const rawPresentDays = correctedAttendance.filter(a => ['present', 'late', 'early-out'].includes(a.status)).length;
    const explicitAbsentDays = correctedAttendance.filter(a => a.status === 'absent').length;
    const halfDays = correctedAttendance.filter(a => a.status === 'half-day').length;
    const weeklyOffs = correctedAttendance.filter(a => a.isWeeklyOff || a.isSunday).length;
    // Only count holidays where the employee actually worked (totalHours > 0)
    const holidayAttendance = correctedAttendance.filter(a => a.isHoliday && a.totalHours > 0).length;
    // Count Sunday/weekly-off days where employee worked
    const weeklyOffWorked = correctedAttendance.filter(a => a.isWeeklyOff && a.totalHours > 0).length;

    // Present days for DISPLAY = full present days only (half-days tracked separately)
    const presentDays = rawPresentDays;

    // Shift minutes needed for Late/Early-Out deduction
    const shiftMinutes = Math.round(actualShiftHours * 60);

    // ─── HOUR-BASED salary calculation (matching Excel Payroll Master) ───
    // Excel formula:
    //   Sl/Hr = Monthly Salary / (DaysInMonth × ShiftHrs) — FULL PRECISION, NO rounding
    //   Total Worked Hrs = sum of (totalHours - overtimeHours) for each working day
    //   OT Hours = sum of overtimeHours
    //   Sunday Hrs = sundayCount × shiftHours
    //   Total Hrs = Total Worked Hrs + OT + Sunday
    //   Gross = Sl/Hr × Total Hrs — round only final amount
    let totalBaseHours = 0;
    let effectivePresentDays = 0;
    let totalWorkMinutes = 0;
    let totalSundayMinutes = 0;

    for (const a of correctedAttendance) {
      // Calculate total work minutes from check-in/check-out
      if (a.checkIn && a.checkOut) {
        const [h1, m1] = a.checkIn.split(':').map(Number);
        const [h2, m2] = a.checkOut.split(':').map(Number);
        const workMin = Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
        totalWorkMinutes += workMin;
      }
      // Sunday and PH hours from stored values
      if (a.sundayHours > 0) {
        const sH = Math.floor(a.sundayHours);
        const sM = Math.round((a.sundayHours - sH) * 60);
        totalSundayMinutes += sH * 60 + sM;
      }


      // Calculate base hours and effective present days
      if (['present', 'late', 'early-out', 'half-day', 'half_day'].includes(a.status)) {
        // Base hours = totalHours - overtimeHours (excludes OT)
        // This correctly deducts late arrivals and early departures
        // because totalHours already reflects actual work time
        const baseHrs = Math.max(0, (a.totalHours || 0) - (a.overtimeHours || 0));
        totalBaseHours += baseHrs;

        // Effective present days = baseHrs / shiftHours
        if (a.status === 'half-day' || a.status === 'half_day') {
          effectivePresentDays += 0.5;
        } else {
          effectivePresentDays += Math.min(1, baseHrs / actualShiftHours);
        }
      }
    }
    effectivePresentDays = Math.round(effectivePresentDays * 100) / 100;

    // Convert work hours to TRUE DECIMAL hours (e.g., 12146 min -> 202.43 hours)
    // This must be TRUE decimal (not HH.MM-as-decimal) so the frontend's
    // `displayDecimalAsColon()` shows the correct "HH:MM" string.
    // Previous HH.MM-as-decimal format caused "202:26" instead of "202:43"
    // because the minute remainder was being shown verbatim instead of as a
    // fraction of an hour.
    const totalWorkHours = Math.round((totalWorkMinutes / 60) * 100) / 100;
    // totalSundayHours = PAID Sunday hours (sundays × shiftHours), NOT actual worked
    // hours. The dashboard uses this for the "Sunday Hrs" stat tile, and it must
    // reconcile with Total Hrs including Sunday Hrs. For Kamlesh (didn't work
    // Sundays) this shows 36:00 (4 × 9h), not 0:00.
    const totalSundayHours = Math.round(sundays * employee.shiftHours * 100) / 100;


    // ─── OT Hours: Sum stored overtimeHours directly (decimal sum) ───
    // Use correctedAttendance so records recomputed from half-day → present
    // are still included in the OT sum (their overtimeHours are unchanged).
    const totalOvertimeHoursDecimal = Math.round(correctedAttendance.filter(a => ['present', 'late', 'early-out', 'half-day', 'half_day'].includes(a.status)).reduce((sum, a) => sum + (a.overtimeHours || 0), 0) * 100) / 100;
    const totalOvertimeHours = totalOvertimeHoursDecimal;
    const lateEntries = correctedAttendance.filter(a => a.lateEntry).length;
    // Recompute early-out flag using actual shift end (with 12h fix-up + 5min grace)
    // so employees with short shifts (e.g., 10-14:00) are not wrongly counted
    // as early-out when they leave at their actual shift end.
    const earlyOuts = correctedAttendance.filter(a =>
      recomputeEarlyOutFlag(a, employee.shiftStart, employee.shiftEnd)
    ).length;

    // Working days in month = cutoffDay - sundays - elapsedHolidays
    // (uses cutoff so current-month future days and post-relieving days are NOT counted)
    const totalWorkingDays = Math.max(0, cutoffDay - sundays - elapsedHolidays);

    // Total attendance = present days (full present + half as 0.5)
    const totalAttendance = effectivePresentDays;

    // ─── Calculate EFFECTIVE paid leave days ───
    const holidayDateStrs = new Set(
      holidays.map(h => {
        const hd = new Date(h.date);
        return `${hd.getFullYear()}-${String(hd.getMonth() + 1).padStart(2, '0')}-${String(hd.getDate()).padStart(2, '0')}`;
      })
    );

    const presentDateStrs = new Set();
    const absentDateStrs = new Set();
    for (const a of correctedAttendance) {
      const ad = new Date(a.date);
      const dateStr = `${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}`;
      if (['present', 'late', 'early-out', 'half-day'].includes(a.status)) {
        presentDateStrs.add(dateStr);
      }
      if (a.status === 'absent') {
        absentDateStrs.add(dateStr);
      }
    }

    let effectivePaidLeaves = 0;
    let effectiveUnpaidLeaves = 0;
    const cutoffDate = new Date(year, month - 1, cutoffDay, 23, 59, 59);
    for (const leave of leaves) {
      const isUnpaid = leave.type === 'unpaid' || leave.type === 'UL' || leave.type === 'LOP';
      let d = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      // Cap leave iteration at the cutoff day — don't count leave days beyond today/relieving
      const effectiveEnd = end > cutoffDate ? cutoffDate : end;
      while (d <= effectiveEnd) {
        // ═══ BUG FIX ═══
        // Only count leave days that fall WITHIN the current payroll month/year.
        // Previously, a leave spanning June 27 → July 1 would count June 27, 29, 30
        // as July paid leaves (wrong!). Now we skip any day outside the current month.
        if (d.getFullYear() === year && d.getMonth() + 1 === month) {
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const isSunday = d.getDay() === 0;
          const isHoliday = holidayDateStrs.has(dateStr);
          if (!isSunday && !isHoliday && !presentDateStrs.has(dateStr)) {
            if (isUnpaid) {
              effectiveUnpaidLeaves++;
            } else {
              effectivePaidLeaves++;
            }
          }
        }
        d.setDate(d.getDate() + 1);
      }
    }

    // ═══ COMPANY POLICY: NO PAID LEAVES ═══
    // All leaves are unpaid — they do NOT contribute to totalHrs or grossSalary.
    // Absent = any working day the employee did NOT show up, regardless of
    // whether an approved leave exists for that day. Leave days are still
    // counted (in `totalLeaveDays` for display) but do NOT reduce absent.
    // (Matches user expectation: Kamlesh absent=3 even though Jul 1 has leave.)
    const totalLeaveDays = effectivePaidLeaves + effectiveUnpaidLeaves;
    const absentDays = Math.max(0, totalWorkingDays - presentDays - halfDays);

    const firmFromId = getFirmFromEmployeeId(employeeId);
    const effectiveFirm = firmFromId || employee.firm;
    const firmFullName = FIRM_NAMES[effectiveFirm] || employee.firm;

    const totalHrsInclSundayMinutes = totalWorkMinutes + totalSundayMinutes;
    // TRUE decimal so displayDecimalAsColon shows correct HH:MM
    // (Note: totalHrsInclSunday here uses ACTUAL Sunday worked minutes,
    //  but the dashboard's "Total Hrs including Sunday Hrs" column
    //  prefers `totalHrs` (computed below with PAID Sunday hrs) — see
    //  AttendanceTracker.tsx line 1211 fallback chain.)
    const totalHrsInclSunday = Math.round((totalHrsInclSundayMinutes / 60) * 100) / 100;

    const annualLeaves = leaves.filter(l => l.type === 'annual' || l.type === 'AL' || l.type === 'Casual' || l.type === 'CL').reduce((sum, l) => sum + l.days, 0);
    const unpaidLeaves = leaves.filter(l => l.type === 'unpaid' || l.type === 'UL' || l.type === 'LOP').reduce((sum, l) => sum + l.days, 0);

    // ─── LAXREE SALARY CALCULATION — matching Excel Payroll Master ───
    // Hourly Rate = monthlySalary / (daysInMonth × shiftHours) — 2 decimal precision
    // Total Worked Hrs = sum of (totalHours - overtimeHours) for each working day
    //   This correctly deducts late arrivals and early departures
    // Sunday Hours = sundayCount × shiftHours (paid weekly off)
    // OT Hours = sum of overtimeHours (time AFTER shift end)
    // ═══ NO PAID LEAVES — company policy ═══
    // Total Hrs = Total Worked Hrs + OT + Sunday  (NO paid leave hours)
    // Gross Salary = hourlyRate × Total Hrs — round only the final amount

    // Hourly Rate = monthlySalary / (daysInMonth × shiftHours) — 2 decimal precision
    const perDayRate = employee.monthlySalary / daysInMonth;
    const calculatedHourlyRate = Math.round((employee.monthlySalary / (daysInMonth * employee.shiftHours)) * 100) / 100;
    const sundayCount = sundays;
    const sundayHrs = sundayCount * employee.shiftHours;
    const paidLeaveHrs = 0;  // ← NO PAID LEAVES per company policy
    const totalHrs = totalBaseHours + sundayHrs + totalOvertimeHoursDecimal + paidLeaveHrs;

    // Calculate salary components — only round FINAL amounts
    const calculatedBaseSalary = calculatedHourlyRate * totalBaseHours;
    const calculatedSundayEarnings = calculatedHourlyRate * sundayHrs;
    const calculatedEarnedSundayHrs = sundayHrs;
    const calculatedOtAmount = totalOvertimeHoursDecimal * calculatedHourlyRate;
    const calculatedGrossSalary = calculatedHourlyRate * totalHrs;
    const earnedDays = effectivePresentDays;  // NO paid leaves — only actual present days

    return NextResponse.json({
      employee: {
        ...employee,
        firm: effectiveFirm,
        firmFullName,
        hourlyRate: calculatedHourlyRate,
      },
      month,
      year,
      monthName: new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'long' }),
      daysInMonth,
      cutoffDay,
      totalWorkingDays,
      presentDays,
      rawPresentDays,
      absentDays,
      leaveDays,
      paidLeaves: totalLeaveDays,  // total leave count (all unpaid, for display)
      annualLeaves: totalLeaveDays,  // all leaves shown as 'AL' for display
      unpaidLeaves: effectiveUnpaidLeaves,
      halfDays,
      holidayDays,
      weeklyOffs,
      sundays,
      totalAttendance,
      totalWorkHours,
      totalOvertimeHours,
      totalSundayHours,
      totalHrsInclSunday,
      lateEntries,
      earlyOuts,
      records: correctedAttendance,
      leaves,
      // Salary calculation fields — full precision, frontend rounds for display
      perDayRate,
      calculatedHourlyRate,
      calculatedBaseSalary: Math.round(calculatedBaseSalary * 100) / 100,
      calculatedOtAmount: Math.round(calculatedOtAmount * 100) / 100,
      calculatedGrossSalary: Math.round(calculatedGrossSalary * 100) / 100,
      // Sunday Earnings fields
      sundayCount,
      calculatedSundayEarnings: Math.round(calculatedSundayEarnings * 100) / 100,
      calculatedEarnedSundayHrs,
      // Full precision values for salary slip
      totalBaseHours: Math.round(totalBaseHours * 100) / 100,
      totalHrs: Math.round(totalHrs * 100) / 100,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
