import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const employeeId = searchParams.get('employeeId') || '';
    const firm = searchParams.get('firm') || '';
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
            designation: true,
            location: true,
            salaryType: true,
            hourlyRate: true,
          },
        },
      },
      orderBy: { employeeId: 'asc' },
    });
    return NextResponse.json(payrolls);
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

    // ─── LAXREE PAYROLL FORMULA ───
    // Hourly Rate = monthlySalary / (shiftHours × daysInMonth)
    const hourlyRate = employee.hourlyRate || (employee.monthlySalary / (employee.shiftHours * daysInMonth));

    // Get attendance records for the month
    const attendance = await db.attendance.findMany({
      where: { employeeId, date: { gte: startDate, lt: endDate } },
    });

    // Total worked hours from attendance
    const totalWorkedHrs = Math.round(attendance
      .filter(a => ['present', 'late', 'half_day'].includes(a.status))
      .reduce((sum, a) => sum + a.totalHours, 0) * 100) / 100;

    // Overtime records
    const overtimeRecords = await db.overtime.findMany({
      where: { employeeId, date: { gte: startDate, lt: endDate } },
    });
    const otHours = Math.round(overtimeRecords.reduce((sum, o) => sum + o.hours, 0) * 100) / 100;
    const otAmount = Math.round(overtimeRecords.reduce((sum, o) => sum + o.amount, 0) * 100) / 100;

    // Sunday tracking — earned Sundays (1 per 6 working days for Full Time)
    const presentDays = attendance.filter(a => ['present', 'late'].includes(a.status)).length;
    const halfDays = attendance.filter(a => a.status === 'half_day').length;
    const holidayWorked = attendance.filter(a => a.isHoliday).length;
    const weeklyOffWorked = attendance.filter(a => a.isWeeklyOff).length;

    // Sundays earned: 1 per 6 full working days
    const sundaysEarned = employee.employmentType === 'Full Time' ? Math.floor(presentDays / 6) : 0;
    const sundayHrs = Math.round(sundaysEarned * employee.shiftHours * 100) / 100;

    // PH hours (public holiday worked)
    const phHours = Math.round(attendance.filter(a => a.isHoliday).reduce((sum, a) => sum + a.totalHours, 0) * 100) / 100;

    // Total hours = worked + sunday + PH
    const totalHrs = Math.round((totalWorkedHrs + sundayHrs + phHours) * 100) / 100;

    // ─── GROSS SALARY ───
    let grossSalary = 0;
    if (employee.salaryType === 'hourly') {
      // Gross = Total Hrs × Hourly Rate + OT Amount
      grossSalary = Math.round((totalHrs * hourlyRate + otAmount) * 100) / 100;
    } else {
      // Daily workers: Gross = Daily Rate × Present Days + OT Amount
      const dailyRate = employee.dailyRate || Math.round(employee.monthlySalary / 30 * 100) / 100;
      grossSalary = Math.round((dailyRate * (presentDays + halfDays * 0.5 + sundaysEarned) + otAmount) * 100) / 100;
    }

    // Approved leaves
    const leaves = await db.leave.findMany({
      where: { employeeId, status: 'approved', startDate: { gte: startDate }, endDate: { lt: endDate } },
    });
    const paidLeaves = leaves.reduce((sum, l) => sum + l.days, 0);

    // Count sundays and holidays in month
    let sundays = 0;
    const holidays = await db.holiday.findMany({ where: { date: { gte: startDate, lt: endDate } } });
    const holidayDays = holidays.length;
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(year, month - 1, d).getDay() === 0) sundays++;
    }
    const totalWorkingDays = daysInMonth - sundays - holidayDays;
    const effectivePresentDays = presentDays + halfDays * 0.5 + holidayWorked;
    const absentDays = Math.max(0, totalWorkingDays - effectivePresentDays - paidLeaves);

    // ─── DEDUCTIONS ───
    const tdsDeduction = body.tdsDeduction || 0;
    const loanDeduction = body.loanDeduction || 0;
    const advanceDeduction = body.advanceDeduction || 0;
    const securityDeposit = body.securityDeposit || 0;
    const otherDeductions = body.otherDeductions || 0;
    const totalDeductions = Math.round((tdsDeduction + loanDeduction + advanceDeduction + securityDeposit + otherDeductions) * 100) / 100;

    // ─── NET SALARY ───
    const arrear = body.arrear || 0;
    const netSalary = Math.round((grossSalary - totalDeductions + arrear) * 100) / 100;

    const payrollData = {
      monthlySalary: employee.monthlySalary,
      hourlyRate: Math.round(hourlyRate * 100) / 100,
      totalWorkedHrs,
      otHours,
      otRate: employee.overtimeRate,
      otAmount,
      sundayHrs,
      phHours,
      totalHrs,
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
      netSalary,
      status: 'generated' as const,
    };

    const existing = await db.payroll.findFirst({ where: { employeeId, month, year } });
    if (existing) {
      const updated = await db.payroll.update({
        where: { id: existing.id },
        data: payrollData,
      });
      return NextResponse.json(updated);
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

    return NextResponse.json(payroll, { status: 201 });
  } catch (error: any) {
    console.error('Payroll error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
