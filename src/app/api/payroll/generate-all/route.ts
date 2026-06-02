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

        const perDayRate = Math.round((emp.monthlySalary / daysInMonth) * 100) / 100;
        const hourlyRate = Math.round((perDayRate / emp.shiftHours) * 100) / 100;

        const attendance = await db.attendance.findMany({
          where: { employeeId: emp.employeeId, date: { gte: startDate, lt: endDate } },
        });

        const totalWorkedHrs = Math.round(attendance
          .filter(a => ['present', 'late', 'half-day', 'half_day', 'early-out'].includes(a.status))
          .reduce((sum, a) => sum + a.totalHours, 0) * 100) / 100;

        // Overtime records (get OT hours from records, amount recalculated using hourlyRate)
        const overtimeRecords = await db.overtime.findMany({
          where: { employeeId: emp.employeeId, date: { gte: startDate, lt: endDate } },
        });
        const otHours = Math.round(overtimeRecords.reduce((sum, o) => sum + o.hours, 0) * 100) / 100;

        // Attendance counts
        const presentDays = attendance.filter(a => ['present', 'late', 'early-out'].includes(a.status)).length;
        const halfDays = attendance.filter(a => a.status === 'half-day' || a.status === 'half_day').length;
        const holidayWorked = attendance.filter(a => a.isHoliday && a.totalHours > 0).length;
        const weeklyOffWorked = attendance.filter(a => a.isWeeklyOff && a.totalHours > 0).length;

        // Effective present days
        const effectivePresentDays = presentDays + halfDays * 0.5 + holidayWorked + weeklyOffWorked;

        const leaves = await db.leave.findMany({
          where: { employeeId: emp.employeeId, status: 'approved', startDate: { gte: startDate }, endDate: { lt: endDate } },
        });
        const paidLeaves = leaves.filter(l => l.type !== 'unpaid' && l.type !== 'UL' && l.type !== 'LOP').reduce((sum, l) => sum + l.days, 0);

        const absentDays = Math.max(0, totalWorkingDays - effectivePresentDays - paidLeaves);

        // ─── BASE SALARY = monthlySalary - (perDayRate × absentDays) ───
        const baseSalary = Math.round((emp.monthlySalary - (perDayRate * absentDays)) * 100) / 100;

        // ─── ACTUAL Sunday/PH worked hours (for display/records only) ───
        const sundayWorkedHrs = Math.round(attendance.filter(a => a.isSunday && a.totalHours > 0).reduce((sum, a) => sum + a.totalHours, 0) * 100) / 100;
        const phWorkedHrs = Math.round(attendance.filter(a => a.isHoliday && a.totalHours > 0).reduce((sum, a) => sum + a.totalHours, 0) * 100) / 100;

        // ─── OT Amount = otHours × hourlyRate (1x normal rate, NOT 1.5x) ───
        const otAmount = Math.round(otHours * hourlyRate * 100) / 100;

        // ─── GROSS SALARY = baseSalary + otAmount ───
        const grossSalary = Math.round((baseSalary + otAmount) * 100) / 100;

        const totalDeductions = 0;
        const netSalary = grossSalary;

        const payrollData = {
          monthlySalary: emp.monthlySalary,
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
          tdsDeduction: 0,
          loanDeduction: 0,
          advanceDeduction: 0,
          securityDeposit: 0,
          otherDeductions: 0,
          totalDeductions,
          arrear: 0,
          bonus: 0,
          incentive: 0,
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
