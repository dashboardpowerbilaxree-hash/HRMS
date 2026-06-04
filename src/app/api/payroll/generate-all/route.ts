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

        // ─── LAXREE PAYROLL FORMULA (matching Excel Payroll Master) ───
        // FULL PRECISION hourly rate — no intermediate rounding
        const perDayRate = emp.monthlySalary / daysInMonth;
        const hourlyRate = emp.monthlySalary / (daysInMonth * emp.shiftHours);

        const attendance = await db.attendance.findMany({
          where: { employeeId: emp.employeeId, date: { gte: startDate, lt: endDate } },
        });

        // ─── HOUR-BASED salary calculation ───
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
            const baseHrs = Math.max(0, (a.totalHours || 0) - (a.overtimeHours || 0));
            totalBaseHours += baseHrs;

            if (a.status === 'half-day' || a.status === 'half_day') {
              effectivePresentDays += 0.5;
            } else {
              effectivePresentDays += Math.min(1, baseHrs / emp.shiftHours);
            }
          }
        }
        effectivePresentDays = Math.round(effectivePresentDays * 100) / 100;

        const totalWorkedHrs = Math.floor(totalWorkMinutes / 60) + (totalWorkMinutes % 60) / 100;

        // OT Hours: Sum stored overtimeHours directly
        const otHoursDecimal = Math.round(attendance.filter(a => ['present', 'late', 'half-day', 'half_day', 'early-out'].includes(a.status)).reduce((sum, a) => sum + (a.overtimeHours || 0), 0) * 100) / 100;
        const otHours = otHoursDecimal;

        // Attendance counts
        const rawPresentDays = attendance.filter(a => ['present', 'late', 'early-out'].includes(a.status)).length;
        const halfDays = attendance.filter(a => a.status === 'half-day' || a.status === 'half_day').length;
        const presentDays = rawPresentDays;

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

        // ─── HOUR-BASED SALARY CALCULATION (matching Excel) ───
        const earnedDays = effectivePresentDays + effectivePaidLeaves;
        const sundayCount = sundays;
        const sundayHrs = sundayCount * emp.shiftHours;
        const paidLeaveHrs = effectivePaidLeaves * emp.shiftHours;
        const totalHrs = totalBaseHours + sundayHrs + otHoursDecimal + paidLeaveHrs;
        const baseSalary = hourlyRate * totalBaseHours;
        const sundayEarnings = hourlyRate * sundayHrs;
        const earnedSundayHrs = sundayHrs;
        const otAmount = otHoursDecimal * hourlyRate;
        const grossSalary = hourlyRate * totalHrs;

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

        const totalDeductions = 0;
        const netSalary = Math.round(grossSalary * 100) / 100;

        const payrollData = {
          monthlySalary: emp.monthlySalary,
          hourlyRate: Math.round(hourlyRate * 100) / 100, // Store rounded for DB
          totalWorkedHrs,
          otHours,
          otRate: Math.round(hourlyRate * 100) / 100, // Store rounded for DB
          otAmount: Math.round(otAmount * 100) / 100,
          sundayHrs: sundayWorkedHrs,
          sundayCount,
          sundayEarnings: Math.round(sundayEarnings * 100) / 100,
          phHours: phWorkedHrs,
          totalHrs: Math.round(totalHrs * 100) / 100,
          presentDays: presentDays,
          absentDays,
          holidayDays,
          paidLeaves: effectivePaidLeaves,
          grossSalary: Math.round(grossSalary * 100) / 100,
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
