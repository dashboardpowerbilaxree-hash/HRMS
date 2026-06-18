import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getEffectiveCutoffDay,
  countSundaysUpTo,
  countHolidaysUpTo,
  filterAttendanceUpTo,
} from '@/lib/payroll-calc';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const employeeId = searchParams.get('employeeId') || '';
    const firm = searchParams.get('firm') || searchParams.get('department') || '';
    const location = searchParams.get('location') || '';

    const where: any = { month, year };
    if (employeeId) where.employeeId = employeeId;
    if (firm || location) {
      const empFilter: any = {};
      if (firm) empFilter.firm = firm;
      if (location) empFilter.location = location;
      const emps = await db.employee.findMany({ where: empFilter, select: { employeeId: true } });
      where.employeeId = { in: emps.map(e => e.employeeId) };
    }

    const payrolls = await db.payroll.findMany({
      where,
      include: {
        employee: {
          select: {
            fullName: true,
            employeeId: true,
            firm: true,
            department: true,
            designation: true,
            location: true,
            salaryType: true,
            hourlyRate: true,
          },
        },
      },
      orderBy: { employeeId: 'asc' },
    });

    // Enrich with computed fields — ALWAYS recalculate dynamically for consistency
    // This ensures Late/Early-Out deductions and hourly rate are always correct
    const enrichedPayrolls = await Promise.all(payrolls.map(async (p) => {
      const daysInMonth = new Date(p.year, p.month, 0).getDate();

      // Fetch employee for shift hours AND relievingDate
      const emp = await db.employee.findUnique({
        where: { employeeId: p.employeeId },
        select: { shiftHours: true, relievingDate: true },
      });
      const shiftHrs = emp?.shiftHours || 9;

      // ── Cutoff day: caps all calculations at today (current month) or relievingDate ──
      const cutoffDay = getEffectiveCutoffDay(p.year, p.month, daysInMonth, emp?.relievingDate);

      // FULL PRECISION hourly rate — matching Excel (no rounding)
      const perDayRate = p.monthlySalary / daysInMonth;
      const hourlyRate = p.monthlySalary / (daysInMonth * shiftHrs);

      // Count Sundays ONLY up to the cutoff day (not the whole month)
      const sundays = countSundaysUpTo(p.year, p.month, cutoffDay);
      const sundayCount = sundays;
      const sundayHrs = sundayCount * shiftHrs;
      const sundayEarnings = hourlyRate * sundayHrs;
      const earnedSundayHrs = sundayHrs;

      // ─── Recalculate base salary from attendance (HOUR-BASED, matching Excel) ───
      const startDate = new Date(p.year, p.month - 1, 1);
      const endDate = new Date(p.year, p.month, 1);

      const attendance = await db.attendance.findMany({
        where: { employeeId: p.employeeId, date: { gte: startDate, lt: endDate } },
      });

      // Get holidays
      const holidays = await db.holiday.findMany({ where: { date: { gte: startDate, lt: endDate } } });
      // Only count holidays that fall on/before the cutoff day
      const elapsedHolidays = countHolidaysUpTo(holidays, cutoffDay);
      const holidayDays = elapsedHolidays;
      // Working days = cutoffDay - sundays - elapsedHolidays (caps future days)
      const totalWorkingDays = Math.max(0, cutoffDay - sundays - elapsedHolidays);

      // Filter attendance to cutoff (drop future-dated rows defensively)
      const effectiveAttendance = filterAttendanceUpTo(attendance, p.year, p.month, cutoffDay);

      // Calculate effective present days and total base hours (HOUR-BASED)
      const rawPresentDays = effectiveAttendance.filter(a => ['present', 'late', 'early-out'].includes(a.status)).length;
      const halfDays = effectiveAttendance.filter(a => a.status === 'half-day' || a.status === 'half_day').length;
      const presentDays = rawPresentDays;

      let totalBaseHours = 0;
      let effectivePresentDays = 0;
      for (const a of effectiveAttendance) {
        if (['present', 'late', 'early-out', 'half-day', 'half_day'].includes(a.status)) {
          // Base hours = totalHours - overtimeHours (excludes OT)
          const baseHrs = Math.max(0, (a.totalHours || 0) - (a.overtimeHours || 0));
          totalBaseHours += baseHrs;

          // Effective present days = baseHrs / shiftHours
          if (a.status === 'half-day' || a.status === 'half_day') {
            effectivePresentDays += 0.5;
          } else {
            effectivePresentDays += Math.min(1, baseHrs / shiftHrs);
          }
        }
      }
      effectivePresentDays = Math.round(effectivePresentDays * 100) / 100;

      // Get paid leaves
      const leaves = await db.leave.findMany({
        where: { employeeId: p.employeeId, status: 'approved', startDate: { gte: startDate }, endDate: { lt: endDate } },
      });
      const holidayDateStrs = new Set(
        holidays.map(h => {
          const hd = new Date(h.date);
          return `${hd.getFullYear()}-${String(hd.getMonth() + 1).padStart(2, '0')}-${String(hd.getDate()).padStart(2, '0')}`;
        })
      );
      const presentDateStrs = new Set();
      for (const a of effectiveAttendance) {
        if (['present', 'late', 'early-out', 'half-day', 'half_day'].includes(a.status)) {
          const ad = new Date(a.date);
          presentDateStrs.add(`${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}`);
        }
      }
      let effectivePaidLeaves = 0;
      let effectiveUnpaidLeaves = 0;
      const cutoffDate = new Date(p.year, p.month - 1, cutoffDay);
      for (const leave of leaves) {
        const isUnpaid = leave.type === 'unpaid' || leave.type === 'UL' || leave.type === 'LOP';
        let d = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        // Cap leave iteration at cutoff day — don't count future leave days
        const effectiveEnd = end > cutoffDate ? cutoffDate : end;
        while (d <= effectiveEnd) {
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const isSunday = d.getDay() === 0;
          const isHoliday = holidayDateStrs.has(dateStr);
          if (!isSunday && !isHoliday && !presentDateStrs.has(dateStr)) {
            if (isUnpaid) effectiveUnpaidLeaves++;
            else effectivePaidLeaves++;
          }
          d.setDate(d.getDate() + 1);
        }
      }

      const absentDays = Math.max(0, totalWorkingDays - presentDays - halfDays - effectivePaidLeaves - effectiveUnpaidLeaves);

      // Recalculate OT from stored values (use cutoff-filtered attendance)
      const otHours = Math.round(effectiveAttendance.filter(a => ['present', 'late', 'half-day', 'half_day', 'early-out'].includes(a.status)).reduce((sum, a) => sum + (a.overtimeHours || 0), 0) * 100) / 100;
      const otAmount = otHours * hourlyRate;

      // HOUR-BASED salary: Total Hrs = baseHrs + sundayHrs + otHrs + paidLeaveHrs
      const paidLeaveHrs = effectivePaidLeaves * shiftHrs;
      const totalHrs = totalBaseHours + sundayHrs + otHours + paidLeaveHrs;
      const baseSalary = hourlyRate * totalBaseHours;
      const grossSalary = hourlyRate * totalHrs;

      // Net = gross + bonus + incentive + arrear - totalDeductions
      const netSalary = Math.round((grossSalary + (p.bonus || 0) + (p.incentive || 0) + (p.arrear || 0) - (p.totalDeductions || 0)) * 100) / 100;

      return {
        ...p,
        hourlyRate, // Full precision — frontend formats for display
        perDayRate, // Full precision
        daysInMonth,
        cutoffDay,
        sundayCount,
        sundayEarnings: Math.round(sundayEarnings * 100) / 100,
        earnedSundayHrs,
        baseSalary: Math.round(baseSalary * 100) / 100,
        otAmount: Math.round(otAmount * 100) / 100,
        otHours,
        grossSalary: Math.round(grossSalary * 100) / 100,
        netSalary,
        presentDays,
        absentDays,
        halfDays,
        holidayDays,
        paidLeaves: effectivePaidLeaves,
        totalWorkingDays,
        effectivePresentDays,
        totalBaseHours: Math.round(totalBaseHours * 100) / 100,
        totalHrs: Math.round(totalHrs * 100) / 100,
      };
    }));

    return NextResponse.json(enrichedPayrolls);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, month, year } = body;

    const employee = await db.employee.findUnique({ where: { employeeId } });
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    // ── Effective cutoff day ──
    // Caps all calculations at today (current month) or relievingDate (employee left)
    const cutoffDay = getEffectiveCutoffDay(year, month, daysInMonth, employee.relievingDate);

    // ─── Count sundays and holidays (only up to cutoff day) ───
    const holidays = await db.holiday.findMany({ where: { date: { gte: startDate, lt: endDate } } });
    const elapsedHolidays = countHolidaysUpTo(holidays, cutoffDay);
    const holidayDays = elapsedHolidays;
    const sundays = countSundaysUpTo(year, month, cutoffDay);
    // Working days = cutoffDay - sundays - elapsedHolidays (caps future days)
    const totalWorkingDays = Math.max(0, cutoffDay - sundays - elapsedHolidays);

    // ─── LAXREE PAYROLL FORMULA (matching Excel Payroll Master) ───
    // Hourly Rate = monthlySalary / (daysInMonth × shiftHours) — FULL PRECISION
    // Total Worked Hrs = sum of (totalHours - overtimeHours) for each day
    // OT Hours = sum of overtimeHours
    // Sunday Hrs = sundayCount × shiftHours
    // Paid Leave Hrs = effectivePaidLeaves × shiftHours
    // Total Hrs = Total Worked Hrs + OT + Sunday + Paid Leave
    // Gross = hourlyRate × Total Hrs — round only final amount
    // Net = Gross + Bonus + Incentive + Arrear - Total Deductions

    // FULL PRECISION rates — no intermediate rounding
    const perDayRate = employee.monthlySalary / daysInMonth;
    const hourlyRate = employee.monthlySalary / (daysInMonth * employee.shiftHours);

    // Get attendance records for the month
    const attendance = await db.attendance.findMany({
      where: { employeeId, date: { gte: startDate, lt: endDate } },
    });
    // Filter attendance to cutoff (drop future-dated rows defensively)
    const effectiveAttendance = filterAttendanceUpTo(attendance, year, month, cutoffDay);

    // ─── HOUR-BASED salary calculation ───
    let totalBaseHours = 0;
    let totalWorkMinutes = 0;
    let effectivePresentDays = 0;

    for (const a of effectiveAttendance) {
      if (a.checkIn && a.checkOut && ['present', 'late', 'half-day', 'half_day', 'early-out'].includes(a.status)) {
        const [h1, m1] = a.checkIn.split(':').map(Number);
        const [h2, m2] = a.checkOut.split(':').map(Number);
        const workMin = Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
        totalWorkMinutes += workMin;
      }

      if (['present', 'late', 'early-out', 'half-day', 'half_day'].includes(a.status)) {
        // Base hours = totalHours - overtimeHours (excludes OT)
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

    // Display values in HH.MM format
    const totalWorkedHrs = Math.floor(totalWorkMinutes / 60) + (totalWorkMinutes % 60) / 100;

    // ─── OT Hours: Sum stored overtimeHours directly (decimal sum) ───
    const otHoursDecimal = Math.round(effectiveAttendance.filter(a => ['present', 'late', 'half-day', 'half_day', 'early-out'].includes(a.status)).reduce((sum, a) => sum + (a.overtimeHours || 0), 0) * 100) / 100;
    const otHours = otHoursDecimal;

    // Attendance counts
    const rawPresentDays = effectiveAttendance.filter(a => ['present', 'late', 'early-out'].includes(a.status)).length;
    const halfDays = effectiveAttendance.filter(a => a.status === 'half-day' || a.status === 'half_day').length;
    const presentDays = rawPresentDays;

    // Approved leaves
    const leaves = await db.leave.findMany({
      where: { employeeId, status: 'approved', startDate: { gte: startDate }, endDate: { lt: endDate } },
    });

    const holidayDateStrs = new Set(
      holidays.map(h => {
        const hd = new Date(h.date);
        return `${hd.getFullYear()}-${String(hd.getMonth() + 1).padStart(2, '0')}-${String(hd.getDate()).padStart(2, '0')}`;
      })
    );
    const presentDateStrs = new Set();
    for (const a of effectiveAttendance) {
      if (['present', 'late', 'early-out', 'half-day', 'half_day'].includes(a.status)) {
        const ad = new Date(a.date);
        presentDateStrs.add(`${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}`);
      }
    }

    let effectivePaidLeaves = 0;
    let effectiveUnpaidLeaves = 0;
    const cutoffDate = new Date(year, month - 1, cutoffDay);
    for (const leave of leaves) {
      const isUnpaid = leave.type === 'unpaid' || leave.type === 'UL' || leave.type === 'LOP';
      let d = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      // Cap leave iteration at cutoff day — don't count future leave days
      const effectiveEnd = end > cutoffDate ? cutoffDate : end;
      while (d <= effectiveEnd) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const isSunday = d.getDay() === 0;
        const isHoliday = holidayDateStrs.has(dateStr);
        if (!isSunday && !isHoliday && !presentDateStrs.has(dateStr)) {
          if (isUnpaid) effectiveUnpaidLeaves++;
          else effectivePaidLeaves++;
        }
        d.setDate(d.getDate() + 1);
      }
    }

    const absentDays = Math.max(0, totalWorkingDays - presentDays - halfDays - effectivePaidLeaves - effectiveUnpaidLeaves);

    // ─── HOUR-BASED SALARY CALCULATION (matching Excel) ───
    // Total Hrs = baseHrs + sundayHrs + otHrs + paidLeaveHrs
    const sundayCount = sundays;
    const sundayHrs = sundayCount * employee.shiftHours;
    const paidLeaveHrs = effectivePaidLeaves * employee.shiftHours;
    const totalHrs = totalBaseHours + sundayHrs + otHoursDecimal + paidLeaveHrs;
    const baseSalary = hourlyRate * totalBaseHours;
    const sundayEarnings = hourlyRate * sundayHrs;
    const earnedSundayHrs = sundayHrs;
    const otAmount = otHoursDecimal * hourlyRate;
    const grossSalary = hourlyRate * totalHrs;

    // ─── ACTUAL Sunday worked hours (for display/records only) ───
    let sundayWorkMinutes = 0;
    for (const a of effectiveAttendance) {
      if (a.isSunday && a.checkIn && a.checkOut) {
        const [h1, m1] = a.checkIn.split(':').map(Number);
        const [h2, m2] = a.checkOut.split(':').map(Number);
        sundayWorkMinutes += Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
      }
    }
    const sundayWorkedHrs = Math.floor(sundayWorkMinutes / 60) + (sundayWorkMinutes % 60) / 100;

    // ─── DEDUCTIONS ───
    const tdsDeduction = body.tdsDeduction || 0;
    const loanDeduction = body.loanDeduction || 0;
    const advanceDeduction = body.advanceDeduction || 0;
    const securityDeposit = body.securityDeposit || 0;
    const otherDeductions = body.otherDeductions || 0;
    const totalDeductions = Math.round((tdsDeduction + loanDeduction + advanceDeduction + securityDeposit + otherDeductions) * 100) / 100;

    // ─── NET SALARY ───
    const arrear = body.arrear || 0;
    const bonus = body.bonus || 0;
    const incentive = body.incentive || 0;
    const netSalary = Math.round((grossSalary + bonus + incentive + arrear - totalDeductions) * 100) / 100;

    const payrollData = {
      monthlySalary: employee.monthlySalary,
      hourlyRate: Math.round(hourlyRate * 100) / 100, // Store rounded for DB
      totalWorkedHrs,
      otHours,
      otRate: Math.round(hourlyRate * 100) / 100, // Store rounded for DB
      otAmount: Math.round(otAmount * 100) / 100,
      sundayHrs: sundayWorkedHrs,
      sundayCount,
      sundayEarnings: Math.round(sundayEarnings * 100) / 100,
      totalHrs: Math.round(totalHrs * 100) / 100,
      presentDays: presentDays,
      absentDays,
      holidayDays,
      paidLeaves: effectivePaidLeaves,
      grossSalary: Math.round(grossSalary * 100) / 100,
      tdsDeduction,
      loanDeduction,
      advanceDeduction,
      securityDeposit,
      otherDeductions,
      totalDeductions,
      arrear,
      bonus,
      incentive,
      netSalary,
      status: 'generated' as const,
    };

    const existing = await db.payroll.findFirst({ where: { employeeId, month, year } });
    const earnedDays = effectivePresentDays + effectivePaidLeaves;
    if (existing) {
      const updated = await db.payroll.update({
        where: { id: existing.id },
        data: payrollData,
      });
      return NextResponse.json({
        ...updated,
        baseSalary: Math.round(baseSalary * 100) / 100,
        perDayRate, // Full precision
        earnedDays,
        totalWorkingDays,
        daysInMonth,
        cutoffDay,
        sundayCount,
        sundayEarnings: Math.round(sundayEarnings * 100) / 100,
        earnedSundayHrs,
        totalBaseHours: Math.round(totalBaseHours * 100) / 100,
        totalHrs: Math.round(totalHrs * 100) / 100,
        hourlyRate, // Full precision for salary slip
      });
    }

    const payroll = await db.payroll.create({
      data: {
        employeeId,
        month,
        year,
        ...payrollData,
      },
    });

    await db.salaryHistory.create({
      data: { employeeId, month, year, netSalary },
    });

    await db.notification.create({
      data: {
        title: 'Payroll Generated',
        message: `Payroll for ${employee.fullName} (${employee.employeeId}) - ${month}/${year}: ₹${netSalary.toLocaleString()}`,
        type: 'payroll',
      },
    });

    return NextResponse.json({
      ...payroll,
      baseSalary: Math.round(baseSalary * 100) / 100,
      perDayRate, // Full precision
      earnedDays,
      totalWorkingDays,
      daysInMonth,
      cutoffDay,
      sundayCount,
      sundayEarnings: Math.round(sundayEarnings * 100) / 100,
      earnedSundayHrs,
      totalBaseHours: Math.round(totalBaseHours * 100) / 100,
      totalHrs: Math.round(totalHrs * 100) / 100,
      hourlyRate, // Full precision for salary slip
    }, { status: 201 });
  } catch (error: any) {
    console.error('Payroll error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
