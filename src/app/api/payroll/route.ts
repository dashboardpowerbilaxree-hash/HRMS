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
    const enrichedPayrolls = payrolls.map(p => {
      const daysInMonth = new Date(p.year, p.month, 0).getDate();
      const perDayRate = Math.round((p.monthlySalary / daysInMonth) * 100) / 100;
      const hourlyRate = Math.round((p.monthlySalary / (daysInMonth * 9)) * 100) / 100;

      // Always recount Sundays dynamically
      let sundays = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(p.year, p.month - 1, d).getDay() === 0) sundays++;
      }
      const sundayCount = sundays;
      const sundayEarnings = Math.round((perDayRate * sundayCount) * 100) / 100;
      const earnedSundayHrs = sundayCount * 9;

      // Recalculate baseSalary from components: grossSalary - sundayEarnings - otAmount
      const baseSalary = Math.round((p.grossSalary - (p.otAmount || 0) - sundayEarnings) * 100) / 100;
      // Recalculate OT amount with correct hourly rate
      const otAmount = Math.round((p.otHours || 0) * hourlyRate * 100) / 100;

      return {
        ...p,
        hourlyRate,  // Override stored value with dynamically calculated rate
        perDayRate,
        daysInMonth,
        sundayCount,
        sundayEarnings,
        earnedSundayHrs,
        baseSalary: baseSalary > 0 ? baseSalary : p.grossSalary - (p.otAmount || 0),
        otAmount,  // Override with recalculated value using correct hourly rate
      };
    });

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
    const hourlyRate = Math.round((employee.monthlySalary / (daysInMonth * 9)) * 100) / 100;  // Always use 9 shift hours

    // Get attendance records for the month
    const attendance = await db.attendance.findMany({
      where: { employeeId, date: { gte: startDate, lt: endDate } },
    });

    // Total worked hours from attendance — calculate from RAW check-in/check-out times for accuracy
    let totalWorkMinutes = 0;
    const shiftMinutes = Math.round(employee.shiftHours * 60);

    for (const a of attendance) {
      if (a.checkIn && a.checkOut && ['present', 'late', 'half-day', 'half_day', 'early-out'].includes(a.status)) {
        const [h1, m1] = a.checkIn.split(':').map(Number);
        const [h2, m2] = a.checkOut.split(':').map(Number);
        const workMin = Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
        totalWorkMinutes += workMin;
      }
    }

    // Display values in HH.MM format
    const totalWorkedHrs = Math.floor(totalWorkMinutes / 60) + (totalWorkMinutes % 60) / 100;
    // Decimal hours for salary calculation
    const totalWorkedHrsDecimal = Math.round(totalWorkMinutes / 60 * 100) / 100;

    // ─── OT Hours: Sum stored overtimeHours directly (decimal sum) ───
    // This ensures the total matches the sum of individual OT values the user sees.
    // The stored overtimeHours are already calculated as decimal hours per record.
    const otHoursDecimal = Math.round(attendance.filter(a => ['present', 'late', 'half-day', 'half_day', 'early-out'].includes(a.status)).reduce((sum, a) => sum + (a.overtimeHours || 0), 0) * 100) / 100;
    // For display, show as decimal (e.g., 4.45 not 4.27) to match user's manual calculation
    const otHours = otHoursDecimal;

    // Attendance counts
    const rawPresentDays = attendance.filter(a => ['present', 'late', 'early-out'].includes(a.status)).length;
    const halfDays = attendance.filter(a => a.status === 'half-day' || a.status === 'half_day').length;
    // Track Sunday/holiday work separately — does NOT compensate for absent days
    const holidayWorked = attendance.filter(a => a.isHoliday && a.totalHours > 0).length;
    const weeklyOffWorked = attendance.filter(a => a.isWeeklyOff && a.totalHours > 0).length;

    // Present days = full present days only (half-days tracked separately for display)
    // Sunday/holiday work does NOT inflate present count
    const presentDays = rawPresentDays;
    // For salary: effectivePresentDays includes half-days as 0.5
    const effectivePresentDays = rawPresentDays + halfDays * 0.5;

    // Approved leaves — calculate EFFECTIVE leave days
    const leaves = await db.leave.findMany({
      where: { employeeId, status: 'approved', startDate: { gte: startDate }, endDate: { lt: endDate } },
    });

    // Build sets for effective leave calculation
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

    // Count leave days on working days where employee was NOT already present
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

    // Absent days = totalWorkingDays - fullPresentDays - halfDays - effectivePaidLeaves - effectiveUnpaidLeaves
    // Half-days are tracked separately, NOT counted as absent
    const absentDays = Math.max(0, totalWorkingDays - presentDays - halfDays - effectivePaidLeaves - effectiveUnpaidLeaves);

    // ─── BASE SALARY = perDayRate × earnedDays ───
    // earnedDays = effectivePresentDays + effectivePaidLeaves (Sundays NOT included)
    // Sunday Earnings are calculated separately and added to gross
    const earnedDays = effectivePresentDays + effectivePaidLeaves;
    const baseSalary = Math.round((perDayRate * earnedDays) * 100) / 100;

    // ─── SUNDAY EARNINGS (Paid Weekly Off) ───
    // Each Sunday earns perDayRate. Earned Sunday Hours = sundayCount × 9.
    // Example: 31-day month with 5 Sundays → 5 × 9 = 45 hrs earned
    // Example: 30-day month with 4 Sundays → 4 × 9 = 36 hrs earned
    const sundayCount = sundays;
    const sundayEarnings = Math.round((perDayRate * sundayCount) * 100) / 100;
    const earnedSundayHrs = sundayCount * 9;  // e.g., 5 Sundays × 9 = 45 hrs

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

    // ─── OT Amount = otHoursDecimal × hourlyRate (1x normal rate, NOT 1.5x) ───
    const otAmount = Math.round(otHoursDecimal * hourlyRate * 100) / 100;

    // ─── GROSS SALARY = baseSalary + sundayEarnings + otAmount ───
    const grossSalary = Math.round((baseSalary + sundayEarnings + otAmount) * 100) / 100;

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
      totalHrs: totalWorkedHrs,
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
    if (existing) {
      const updated = await db.payroll.update({
        where: { id: existing.id },
        data: payrollData,
      });
      return NextResponse.json({ ...updated, baseSalary, perDayRate, earnedDays, totalWorkingDays, daysInMonth, sundayCount, sundayEarnings, earnedSundayHrs });
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

    return NextResponse.json({ ...payroll, baseSalary, perDayRate, earnedDays, totalWorkingDays, daysInMonth, sundayCount, sundayEarnings, earnedSundayHrs }, { status: 201 });
  } catch (error: any) {
    console.error('Payroll error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
