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
        const rawPresentDays = attendance.filter(a => ['present', 'late', 'early-out'].includes(a.status)).length;
        const halfDays = attendance.filter(a => a.status === 'half-day' || a.status === 'half_day').length;
        const holidayWorked = attendance.filter(a => a.isHoliday && a.totalHours > 0).length;
        const weeklyOffWorked = attendance.filter(a => a.isWeeklyOff && a.totalHours > 0).length;

        // Present days = full present days only (half-days tracked separately for display)
        // Sunday/holiday work does NOT inflate present count
        const presentDays = rawPresentDays;
        // For salary: effectivePresentDays includes half-days as 0.5
        const effectivePresentDays = rawPresentDays + halfDays * 0.5;

        const leaves = await db.leave.findMany({
          where: { employeeId: emp.employeeId, status: 'approved', startDate: { gte: startDate }, endDate: { lt: endDate } },
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
        const absentDays = Math.max(0, totalWorkingDays - presentDays - halfDays - effectivePaidLeaves - effectiveUnpaidLeaves);

        // ─── BASE SALARY = monthlySalary - (perDayRate × salaryAbsentDays) ───
        // salaryAbsentDays uses effectivePresentDays (includes half-days as 0.5)
        const salaryAbsentDays = Math.max(0, totalWorkingDays - effectivePresentDays - effectivePaidLeaves - effectiveUnpaidLeaves);
        const baseSalary = Math.round((emp.monthlySalary - (perDayRate * salaryAbsentDays)) * 100) / 100;

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
          presentDays: presentDays,
          absentDays,
          holidayDays,
          paidLeaves: effectivePaidLeaves,
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
