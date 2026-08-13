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

/**
 * Regenerate the payroll record for a single employee for a given month/year.
 *
 * Why this exists:
 *   When an admin updates an employee's `monthlySalary` (or `shiftHours`),
 *   any existing Payroll row for the current month becomes STALE — it still
 *   stores the OLD salary/hourlyRate/gross/net computed before the update.
 *   The payslip UI reads from the Payroll table, so it shows wrong numbers
 *   until payroll is regenerated. This helper runs the same calculation as
 *   `/api/payroll/generate-all` but for a single employee, and is called
 *   automatically after every Employee PUT that touches salary/shift.
 *
 * Safety:
 *   - No data loss: uses `update` if a Payroll row already exists, otherwise
 *     `create`. Attendance/Leave/Holiday data is never modified.
 *   - Silent on success: returns void. Errors are swallowed and logged so
 *     they don't fail the parent Employee update.
 *   - Only runs for the CURRENT month — past months keep their historical
 *     values (a July payslip should show July's salary, not today's).
 */
async function regenerateCurrentMonthPayroll(employeeId: string) {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const emp = await db.employee.findUnique({ where: { employeeId } });
    if (!emp) return;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const cutoffDay = getEffectiveCutoffDay(year, month, daysInMonth, emp.relievingDate);

    const holidays = await db.holiday.findMany({ where: { date: { gte: startDate, lt: endDate } } });
    const elapsedHolidays = countHolidaysUpTo(holidays, cutoffDay);
    const sundays = countSundaysUpTo(year, month, cutoffDay);
    const totalWorkingDays = Math.max(0, cutoffDay - sundays - elapsedHolidays);

    const hourlyRate = Math.round((emp.monthlySalary / (daysInMonth * emp.shiftHours)) * 100) / 100;

    const attendance = await db.attendance.findMany({
      where: { employeeId: emp.employeeId, date: { gte: startDate, lt: endDate } },
    });
    const effectiveAttendance = filterAttendanceUpTo(attendance, year, month, cutoffDay);
    const actualShiftHours = getActualShiftHours(emp.shiftHours, emp.shiftStart, emp.shiftEnd);
    // Freelance short-shift rule (Aug 13, 2026): suppress late/early for Freelance with shiftHours < 4
    const applyLateEarly = shouldApplyLateEarly(emp);

    // Recompute status for each attendance record (12-hour shift format fix-up)
    const recomputedStatusMap = new Map<string, string>();
    for (const a of effectiveAttendance) {
      const cs = recomputeStatus(a, actualShiftHours, emp.shiftStart, emp.shiftEnd, applyLateEarly);
      const ad = new Date(a.date);
      const dateKey = `${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}`;
      recomputedStatusMap.set(dateKey, cs);
    }

    let totalBaseHours = 0;
    let totalWorkMinutes = 0;
    let effectivePresentDays = 0;
    for (const a of effectiveAttendance) {
      const ad = new Date(a.date);
      const dateKey = `${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}`;
      const correctedStatus = recomputedStatusMap.get(dateKey) || a.status;
      if (a.checkIn && a.checkOut && ['present', 'late', 'half-day', 'half_day', 'early-out'].includes(correctedStatus)) {
        const [h1, m1] = a.checkIn.split(':').map(Number);
        const [h2, m2] = a.checkOut.split(':').map(Number);
        totalWorkMinutes += Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
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

    const otHoursDecimal = Math.round(effectiveAttendance.filter(a => {
      const ad = new Date(a.date);
      const dateKey = `${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}`;
      const cs = recomputedStatusMap.get(dateKey) || a.status;
      return ['present', 'late', 'half-day', 'half_day', 'early-out'].includes(cs);
    }).reduce((sum, a) => sum + (a.overtimeHours || 0), 0) * 100) / 100;

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

    // Leaves
    const leaves = await db.leave.findMany({
      where: { employeeId: emp.employeeId, status: 'approved', startDate: { lt: endDate }, endDate: { gte: startDate } },
    });
    const holidayDateStrs = new Set(holidays.map(h => {
      const hd = new Date(h.date);
      return `${hd.getFullYear()}-${String(hd.getMonth() + 1).padStart(2, '0')}-${String(hd.getDate()).padStart(2, '0')}`;
    }));
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
      const effectiveEnd = end > cutoffDate ? cutoffDate : end;
      while (d <= effectiveEnd) {
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
    const totalLeaveDays = effectivePaidLeaves + effectiveUnpaidLeaves;
    const absentDays = Math.max(0, totalWorkingDays - presentDays - halfDays);

    const sundayHrs = sundays * emp.shiftHours;
    const paidLeaveHrs = 0;
    const totalHrs = totalBaseHours + sundayHrs + otHoursDecimal + paidLeaveHrs;
    const baseSalary = hourlyRate * totalBaseHours;
    const sundayEarnings = hourlyRate * sundayHrs;
    const otAmount = otHoursDecimal * hourlyRate;
    const grossSalary = hourlyRate * totalHrs;

    let sundayWorkMinutes = 0;
    for (const a of effectiveAttendance) {
      if (a.isSunday && a.checkIn && a.checkOut) {
        const [h1, m1] = a.checkIn.split(':').map(Number);
        const [h2, m2] = a.checkOut.split(':').map(Number);
        sundayWorkMinutes += Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
      }
    }
    const sundayWorkedHrs = Math.floor(sundayWorkMinutes / 60) + (sundayWorkMinutes % 60) / 100;

    const payrollData = {
      monthlySalary: emp.monthlySalary,
      hourlyRate,
      totalWorkedHrs,
      otHours: otHoursDecimal,
      otRate: hourlyRate,
      otAmount: Math.round(otAmount * 100) / 100,
      sundayHrs: sundayWorkedHrs,
      sundayCount: sundays,
      sundayEarnings: Math.round(sundayEarnings * 100) / 100,
      totalHrs: Math.round(totalHrs * 100) / 100,
      presentDays,
      absentDays,
      holidayDays: elapsedHolidays,
      paidLeaves: totalLeaveDays,
      grossSalary: Math.round(grossSalary * 100) / 100,
      tdsDeduction: 0,
      loanDeduction: 0,
      advanceDeduction: 0,
      securityDeposit: 0,
      otherDeductions: 0,
      totalDeductions: 0,
      arrear: 0,
      bonus: 0,
      incentive: 0,
      netSalary: Math.round(grossSalary * 100) / 100,
      status: 'generated' as const,
    };

    const existing = await db.payroll.findFirst({ where: { employeeId: emp.employeeId, month, year } });
    if (existing) {
      await db.payroll.update({ where: { id: existing.id }, data: payrollData });
    } else {
      await db.payroll.create({ data: { employeeId: emp.employeeId, month, year, ...payrollData } });
    }
  } catch (err) {
    // Silent fail — payroll regen must not block Employee update
    console.error('[regenerateCurrentMonthPayroll]', employeeId, err);
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  try {
    const { employeeId } = await params;
    const employee = await db.employee.findUnique({
      where: { employeeId },
      include: {
        attendance: { orderBy: { date: 'desc' }, take: 30 },
        payrolls: { orderBy: [{ year: 'desc' }, { month: 'desc' }] },
        leaves: { orderBy: { createdAt: 'desc' } },
        overtimes: { orderBy: { date: 'desc' } },
        salaryHistory: { orderBy: [{ year: 'desc' }, { month: 'desc' }] },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  try {
    const { employeeId } = await params;
    const body = await request.json();

    // ── Capture OLD salary & shift before update ──
    // We need to know if these changed so we can auto-regenerate the
    // current month's payroll (otherwise the payslip would show the
    // OLD salary until someone manually clicks "Generate Payroll").
    const before = await db.employee.findUnique({
      where: { employeeId },
      select: { monthlySalary: true, shiftHours: true },
    });

    const salaryType = (body.salaryType || '').toLowerCase();
    const sh = body.shiftHours || 9;
    const monthlySalary = body.monthlySalary || body.basicSalary || 0;

    // Hourly rate = monthlySalary / (daysInMonth × shiftHours)
    // User's formula: daysInMonth is total calendar days (28, 29, 30, or 31)
    //   30 days × 9 hrs = 270 hrs → ₹20,000 / 270 = ₹74.07
    //   31 days × 9 hrs = 279 hrs → ₹20,000 / 279 = ₹71.68
    //   28 days × 9 hrs = 252 hrs → ₹20,000 / 252 = ₹79.37
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    let totalWorkingDays = daysInMonth;
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(now.getFullYear(), now.getMonth(), d).getDay() === 0) totalWorkingDays--;
    }
    const holidays = await db.holiday.findMany({
      where: { date: { gte: new Date(now.getFullYear(), now.getMonth(), 1), lt: new Date(now.getFullYear(), now.getMonth() + 1, 1) } },
    });
    totalWorkingDays -= holidays.length;
    if (totalWorkingDays < 1) totalWorkingDays = 26;

    const hourlyRate = Math.round((monthlySalary / (sh * daysInMonth)) * 100) / 100;
    // OT at normal hourly rate (1x), NOT 1.5x — user explicitly confirmed
    const overtimeRate = hourlyRate;

    // Helper: parse date string 'YYYY-MM-DD' to Date at midnight local time (timezone-safe)
    // new Date('YYYY-MM-DD') interprets as UTC midnight, which shifts in non-UTC timezones
    // Adding 'T00:00:00' forces local midnight interpretation
    const parseDateSafe = (dateStr: string | undefined | null): Date | undefined => {
      if (!dateStr) return undefined;
      // If already an ISO string with time, use as-is; otherwise append T00:00:00 for local midnight
      if (dateStr.includes('T')) return new Date(dateStr);
      return new Date(dateStr + 'T00:00:00');
    };

    const employee = await db.employee.update({
      where: { employeeId },
      data: {
        fullName: body.fullName?.trim(),
        mobile: body.mobile,
        email: body.email,
        firm: body.firm || body.department,
        location: body.location,
        salaryType,
        monthlySalary,
        dailyRate: body.dailyRate || Math.round(monthlySalary / daysInMonth),
        hourlyRate,
        overtimeRate,
        employmentType: body.employmentType,
        shiftStart: body.shiftStart,
        shiftEnd: body.shiftEnd,
        shiftHours: sh,
        designation: body.designation,
        gender: body.gender,
        dateOfBirth: parseDateSafe(body.dateOfBirth),
        joiningDate: parseDateSafe(body.joiningDate),
        relievingDate: parseDateSafe(body.relievingDate),
        department: body.firm || body.department,
        address: body.address,
        bankName: body.bankName,
        bankAccount: body.bankAccount,
        bankIfsc: body.bankIfsc,
        panNumber: body.panNumber,
        aadhaarNumber: body.aadhaarNumber,
        pfNumber: body.pfNumber,
        esiNumber: body.esiNumber,
        status: body.status,
        reportingManager: body.reportingManager,
        emergencyContact: body.emergencyContact,
      },
    });

    // ── Auto-regenerate current month's payroll if salary or shift changed ──
    // Prevents stale Payroll records that show OLD salary on the payslip
    // after an admin updates Employee.monthlySalary or Employee.shiftHours.
    // (This is the root cause of the Mukul/Ashish "galat payslip" bug —
    //  salaries were updated AFTER payroll was generated, so payslips kept
    //  showing the old salary until manual regeneration.)
    const salaryChanged = before?.monthlySalary !== monthlySalary;
    const shiftChanged = before?.shiftHours !== sh;
    if (salaryChanged || shiftChanged) {
      await regenerateCurrentMonthPayroll(employeeId);
    }

    return NextResponse.json(employee);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  try {
    const { employeeId } = await params;
    const { searchParams } = new URL(request.url);
    const hard = searchParams.get('hard') === 'true';

    if (hard) {
      // HARD DELETE: permanently remove the employee and all related records
      // Order matters due to foreign key constraints
      // 1. Delete overtime records (references attendance via id pattern, also direct employeeId)
      await db.overtime.deleteMany({ where: { employeeId } });
      // 2. Delete attendance records
      await db.attendance.deleteMany({ where: { employeeId } });
      // 3. Delete salary history
      await db.salaryHistory.deleteMany({ where: { employeeId } });
      // 4. Delete leaves
      await db.leave.deleteMany({ where: { employeeId } });
      // 5. Delete payrolls
      await db.payroll.deleteMany({ where: { employeeId } });
      // 6. Delete advances
      await db.advance.deleteMany({ where: { employeeId } });
      // 7. Delete notifications
      await db.notification.deleteMany({ where: { employeeId } });
      // 8. Finally, delete the employee
      await db.employee.delete({ where: { employeeId } });
      return NextResponse.json({ message: 'Employee permanently deleted' });
    }

    // SOFT DELETE (default): mark employee as inactive
    await db.employee.update({
      where: { employeeId },
      data: { status: 'inactive' },
    });
    return NextResponse.json({ message: 'Employee deactivated' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
