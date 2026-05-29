import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const employeeId = searchParams.get('employeeId') || '';
    const department = searchParams.get('department') || '';

    const where: any = { month, year };
    if (employeeId) where.employeeId = employeeId;
    if (department) {
      const emps = await db.employee.findMany({ where: { department }, select: { employeeId: true } });
      where.employeeId = { in: emps.map(e => e.employeeId) };
    }

    const payrolls = await db.payroll.findMany({
      where,
      include: { employee: { select: { fullName: true, employeeId: true, department: true, designation: true } } },
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

    const holidays = await db.holiday.findMany({ where: { date: { gte: startDate, lt: endDate } } });
    const holidayDates = new Set(holidays.map(h => h.date.toDateString()));

    let sundays = 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(year, month - 1, d).getDay() === 0) sundays++;
    }

    const totalWorkingDays = daysInMonth - sundays - holidayDates.size;

    const attendance = await db.attendance.findMany({
      where: { employeeId, date: { gte: startDate, lt: endDate } },
    });

    const presentDays = attendance.filter(a => ['present', 'late'].includes(a.status)).length;
    const halfDays = attendance.filter(a => a.status === 'half_day').length;
    const holidayWorked = attendance.filter(a => a.status === 'holiday').length;
    const effectivePresentDays = presentDays + halfDays * 0.5 + holidayWorked;

    const leaves = await db.leave.findMany({
      where: { employeeId, status: 'approved', startDate: { gte: startDate }, endDate: { lt: endDate } },
    });
    const paidLeaves = leaves.reduce((sum, l) => sum + l.days, 0);

    const overtimeRecords = await db.overtime.findMany({
      where: { employeeId, date: { gte: startDate, lt: endDate } },
    });
    const overtimeAmount = overtimeRecords.reduce((sum, o) => sum + o.amount, 0);

    const absentDays = Math.max(0, totalWorkingDays - effectivePresentDays - paidLeaves);
    const earnedSalary = (employee.basicSalary / Math.max(1, totalWorkingDays)) * (effectivePresentDays + paidLeaves);
    const grossSalary = earnedSalary + overtimeAmount + (body.bonus || 0) + (body.incentive || 0);

    const pfDeduction = employee.pfNumber ? grossSalary * 0.12 : 0;
    const esiDeduction = employee.esiNumber ? grossSalary * 0.0075 : 0;
    const totalDeductions = pfDeduction + esiDeduction + (body.tdsDeduction || 0) + (body.advanceDeduction || 0) + (body.otherDeductions || 0);
    const netSalary = grossSalary - totalDeductions;

    const existing = await db.payroll.findFirst({ where: { employeeId, month, year } });
    if (existing) {
      const updated = await db.payroll.update({
        where: { id: existing.id },
        data: {
          basicSalary: employee.basicSalary,
          presentDays: effectivePresentDays,
          absentDays,
          holidayDays: holidayWorked,
          paidLeaves,
          overtimeAmount,
          bonus: body.bonus || 0,
          incentive: body.incentive || 0,
          pfDeduction,
          esiDeduction,
          tdsDeduction: body.tdsDeduction || 0,
          advanceDeduction: body.advanceDeduction || 0,
          otherDeductions: body.otherDeductions || 0,
          grossSalary,
          totalDeductions,
          netSalary,
          status: 'generated',
        },
      });
      return NextResponse.json(updated);
    }

    const payroll = await db.payroll.create({
      data: {
        employeeId,
        month,
        year,
        basicSalary: employee.basicSalary,
        presentDays: effectivePresentDays,
        absentDays,
        holidayDays: holidayWorked,
        paidLeaves,
        overtimeAmount,
        bonus: body.bonus || 0,
        incentive: body.incentive || 0,
        pfDeduction,
        esiDeduction,
        tdsDeduction: body.tdsDeduction || 0,
        advanceDeduction: body.advanceDeduction || 0,
        otherDeductions: body.otherDeductions || 0,
        grossSalary,
        totalDeductions,
        netSalary,
        status: 'generated',
      },
    });

    await db.salaryHistory.create({
      data: { employeeId, month, year, netSalary },
    });

    await db.notification.create({
      data: {
        title: 'Payroll Generated',
        message: `Payroll for ${employee.fullName} - ${month}/${year}: ₹${netSalary.toFixed(2)}`,
        type: 'payroll',
      },
    });

    return NextResponse.json(payroll, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
