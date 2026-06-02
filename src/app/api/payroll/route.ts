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

    // Enrich with computed fields (not stored in DB)
    const enrichedPayrolls = payrolls.map(p => ({
      ...p,
      baseSalary: p.grossSalary - (p.otAmount || 0),
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
    // Hourly Rate = perDayRate / shiftHours
    // Base Salary = monthlySalary - (perDayRate × absentDays)
    // OT Amount = otHours × hourlyRate (1x normal rate, NOT 1.5x)
    // Gross Salary = baseSalary + otAmount
    // Net Salary = grossSalary + bonus + incentive + arrear - totalDeductions

    const perDayRate = Math.round((employee.monthlySalary / daysInMonth) * 100) / 100;
    const hourlyRate = Math.round((perDayRate / employee.shiftHours) * 100) / 100;

    // Get attendance records for the month
    const attendance = await db.attendance.findMany({
      where: { employeeId, date: { gte: startDate, lt: endDate } },
    });

    // Total worked hours from attendance (includes early-out)
    const totalWorkedHrs = Math.round(attendance
      .filter(a => ['present', 'late', 'half-day', 'half_day', 'early-out'].includes(a.status))
      .reduce((sum, a) => sum + a.totalHours, 0) * 100) / 100;

    // Overtime records (get OT hours from records, amount recalculated using hourlyRate)
    const overtimeRecords = await db.overtime.findMany({
      where: { employeeId, date: { gte: startDate, lt: endDate } },
    });
    const otHours = Math.round(overtimeRecords.reduce((sum, o) => sum + o.hours, 0) * 100) / 100;

    // Attendance counts
    const presentDays = attendance.filter(a => ['present', 'late', 'early-out'].includes(a.status)).length;
    const halfDays = attendance.filter(a => a.status === 'half-day' || a.status === 'half_day').length;
    // Only count holidays/Sundays where employee actually worked
    const holidayWorked = attendance.filter(a => a.isHoliday && a.totalHours > 0).length;
    const weeklyOffWorked = attendance.filter(a => a.isWeeklyOff && a.totalHours > 0).length;

    // Effective present days = present + half×0.5 + holidayWorked + weeklyOffWorked
    const effectivePresentDays = presentDays + halfDays * 0.5 + holidayWorked + weeklyOffWorked;

    // Approved leaves
    const leaves = await db.leave.findMany({
      where: { employeeId, status: 'approved', startDate: { gte: startDate }, endDate: { lt: endDate } },
    });
    const paidLeaves = leaves.filter(l => l.type !== 'unpaid' && l.type !== 'UL' && l.type !== 'LOP').reduce((sum, l) => sum + l.days, 0);

    // Absent days
    const absentDays = Math.max(0, totalWorkingDays - effectivePresentDays - paidLeaves);

    // ─── BASE SALARY = monthlySalary - (perDayRate × absentDays) ───
    // Sundays and paid holidays are automatically paid (included in monthlySalary)
    // Only actual absent days on working days reduce the salary
    const baseSalary = Math.round((employee.monthlySalary - (perDayRate * absentDays)) * 100) / 100;

    // ─── ACTUAL Sunday/PH worked hours (for display/records only) ───
    const sundayWorkedHrs = Math.round(attendance.filter(a => a.isSunday && a.totalHours > 0).reduce((sum, a) => sum + a.totalHours, 0) * 100) / 100;
    const phWorkedHrs = Math.round(attendance.filter(a => a.isHoliday && a.totalHours > 0).reduce((sum, a) => sum + a.totalHours, 0) * 100) / 100;

    // ─── OT Amount = otHours × hourlyRate (1x normal rate, NOT 1.5x) ───
    const otAmount = Math.round(otHours * hourlyRate * 100) / 100;

    // ─── GROSS SALARY ───
    const grossSalary = Math.round((baseSalary + otAmount) * 100) / 100;

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
      phHours: phWorkedHrs,
      totalHrs: totalWorkedHrs,
      presentDays: effectivePresentDays,
      absentDays,
      holidayDays,
      paidLeaves,
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
      return NextResponse.json({ ...updated, baseSalary, perDayRate, totalWorkingDays, daysInMonth });
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

    return NextResponse.json({ ...payroll, baseSalary, perDayRate, totalWorkingDays, daysInMonth }, { status: 201 });
  } catch (error: any) {
    console.error('Payroll error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
