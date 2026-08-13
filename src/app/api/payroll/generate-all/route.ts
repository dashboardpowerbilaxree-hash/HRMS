import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getEffectiveCutoffDay,
  countSundaysUpTo,
  countHolidaysUpTo,
  filterAttendanceUpTo,
  getActualShiftHours,
  recomputeStatus,
  shouldApplyLateEarly,
} from '@/lib/payroll-calc';

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

        // ── Effective cutoff day ──
        // Caps all calculations at today (current month) or relievingDate (employee left)
        const cutoffDay = getEffectiveCutoffDay(year, month, daysInMonth, emp.relievingDate);

        // ─── Count sundays and holidays (only up to cutoff day) ───
        const holidays = await db.holiday.findMany({ where: { date: { gte: startDate, lt: endDate } } });
        const elapsedHolidays = countHolidaysUpTo(holidays, cutoffDay);
        const holidayDays = elapsedHolidays;
        const sundays = countSundaysUpTo(year, month, cutoffDay);
        const totalWorkingDays = Math.max(0, cutoffDay - sundays - elapsedHolidays);

        // ─── LAXREE PAYROLL FORMULA (matching Excel Payroll Master) ───
        const perDayRate = emp.monthlySalary / daysInMonth;
        const hourlyRate = Math.round((emp.monthlySalary / (daysInMonth * emp.shiftHours)) * 100) / 100;

        const attendance = await db.attendance.findMany({
          where: { employeeId: emp.employeeId, date: { gte: startDate, lt: endDate } },
        });
        // Filter attendance to cutoff (drop future-dated rows defensively)
        const effectiveAttendance = filterAttendanceUpTo(attendance, year, month, cutoffDay);

        // ── Compute actual shift hours (with 12-hour format fix-up) ──
        // This must match what Master Excel and Attendance Tracker use.
        const actualShiftHours = getActualShiftHours(emp.shiftHours, emp.shiftStart, emp.shiftEnd);
        // Freelance short-shift rule (Aug 13, 2026): suppress late/early
        // for Freelance employees with shiftHours < 4 (e.g. Prakash 2h, Mayank 1h).
        const applyLateEarly = shouldApplyLateEarly(emp);

        // ─── HOUR-BASED salary calculation ───
        // IMPORTANT: Use recomputeStatus() to fix wrongly-marked half-day and
        // early-out records (12-hour shift format bug). This ensures payroll
        // matches what Master Excel shows.
        let totalBaseHours = 0;
        let totalWorkMinutes = 0;
        let effectivePresentDays = 0;

        // Track recomputed status for each attendance record
        const recomputedStatusMap = new Map<string, string>();
        for (const a of effectiveAttendance) {
          const cs = recomputeStatus(a, actualShiftHours, emp.shiftStart, emp.shiftEnd, applyLateEarly);
          const ad = new Date(a.date);
          const dateKey = `${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}`;
          recomputedStatusMap.set(dateKey, cs);
        }

        for (const a of effectiveAttendance) {
          const ad = new Date(a.date);
          const dateKey = `${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}`;
          const correctedStatus = recomputedStatusMap.get(dateKey) || a.status;

          if (a.checkIn && a.checkOut && ['present', 'late', 'half-day', 'half_day', 'early-out'].includes(correctedStatus)) {
            const [h1, m1] = a.checkIn.split(':').map(Number);
            const [h2, m2] = a.checkOut.split(':').map(Number);
            const workMin = Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
            totalWorkMinutes += workMin;
          }

          if (['present', 'late', 'early-out', 'half-day', 'half_day'].includes(correctedStatus)) {
            const baseHrs = Math.max(0, (a.totalHours || 0) - (a.overtimeHours || 0));
            totalBaseHours += baseHrs;

            if (correctedStatus === 'half-day' || correctedStatus === 'half_day') {
              effectivePresentDays += 0.5;
            } else {
              effectivePresentDays += Math.min(1, baseHrs / emp.shiftHours);
            }
          }
        }
        effectivePresentDays = Math.round(effectivePresentDays * 100) / 100;

        const totalWorkedHrs = Math.floor(totalWorkMinutes / 60) + (totalWorkMinutes % 60) / 100;

        // OT Hours: Sum stored overtimeHours (use RECOMPUTED status to decide
        // which records count — must match Master Excel logic)
        const otHoursDecimal = Math.round(effectiveAttendance.filter(a => {
          const ad = new Date(a.date);
          const dateKey = `${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}`;
          const cs = recomputedStatusMap.get(dateKey) || a.status;
          return ['present', 'late', 'half-day', 'half_day', 'early-out'].includes(cs);
        }).reduce((sum, a) => sum + (a.overtimeHours || 0), 0) * 100) / 100;
        const otHours = otHoursDecimal;

        // Attendance counts (using RECOMPUTED status to match Master Excel)
        const rawPresentDays = effectiveAttendance.filter(a => {
          const ad = new Date(a.date);
          const dateKey = `${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}`;
          const cs = recomputedStatusMap.get(dateKey) || a.status;
          return ['present', 'late', 'early-out'].includes(cs);
        }).length;
        const halfDays = effectiveAttendance.filter(a => {
          const ad = new Date(a.date);
          const dateKey = `${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}`;
          const cs = recomputedStatusMap.get(dateKey) || a.status;
          return cs === 'half-day' || cs === 'half_day';
        }).length;
        const presentDays = rawPresentDays;

        const leaves = await db.leave.findMany({
          where: { employeeId: emp.employeeId, status: 'approved', startDate: { lt: endDate }, endDate: { gte: startDate } },
        });

        // Build sets for effective leave calculation
        const holidayDateStrs = new Set(
          holidays.map(h => {
            const hd = new Date(h.date);
            return `${hd.getFullYear()}-${String(hd.getMonth() + 1).padStart(2, '0')}-${String(hd.getDate()).padStart(2, '0')}`;
          })
        );
        // Build present-date-strings set using RECOMPUTED status (must match
        // Master Excel logic — a wrongly-marked half-day that recomputes to
        // 'present' should count as present for leave-overlap purposes too)
        const presentDateStrs = new Set<string>();
        for (const a of effectiveAttendance) {
          const ad = new Date(a.date);
          const dateKey = `${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}`;
          const cs = recomputedStatusMap.get(dateKey) || a.status;
          if (['present', 'late', 'early-out', 'half-day', 'half_day'].includes(cs)) {
            presentDateStrs.add(dateKey);
          }
        }

        let effectivePaidLeaves = 0;
        let effectiveUnpaidLeaves = 0;
        const cutoffDate = new Date(year, month - 1, cutoffDay, 23, 59, 59);
        for (const leave of leaves) {
          const isUnpaid = leave.type === 'unpaid' || leave.type === 'UL' || leave.type === 'LOP';
          let d = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          // Cap leave iteration at cutoff day — don't count future leave days
          const effectiveEnd = end > cutoffDate ? cutoffDate : end;
          while (d <= effectiveEnd) {
            // ═══ BUG FIX ═══
            // Only count leave days that fall WITHIN the current payroll
            // month/year. Previously, a leave spanning June 27 → July 1
            // would count June 27, 29, 30 as July paid leaves (wrong!).
            // Now we skip any day outside the current month.
            if (d.getFullYear() === year && d.getMonth() + 1 === month) {
              const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              const isSunday = d.getDay() === 0;
              const isHoliday = holidayDateStrs.has(dateStr);
              if (!isSunday && !isHoliday && !presentDateStrs.has(dateStr)) {
                if (isUnpaid) effectiveUnpaidLeaves++;
                else effectivePaidLeaves++;
              }
            }
            d.setDate(d.getDate() + 1);
          }
        }

        // ═══ COMPANY POLICY: NO PAID LEAVES ═══
        // Per company policy, employees do NOT get paid for any leave days.
        // All leaves (whether type 'casual', 'sick', 'earned', or anything else)
        // are treated as UNPAID — they reduce the salary proportionally.
        //
        // We still COUNT the leave days (for Master Excel display & records),
        // but they do NOT contribute to totalHrs or grossSalary.
        //
        // For salary calculation:
        //   - paidLeaveHrs = 0  (no pay for leaves)
        //   - Leave days are NOT added to absentDays either, because the
        //     Master Excel shows them in a separate "Leave" column. Adding
        //     them to absentDays would double-count them in the UI.
        //
        // The payroll.paidLeaves field is kept as the leave COUNT (for
        // display purposes), but it does NOT affect salary.

        // Absent days = totalWorkingDays - presentDays - halfDays - leaveDays
        // (leaves are unpaid but tracked separately, so we don't add them
        //  to absentDays — they appear in their own column)
        const totalLeaveDays = effectivePaidLeaves + effectiveUnpaidLeaves;
        const absentDays = Math.max(0, totalWorkingDays - presentDays - halfDays - totalLeaveDays);

        // ─── HOUR-BASED SALARY CALCULATION (matching Excel) ───
        // NO paidLeaveHrs in totalHrs — leaves are unpaid
        const earnedDays = effectivePresentDays;
        const sundayCount = sundays;
        const sundayHrs = sundayCount * emp.shiftHours;
        const paidLeaveHrs = 0;  // ← NO PAID LEAVES per company policy
        const totalHrs = totalBaseHours + sundayHrs + otHoursDecimal + paidLeaveHrs;
        const baseSalary = hourlyRate * totalBaseHours;
        const sundayEarnings = hourlyRate * sundayHrs;
        const earnedSundayHrs = sundayHrs;
        const otAmount = otHoursDecimal * hourlyRate;
        const grossSalary = hourlyRate * totalHrs;

        // ─── ACTUAL Sunday worked hours (for display/records only) ───
        let sundayWorkMinutes = 0;
        for (const a of effectiveAttendance) {
          if (a.isSunday && a.checkIn && a.checkOut) {
            const [h1, m1] = a.checkIn.split(':').map(Number);
            const [h2, m2] = a.checkOut.split(':').map(Number);
            sundayWorkMinutes += Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
          }
        }
        const sundayWorkedHrs = Math.floor(sundayWorkMinutes / 60) + (sundayWorkMinutes % 60) / 100;

        const totalDeductions = 0;
        const netSalary = Math.round(grossSalary * 100) / 100;

        const payrollData = {
          monthlySalary: emp.monthlySalary,
          hourlyRate,
          totalWorkedHrs,
          otHours,
          otRate: hourlyRate,
          otAmount: Math.round(otAmount * 100) / 100,
          sundayHrs: sundayWorkedHrs,
          sundayCount,
          sundayEarnings: Math.round(sundayEarnings * 100) / 100,
          totalHrs: Math.round(totalHrs * 100) / 100,
          presentDays: presentDays,
          absentDays,
          holidayDays,
          paidLeaves: totalLeaveDays,  // total leave days (all unpaid, for display)
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
