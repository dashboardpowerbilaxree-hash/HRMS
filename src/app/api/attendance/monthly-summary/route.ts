import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

    // Count Sundays
    let sundays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(year, month - 1, d).getDay() === 0) sundays++;
    }

    // Calculate summary
    // rawPresentDays = actual days with present/late/early-out status (working days only)
    const rawPresentDays = attendance.filter(a => ['present', 'late', 'early-out'].includes(a.status)).length;
    const explicitAbsentDays = attendance.filter(a => a.status === 'absent').length;
    const halfDays = attendance.filter(a => a.status === 'half-day' || a.halfDay).length;
    const weeklyOffs = attendance.filter(a => a.isWeeklyOff || a.isSunday).length;
    // Only count holidays where the employee actually worked (totalHours > 0)
    const holidayAttendance = attendance.filter(a => a.isHoliday && a.totalHours > 0).length;
    // Count Sunday/weekly-off days where employee worked
    const weeklyOffWorked = attendance.filter(a => a.isWeeklyOff && a.totalHours > 0).length;

    // Present days for DISPLAY = full present days only (half-days tracked separately)
    // Sunday/holiday work is tracked separately — it should NOT inflate present count
    // because working on a Sunday does NOT compensate for being absent on a working day
    const presentDays = rawPresentDays;

    // Shift minutes needed for Late/Early-Out deduction
    const shiftMinutes = Math.round(employee.shiftHours * 60);

    // ─── For salary: effectivePresentDays accounts for Late/Early-Out deductions ───
    // "present" = 1.0 day (full pay)
    // "late" = actual_worked_minutes / shift_minutes (deducted for late arrival)
    // "early-out" = actual_worked_minutes / shift_minutes (deducted for early departure)
    // "half-day" = 0.5 day
    let effectivePresentDays = 0;
    for (const a of attendance) {
      if (a.status === 'present') {
        effectivePresentDays += 1.0;
      } else if (a.status === 'late') {
        if (a.checkIn && a.checkOut) {
          const [h1, m1] = a.checkIn.split(':').map(Number);
          const [h2, m2] = a.checkOut.split(':').map(Number);
          const workedMin = Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
          effectivePresentDays += Math.min(1, workedMin / shiftMinutes);
        } else {
          effectivePresentDays += 1.0;
        }
      } else if (a.status === 'early-out') {
        if (a.checkIn && a.checkOut) {
          const [h1, m1] = a.checkIn.split(':').map(Number);
          const [h2, m2] = a.checkOut.split(':').map(Number);
          const workedMin = Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
          effectivePresentDays += Math.min(1, workedMin / shiftMinutes);
        } else {
          effectivePresentDays += 1.0;
        }
      } else if (a.status === 'half-day' || a.status === 'half_day') {
        effectivePresentDays += 0.5;
      }
    }
    effectivePresentDays = Math.round(effectivePresentDays * 100) / 100;

    // ─── Calculate totals from stored attendance values ───
    // Use the per-record overtimeHours directly (these are already calculated accurately
    // when attendance is saved). Summing stored values ensures the total matches
    // the sum of individual OT entries that users see on the dashboard.
    //
    // For work hours, we still calculate from raw check-in/check-out times
    // since totalHours stored values may have rounding differences.
    let totalWorkMinutes = 0;
    let totalSundayMinutes = 0;
    let totalPHMinutes = 0;

    for (const a of attendance) {
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
      if (a.phHours > 0) {
        const pH = Math.floor(a.phHours);
        const pM = Math.round((a.phHours - pH) * 60);
        totalPHMinutes += pH * 60 + pM;
      }
    }

    // Convert work hours to HH.MM format for display
    const totalWorkHours = Math.floor(totalWorkMinutes / 60) + (totalWorkMinutes % 60) / 100;
    const totalSundayHours = Math.floor(totalSundayMinutes / 60) + (totalSundayMinutes % 60) / 100;
    const totalPHHours = Math.floor(totalPHMinutes / 60) + (totalPHMinutes % 60) / 100;

    // ─── OT Hours: Sum stored overtimeHours directly (decimal sum) ───
    // This ensures the total matches the sum of individual OT values the user sees.
    // The stored overtimeHours are already calculated as decimal hours per record.
    const totalOvertimeHoursDecimal = Math.round(attendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0) * 100) / 100;
    // For display, show as decimal (e.g., 4.45 not 4.27) to match user's manual calculation
    const totalOvertimeHours = totalOvertimeHoursDecimal;
    const lateEntries = attendance.filter(a => a.lateEntry).length;
    const earlyOuts = attendance.filter(a => a.earlyOut).length;

    // Working days in month = total days - sundays - holidays
    const totalWorkingDays = daysInMonth - sundays - holidayDays;

    // Total attendance = present days (full present + half as 0.5)
    const totalAttendance = effectivePresentDays;

    // ─── Calculate EFFECTIVE paid leave days ───
    // Only count leave days that fall on WORKING days (not Sundays, not holidays)
    // AND where the employee was NOT already present (no double-counting)
    const holidayDateStrs = new Set(
      holidays.map(h => {
        const hd = new Date(h.date);
        return `${hd.getFullYear()}-${String(hd.getMonth() + 1).padStart(2, '0')}-${String(hd.getDate()).padStart(2, '0')}`;
      })
    );

    // Set of dates where employee was present/half-day/absent (has an attendance record)
    const presentDateStrs = new Set();
    const absentDateStrs = new Set();
    for (const a of attendance) {
      const ad = new Date(a.date);
      const dateStr = `${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}`;
      if (['present', 'late', 'early-out', 'half-day'].includes(a.status)) {
        presentDateStrs.add(dateStr);
      }
      if (a.status === 'absent') {
        absentDateStrs.add(dateStr);
      }
    }

    // Count leave days on working days where employee was NOT present
    let effectivePaidLeaves = 0;
    let effectiveUnpaidLeaves = 0;
    for (const leave of leaves) {
      const isUnpaid = leave.type === 'unpaid' || leave.type === 'UL' || leave.type === 'LOP';
      let d = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      while (d <= end) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const isSunday = d.getDay() === 0;
        const isHoliday = holidayDateStrs.has(dateStr);
        // Only count if it's a working day AND employee was NOT already present
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

    // Absent days = totalWorkingDays - fullPresentDays - halfDays - effectivePaidLeaves - effectiveUnpaidLeaves
    // Half-days are tracked separately, NOT counted as absent
    const absentDays = Math.max(0, totalWorkingDays - presentDays - halfDays - effectivePaidLeaves - effectiveUnpaidLeaves);

    // Determine firm from employee ID prefix (fallback to employee.firm)
    const firmFromId = getFirmFromEmployeeId(employeeId);
    const effectiveFirm = firmFromId || employee.firm;
    const firmFullName = FIRM_NAMES[effectiveFirm] || employee.firm;

    // Total hours including Sunday + PH (sum minutes then convert to HH.MM)
    const totalHrsInclSundayPHMinutes = totalWorkMinutes + totalSundayMinutes + totalPHMinutes;
    const totalHrsInclSundayPH = Math.floor(totalHrsInclSundayPHMinutes / 60) + (totalHrsInclSundayPHMinutes % 60) / 100;

    // Leave breakdown
    const annualLeaves = leaves.filter(l => l.type === 'annual' || l.type === 'AL' || l.type === 'Casual' || l.type === 'CL').reduce((sum, l) => sum + l.days, 0);
    const unpaidLeaves = leaves.filter(l => l.type === 'unpaid' || l.type === 'UL' || l.type === 'LOP').reduce((sum, l) => sum + l.days, 0);

    // ─── LAXREE SALARY CALCULATION (consistent with payroll) ───
    // Per Day Rate = monthlySalary / daysInMonth
    // Hourly Rate = monthlySalary / (daysInMonth × 9) — NO intermediate rounding
    // Base Salary = perDayRate × earnedDays (Sundays NOT counted as earned)
    //   earnedDays = effectivePresentDays + effectivePaidLeaves
    // Sunday Earnings = perDayRate × sundayCount (Sundays are paid weekly off)
    //   Earned Sunday Hours = sundayCount × 9 (e.g., 5 Sundays = 45 hrs)
    // OT Amount = totalOvertimeHours × hourlyRate (1x normal rate, NOT 1.5x)
    // Gross Salary = baseSalary + sundayEarnings + otAmount
    const earnedDays = effectivePresentDays + effectivePaidLeaves;
    const perDayRate = Math.round((employee.monthlySalary / daysInMonth) * 100) / 100;
    const calculatedHourlyRate = Math.round((employee.monthlySalary / (daysInMonth * 9)) * 100) / 100;
    const calculatedBaseSalary = Math.round((perDayRate * earnedDays) * 100) / 100;
    const sundayCount = sundays;
    const calculatedSundayEarnings = Math.round((perDayRate * sundayCount) * 100) / 100;
    const calculatedEarnedSundayHrs = sundayCount * 9;
    const calculatedOtAmount = Math.round(totalOvertimeHoursDecimal * calculatedHourlyRate * 100) / 100;
    const calculatedGrossSalary = Math.round((calculatedBaseSalary + calculatedSundayEarnings + calculatedOtAmount) * 100) / 100;

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
      totalPHHours,
      totalHrsInclSundayPH,
      lateEntries,
      earlyOuts,
      records: attendance,
      leaves,
      // Salary calculation fields
      perDayRate,
      calculatedHourlyRate,
      calculatedBaseSalary,
      calculatedOtAmount,
      calculatedGrossSalary,
      // Sunday Earnings fields
      sundayCount,
      calculatedSundayEarnings,
      calculatedEarnedSundayHrs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
