import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getEffectiveCutoffDay,
  countSundaysUpTo,
  countHolidaysUpTo,
  filterAttendanceUpTo,
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

    // Get approved leaves
    const leaves = await db.leave.findMany({
      where: { employeeId, status: 'approved', startDate: { gte: startDate }, endDate: { lt: endDate } },
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

    // Calculate summary — use cutoff-filtered attendance so future days don't count
    // rawPresentDays = actual days with present/late/early-out status (working days only)
    const rawPresentDays = effectiveAttendance.filter(a => ['present', 'late', 'early-out'].includes(a.status)).length;
    const explicitAbsentDays = effectiveAttendance.filter(a => a.status === 'absent').length;
    const halfDays = effectiveAttendance.filter(a => a.status === 'half-day' || a.halfDay).length;
    const weeklyOffs = effectiveAttendance.filter(a => a.isWeeklyOff || a.isSunday).length;
    // Only count holidays where the employee actually worked (totalHours > 0)
    const holidayAttendance = effectiveAttendance.filter(a => a.isHoliday && a.totalHours > 0).length;
    // Count Sunday/weekly-off days where employee worked
    const weeklyOffWorked = effectiveAttendance.filter(a => a.isWeeklyOff && a.totalHours > 0).length;

    // Present days for DISPLAY = full present days only (half-days tracked separately)
    const presentDays = rawPresentDays;

    // Shift minutes needed for Late/Early-Out deduction
    const shiftMinutes = Math.round(employee.shiftHours * 60);

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

    for (const a of effectiveAttendance) {
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
          effectivePresentDays += Math.min(1, baseHrs / employee.shiftHours);
        }
      }
    }
    effectivePresentDays = Math.round(effectivePresentDays * 100) / 100;

    // Convert work hours to HH.MM format for display
    const totalWorkHours = Math.floor(totalWorkMinutes / 60) + (totalWorkMinutes % 60) / 100;
    const totalSundayHours = Math.floor(totalSundayMinutes / 60) + (totalSundayMinutes % 60) / 100;


    // ─── OT Hours: Sum stored overtimeHours directly (decimal sum) ───
    const totalOvertimeHoursDecimal = Math.round(effectiveAttendance.filter(a => ['present', 'late', 'early-out', 'half-day', 'half_day'].includes(a.status)).reduce((sum, a) => sum + (a.overtimeHours || 0), 0) * 100) / 100;
    const totalOvertimeHours = totalOvertimeHoursDecimal;
    const lateEntries = effectiveAttendance.filter(a => a.lateEntry).length;
    const earlyOuts = effectiveAttendance.filter(a => a.earlyOut).length;

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
    for (const a of effectiveAttendance) {
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
    for (const leave of leaves) {
      const isUnpaid = leave.type === 'unpaid' || leave.type === 'UL' || leave.type === 'LOP';
      let d = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      // Cap leave iteration at the cutoff day — don't count leave days beyond today/relieving
      const cutoffDate = new Date(year, month - 1, cutoffDay);
      const effectiveEnd = end > cutoffDate ? cutoffDate : end;
      while (d <= effectiveEnd) {
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
        d.setDate(d.getDate() + 1);
      }
    }

    const absentDays = Math.max(0, totalWorkingDays - presentDays - halfDays - effectivePaidLeaves - effectiveUnpaidLeaves);

    const firmFromId = getFirmFromEmployeeId(employeeId);
    const effectiveFirm = firmFromId || employee.firm;
    const firmFullName = FIRM_NAMES[effectiveFirm] || employee.firm;

    const totalHrsInclSundayMinutes = totalWorkMinutes + totalSundayMinutes;
    const totalHrsInclSunday = Math.floor(totalHrsInclSundayMinutes / 60) + (totalHrsInclSundayMinutes % 60) / 100;

    const annualLeaves = leaves.filter(l => l.type === 'annual' || l.type === 'AL' || l.type === 'Casual' || l.type === 'CL').reduce((sum, l) => sum + l.days, 0);
    const unpaidLeaves = leaves.filter(l => l.type === 'unpaid' || l.type === 'UL' || l.type === 'LOP').reduce((sum, l) => sum + l.days, 0);

    // ─── LAXREE SALARY CALCULATION — matching Excel Payroll Master ───
    // Hourly Rate = monthlySalary / (daysInMonth × shiftHours) — FULL PRECISION, NO rounding
    // Total Worked Hrs = sum of (totalHours - overtimeHours) for each working day
    //   This correctly deducts late arrivals and early departures
    // Sunday Hours = sundayCount × shiftHours (paid weekly off)
    // OT Hours = sum of overtimeHours (time AFTER shift end)
    // Paid Leave Hrs = effectivePaidLeaves × shiftHours
    // Total Hrs = Total Worked Hrs + OT + Sunday + Paid Leave
    // Gross Salary = hourlyRate × Total Hrs — round only the final amount

    // CEILING hourly rate — always round UP to next whole number
    const perDayRate = employee.monthlySalary / daysInMonth;
    const calculatedHourlyRate = Math.ceil(employee.monthlySalary / (daysInMonth * employee.shiftHours));
    const sundayCount = sundays;
    const sundayHrs = sundayCount * employee.shiftHours;
    const paidLeaveHrs = effectivePaidLeaves * employee.shiftHours;
    const totalHrs = totalBaseHours + sundayHrs + totalOvertimeHoursDecimal + paidLeaveHrs;

    // Calculate salary components — only round FINAL amounts
    const calculatedBaseSalary = calculatedHourlyRate * totalBaseHours;
    const calculatedSundayEarnings = calculatedHourlyRate * sundayHrs;
    const calculatedEarnedSundayHrs = sundayHrs;
    const calculatedOtAmount = totalOvertimeHoursDecimal * calculatedHourlyRate;
    const calculatedGrossSalary = calculatedHourlyRate * totalHrs;
    const earnedDays = effectivePresentDays + effectivePaidLeaves;

    return NextResponse.json({
      employee: {
        ...employee,
        firm: effectiveFirm,
        firmFullName,
        hourlyRate: calculatedHourlyRate, // Whole number via Math.ceil
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
      paidLeaves: effectivePaidLeaves,
      annualLeaves: effectivePaidLeaves,
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
      records: attendance,
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
