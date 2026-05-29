import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { month, year } = await request.json();
    const employees = await db.employee.findMany({ where: { status: 'active' } });

    const results = [];
    for (const emp of employees) {
      try {
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

        const attendance = await db.attendance.findMany({ where: { employeeId: emp.employeeId, date: { gte: startDate, lt: endDate } } });
        const presentDays = attendance.filter(a => ['present', 'late'].includes(a.status)).length;
        const halfDays = attendance.filter(a => a.status === 'half_day').length;
        const holidayWorked = attendance.filter(a => a.status === 'holiday').length;
        const effectivePresentDays = presentDays + halfDays * 0.5 + holidayWorked;

        const leaves = await db.leave.findMany({ where: { employeeId: emp.employeeId, status: 'approved', startDate: { gte: startDate }, endDate: { lt: endDate } } });
        const paidLeaves = leaves.reduce((sum, l) => sum + l.days, 0);

        const overtimeRecords = await db.overtime.findMany({ where: { employeeId: emp.employeeId, date: { gte: startDate, lt: endDate } } });
        const overtimeAmount = overtimeRecords.reduce((sum, o) => sum + o.amount, 0);

        const absentDays = Math.max(0, totalWorkingDays - effectivePresentDays - paidLeaves);
        const earnedSalary = (emp.basicSalary / Math.max(1, totalWorkingDays)) * (effectivePresentDays + paidLeaves);
        const grossSalary = earnedSalary + overtimeAmount;
        const pfDeduction = emp.pfNumber ? grossSalary * 0.12 : 0;
        const esiDeduction = emp.esiNumber ? grossSalary * 0.0075 : 0;
        const totalDeductions = pfDeduction + esiDeduction;
        const netSalary = grossSalary - totalDeductions;

        const existing = await db.payroll.findFirst({ where: { employeeId: emp.employeeId, month, year } });
        if (existing) {
          await db.payroll.update({
            where: { id: existing.id },
            data: { basicSalary: emp.basicSalary, presentDays: effectivePresentDays, absentDays, holidayDays: holidayWorked, paidLeaves, overtimeAmount, grossSalary, pfDeduction, esiDeduction, totalDeductions, netSalary, status: 'generated' },
          });
        } else {
          await db.payroll.create({
            data: { employeeId: emp.employeeId, month, year, basicSalary: emp.basicSalary, presentDays: effectivePresentDays, absentDays, holidayDays: holidayWorked, paidLeaves, overtimeAmount, grossSalary, pfDeduction, esiDeduction, totalDeductions, netSalary, status: 'generated' },
          });
          await db.salaryHistory.create({ data: { employeeId: emp.employeeId, month, year, netSalary } });
        }
        results.push({ employeeId: emp.employeeId, name: emp.fullName, netSalary, status: 'success' });
      } catch (err: any) {
        results.push({ employeeId: emp.employeeId, name: emp.fullName, error: err.message, status: 'error' });
      }
    }

    return NextResponse.json({ generated: results.length, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
