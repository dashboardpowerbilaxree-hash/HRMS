import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { month, year, firm, department, location } = await request.json();
    const effectiveFirm = firm || department;

    const empFilter: any = { status: { notIn: ['inactive', 'No'] } };
    if (effectiveFirm) empFilter.firm = effectiveFirm;
    if (location) empFilter.location = location;

    const employees = await db.employee.findMany({ where: empFilter });
    const results = [];

    for (const emp of employees) {
      try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);
        const daysInMonth = new Date(year, month, 0).getDate();

        const hourlyRate = emp.hourlyRate || (emp.monthlySalary / (emp.shiftHours * daysInMonth));

        const attendance = await db.attendance.findMany({
          where: { employeeId: emp.employeeId, date: { gte: startDate, lt: endDate } },
        });

        const totalWorkedHrs = Math.round(attendance
          .filter(a => ['present', 'late', 'half-day', 'half_day'].includes(a.status))
          .reduce((sum, a) => sum + a.totalHours, 0) * 100) / 100;

        const overtimeRecords = await db.overtime.findMany({
          where: { employeeId: emp.employeeId, date: { gte: startDate, lt: endDate } },
        });
        const otHours = Math.round(overtimeRecords.reduce((sum, o) => sum + o.hours, 0) * 100) / 100;
        const otAmount = Math.round(overtimeRecords.reduce((sum, o) => sum + o.amount, 0) * 100) / 100;

        const presentDays = attendance.filter(a => ['present', 'late'].includes(a.status)).length;
        const halfDays = attendance.filter(a => a.status === 'half-day' || a.status === 'half_day').length;
        const holidayWorked = attendance.filter(a => a.isHoliday).length;

        const sundaysEarned = emp.employmentType === 'Full Time' ? Math.floor(presentDays / 6) : 0;
        const sundayHrs = Math.round(sundaysEarned * emp.shiftHours * 100) / 100;
        const phHours = Math.round(attendance.filter(a => a.isHoliday).reduce((sum, a) => sum + a.totalHours, 0) * 100) / 100;
        const totalHrs = Math.round((totalWorkedHrs + sundayHrs + phHours) * 100) / 100;

        let grossSalary = 0;
        if (emp.salaryType === 'hourly') {
          grossSalary = Math.round((totalHrs * hourlyRate + otAmount) * 100) / 100;
        } else {
          const dailyRate = emp.dailyRate || Math.round(emp.monthlySalary / 30 * 100) / 100;
          grossSalary = Math.round((dailyRate * (presentDays + halfDays * 0.5 + sundaysEarned) + otAmount) * 100) / 100;
        }

        const leaves = await db.leave.findMany({
          where: { employeeId: emp.employeeId, status: 'approved', startDate: { gte: startDate }, endDate: { lt: endDate } },
        });
        const paidLeaves = leaves.reduce((sum, l) => sum + l.days, 0);

        const holidays = await db.holiday.findMany({ where: { date: { gte: startDate, lt: endDate } } });
        const holidayDays = holidays.length;
        let sundays = 0;
        for (let d = 1; d <= daysInMonth; d++) {
          if (new Date(year, month - 1, d).getDay() === 0) sundays++;
        }
        const totalWorkingDays = daysInMonth - sundays - holidayDays;
        const effectivePresentDays = presentDays + halfDays * 0.5 + holidayWorked;
        const absentDays = Math.max(0, totalWorkingDays - effectivePresentDays - paidLeaves);

        const totalDeductions = 0;
        const netSalary = grossSalary;

        const payrollData = {
          monthlySalary: emp.monthlySalary,
          hourlyRate: Math.round(hourlyRate * 100) / 100,
          totalWorkedHrs,
          otHours,
          otRate: emp.overtimeRate,
          otAmount,
          sundayHrs,
          phHours,
          totalHrs,
          presentDays: effectivePresentDays,
          absentDays,
          holidayDays,
          paidLeaves,
          grossSalary,
          tdsDeduction: 0,
          loanDeduction: 0,
          advanceDeduction: 0,
          securityDeposit: 0,
          otherDeductions: 0,
          totalDeductions,
          arrear: 0,
          netSalary,
          status: 'generated' as const,
        };

        const existing = await db.payroll.findFirst({
          where: { employeeId: emp.employeeId, month, year },
        });

        if (existing) {
          await db.payroll.update({ where: { id: existing.id }, data: payrollData });
        } else {
          await db.payroll.create({ data: { employeeId: emp.employeeId, month, year, ...payrollData } });
          await db.salaryHistory.create({ data: { employeeId: emp.employeeId, month, year, netSalary } });
        }

        results.push({ employeeId: emp.employeeId, name: emp.fullName, firm: emp.firm, netSalary, status: 'success' });
      } catch (err: any) {
        results.push({ employeeId: emp.employeeId, name: emp.fullName, error: err.message, status: 'error' });
      }
    }

    return NextResponse.json({
      generated: results.filter(r => r.status === 'success').length,
      errors: results.filter(r => r.status === 'error').length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
