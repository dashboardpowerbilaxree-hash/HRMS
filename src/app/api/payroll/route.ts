import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

      // Fetch employee for shift hours
      const emp = await db.employee.findUnique({ where: { employeeId: p.employeeId }, select: { shiftHours: true } });
      const shiftHrs = emp?.shiftHours || 9;

      const perDayRate = Math.round((p.monthlySalary / daysInMonth) * 100) / 100;
      const hourlyRate = Math.round((p.monthlySalary / (daysInMonth * shiftHrs)) * 100) / 100;

      // Always recount Sundays dynamically
      let sundays = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(p.year, p.month - 1, d).getDay() === 0) sundays++;
      }
      const sundayCount = sundays;
      const sundayHrs = sundayCount * shiftHrs;
      const sundayEarnings = Math.round(hourlyRate * sundayHrs * 100) / 100;
      const earnedSundayHrs = sundayHrs;

      // ─── Recalculate base salary from attendance (HOUR-BASED, matching Excel) ───
      const startDate = new Date(p.year, p.month - 1, 1);
      const endDate = new Date(p.year, p.month, 1);

      const attendance = await db.attendance.findMany({
        where: { employeeId: p.employeeId, date: { gte: startDate, lt: endDate } },
      });

      // Get holidays
      const holidays = await db.holiday.findMany({ where: { date: { gte: startDate, lt: endDate } } });
      const holidayDays = holidays.length;
      const totalWorkingDays = daysInMonth - sundays - holidayDays;

      // Calculate effective present days and total base hours (HOUR-BASED)
      const rawPresentDays = attendance.filter(a => ['present', 'late', 'early-out'].includes(a.status)).length;
      const halfDays = attendance.filter(a => a.status === 'half-day' || a.status === 'half_day').length;
      const presentDays = rawPresentDays;

      let totalBaseHours = 0;
      let effectivePresentDays = 0;
      for (const a of attendance) {
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
      for (const a of attendance) {
        if (['present', 'late', 'early-out', 'half-day', 'half_day'].includes(a.status)) {
          const ad = new Date(a.date);
          presentDateStrs.add(`${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}`);
        }
      }
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
          if (!isSunday && !isHoliday && !presentDateStrs.has(dateStr)) {
            if (isUnpaid) effectiveUnpaidLeaves++;
            else effectivePaidLeaves++;
          }
          d.setDate(d.getDate() + 1);
        }
      }

      const absentDays = Math.max(0, totalWorkingDays - presentDays - halfDays - effectivePaidLeaves - effectiveUnpaidLeaves);

      // Recalculate OT from stored values
      const otHours = Math.round(attendance.filter(a => ['present', 'late', 'half-day', 'half_day', 'early-out'].includes(a.status)).reduce((sum, a) => sum + (a.overtimeHours || 0), 0) * 100) / 100;
      const otAmount = Math.round(otHours * hourlyRate * 100) / 100;

      // HOUR-BASED salary: Gross = hourlyRate × (baseHrs + sundayHrs + otHrs + paidLeaveHrs)
      const paidLeaveHrs = effectivePaidLeaves * shiftHrs;
      const totalHrs = Math.round((totalBaseHours + sundayHrs + otHours + paidLeaveHrs) * 100) / 100;
      const baseSalary = Math.round(hourlyRate * totalBaseHours * 100) / 100;
      const grossSalary = Math.round(hourlyRate * totalHrs * 100) / 100;

      // Net = gross + bonus + incentive + arrear - totalDeductions
      const netSalary = Math.round((grossSalary + (p.bonus || 0) + (p.incentive || 0) + (p.arrear || 0) - (p.totalDeductions || 0)) * 100) / 100;

      return {
        ...p,
        hourlyRate,
        perDayRate,
        daysInMonth,
        sundayCount,
        sundayEarnings,
        earnedSundayHrs,
        baseSalary,
        otAmount,
        otHours,
        grossSalary,
        netSalary,
        presentDays,
        absentDays,
        halfDays,
        holidayDays,
        paidLeaves: effectivePaidLeaves,
        totalWorkingDays,
        effectivePresentDays,
        totalBaseHours: Math.round(totalBaseHours * 100) / 100,
        totalHrs,
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

    // ─── Count sundays and holidays ───
    let sundays = 0;
    const holidays = await db.holiday.findMany({ where: { date: { gte: startDate, lt: endDate } } });
    const holidayDays = holidays.length;
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(year, month - 1, d).getDay() === 0) sundays++;
    }
    const totalWorkingDays = daysInMonth - sundays - holidayDays;

    // ─── LAXREE PAYROLL FORMULA ───
    // Per Day Rate = monthlySalary / daysInMonth (31, 30, 28 as per calendar)
    // Hourly Rate = monthlySalary / (daysInMonth × 9) — NO intermediate rounding
    //   30 days × 9 hrs = 270 hrs → ₹17,000 / 270 = ₹62.96
    //   31 days × 9 hrs = 279 hrs → ₹17,000 / 279 = ₹60.93
    // Base Salary = perDayRate × earnedDays (Sundays NOT counted as earned)
    //   earnedDays = effectivePresentDays + effectivePaidLeaves
    // Sunday Earnings = perDayRate × sundayCount (Sundays are paid weekly off)
    //   sundayCount = number of Sundays in the month
    //   Earned Sunday Hours = sundayCount × 9 (e.g., 5 Sundays = 45 hrs)
    // OT Amount = otHours × hourlyRate (1x normal rate, NOT 1.5x)
    // Gross Salary = baseSalary + sundayEarnings + otAmount
    // Net Salary = grossSalary + bonus + incentive + arrear - totalDeductions

    const perDayRate = Math.round((employee.monthlySalary / daysInMonth) * 100) / 100;
    const hourlyRate = Math.round((employee.monthlySalary / (daysInMonth * employee.shiftHours)) * 100) / 100;

    // Get attendance records for the month
    const attendance = await db.attendance.findMany({
      where: { employeeId, date: { gte: startDate, lt: endDate } },
    });

    // ─── HOUR-BASED salary calculation (matching Excel Payroll Master) ───
    // Base hours per day = totalHours - overtimeHours (excludes OT)
    // For late employees: base hours reflect actual time during shift (late arrival deducted)
    // For early-out: base hours reflect actual time (early departure deducted)
    // For present: base hours = shift hours (even if they worked extra = OT)
    let totalBaseHours = 0;
    let totalWorkMinutes = 0;
    let effectivePresentDays = 0;

    for (const a of attendance) {
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
    const otHoursDecimal = Math.round(attendance.filter(a => ['present', 'late', 'half-day', 'half_day', 'early-out'].includes(a.status)).reduce((sum, a) => sum + (a.overtimeHours || 0), 0) * 100) / 100;
    const otHours = otHoursDecimal;

    // Attendance counts
    const rawPresentDays = attendance.filter(a => ['present', 'late', 'early-out'].includes(a.status)).length;
    const halfDays = attendance.filter(a => a.status === 'half-day' || a.status === 'half_day').length;
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
    for (const a of attendance) {
      if (['present', 'late', 'early-out', 'half-day', 'half_day'].includes(a.status)) {
        const ad = new Date(a.date);
        presentDateStrs.add(`${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}`);
      }
    }

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
        if (!isSunday && !isHoliday && !presentDateStrs.has(dateStr)) {
          if (isUnpaid) effectiveUnpaidLeaves++;
          else effectivePaidLeaves++;
        }
        d.setDate(d.getDate() + 1);
      }
    }

    const absentDays = Math.max(0, totalWorkingDays - presentDays - halfDays - effectivePaidLeaves - effectiveUnpaidLeaves);

    // ─── HOUR-BASED SALARY CALCULATION ───
    // Gross = hourlyRate × (baseHrs + sundayHrs + otHrs + paidLeaveHrs)
    const sundayCount = sundays;
    const sundayHrs = sundayCount * employee.shiftHours;
    const paidLeaveHrs = effectivePaidLeaves * employee.shiftHours;
    const totalHrs = Math.round((totalBaseHours + sundayHrs + otHoursDecimal + paidLeaveHrs) * 100) / 100;
    const baseSalary = Math.round(hourlyRate * totalBaseHours * 100) / 100;
    const sundayEarnings = Math.round(hourlyRate * sundayHrs * 100) / 100;
    const earnedSundayHrs = sundayHrs;
    const otAmount = Math.round(otHoursDecimal * hourlyRate * 100) / 100;
    const grossSalary = Math.round(hourlyRate * totalHrs * 100) / 100;

    // ─── ACTUAL Sunday/PH worked hours (for display/records only) ───
    let sundayWorkMinutes = 0;
    let phWorkMinutes = 0;
    for (const a of attendance) {
      if (a.isSunday && a.checkIn && a.checkOut) {
        const [h1, m1] = a.checkIn.split(':').map(Number);
        const [h2, m2] = a.checkOut.split(':').map(Number);
        sundayWorkMinutes += Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
      }
      if (a.isHoliday && a.checkIn && a.checkOut) {
        const [h1, m1] = a.checkIn.split(':').map(Number);
        const [h2, m2] = a.checkOut.split(':').map(Number);
        phWorkMinutes += Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
      }
    }
    const sundayWorkedHrs = Math.floor(sundayWorkMinutes / 60) + (sundayWorkMinutes % 60) / 100;
    const phWorkedHrs = Math.floor(phWorkMinutes / 60) + (phWorkMinutes % 60) / 100;

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
      hourlyRate,
      totalWorkedHrs,
      otHours,
      otRate: hourlyRate,
      otAmount,
      sundayHrs: sundayWorkedHrs,
      sundayCount,
      sundayEarnings,
      phHours: phWorkedHrs,
      totalHrs,
      presentDays: presentDays,
      absentDays,
      holidayDays,
      paidLeaves: effectivePaidLeaves,
      grossSalary,
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
      return NextResponse.json({ ...updated, baseSalary, perDayRate, earnedDays, totalWorkingDays, daysInMonth, sundayCount, sundayEarnings, earnedSundayHrs, totalBaseHours: Math.round(totalBaseHours * 100) / 100, totalHrs });
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

    return NextResponse.json({ ...payroll, baseSalary, perDayRate, earnedDays, totalWorkingDays, daysInMonth, sundayCount, sundayEarnings, earnedSundayHrs, totalBaseHours: Math.round(totalBaseHours * 100) / 100, totalHrs }, { status: 201 });
  } catch (error: any) {
    console.error('Payroll error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
