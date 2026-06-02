import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const FIRM_NAMES: Record<string, string> = {
  LAPL: 'LAXREE AMENITIES PVT LTD',
  LRSL: 'LAXREE ROOFING SOLUTION',
  SI: 'SMARTH INTERNATIONAL',
  SDF: 'SANGRAH DECOR & FURNITURE',
};

// ── Get firm code from employee ID prefix ──
function getFirmFromEmployeeId(employeeId: string): string {
  const id = employeeId.toUpperCase();
  if (id.startsWith('LAPL')) return 'LAPL';
  if (id.startsWith('LRSL')) return 'LRSL';
  if (id.startsWith('SI-') || id.startsWith('SI0')) return 'SI';
  if (id.startsWith('SDF')) return 'SDF';
  return ''; // fallback to existing firm field
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || '';
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }

    const employee = await db.employee.findUnique({
      where: { employeeId },
      select: {
        fullName: true,
        employeeId: true,
        firm: true,
        location: true,
        department: true,
        designation: true,
        shiftHours: true,
        employmentType: true,
        hourlyRate: true,
        monthlySalary: true,
        overtimeRate: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Get all attendance records for this employee in this month
    const attendance = await db.attendance.findMany({
      where: { employeeId, date: { gte: startDate, lt: endDate } },
      orderBy: { date: 'asc' },
    });

    // Get approved leaves
    const leaves = await db.leave.findMany({
      where: { employeeId, status: 'approved', startDate: { gte: startDate }, endDate: { lt: endDate } },
    });
    const leaveDays = leaves.reduce((sum, l) => sum + l.days, 0);
    // Paid leaves exclude unpaid/LOP types — used for absentDays calculation
    const paidLeaves = leaves.filter(l => l.type !== 'unpaid' && l.type !== 'UL' && l.type !== 'LOP').reduce((sum, l) => sum + l.days, 0);

    // Get holidays in this month
    const holidays = await db.holiday.findMany({
      where: { date: { gte: startDate, lt: endDate } },
    });
    const holidayDays = holidays.length;

    // Count Sundays
    let sundays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(year, month - 1, d).getDay() === 0) sundays++;
    }

    // Calculate summary
    const presentDays = attendance.filter(a => ['present', 'late', 'early-out'].includes(a.status)).length;
    const explicitAbsentDays = attendance.filter(a => a.status === 'absent').length;
    const halfDays = attendance.filter(a => a.status === 'half-day' || a.halfDay).length;
    const weeklyOffs = attendance.filter(a => a.isWeeklyOff || a.isSunday).length;
    // Only count holidays where the employee actually worked (totalHours > 0)
    const holidayAttendance = attendance.filter(a => a.isHoliday && a.totalHours > 0).length;

    // Effective present days (consistent with payroll calculation):
    // Includes half-days as 0.5 and holiday attendance + weekly off worked
    const weeklyOffWorked = attendance.filter(a => a.isWeeklyOff && a.totalHours > 0).length;
    const effectivePresentDays = presentDays + halfDays * 0.5 + holidayAttendance + weeklyOffWorked;

    const totalWorkHours = Math.round(attendance.reduce((sum, a) => sum + a.totalHours, 0) * 100) / 100;
    const totalOvertimeHours = Math.round(attendance.reduce((sum, a) => sum + a.overtimeHours, 0) * 100) / 100;
    const totalSundayHours = Math.round(attendance.reduce((sum, a) => sum + a.sundayHours, 0) * 100) / 100;
    const totalPHHours = Math.round(attendance.reduce((sum, a) => sum + a.phHours, 0) * 100) / 100;
    const lateEntries = attendance.filter(a => a.lateEntry).length;
    const earlyOuts = attendance.filter(a => a.earlyOut).length;

    // Working days in month = total days - sundays - holidays
    const totalWorkingDays = daysInMonth - sundays - holidayDays;

    // Total attendance = present + half days counted as 0.5
    const totalAttendance = presentDays + halfDays * 0.5;

    // Absent days = totalWorkingDays - effectivePresentDays - paidLeaves
    // (Unpaid/LOP leaves are NOT subtracted — they count as absent)
    const absentDays = Math.max(0, totalWorkingDays - effectivePresentDays - paidLeaves);

    // Determine firm from employee ID prefix (fallback to employee.firm)
    const firmFromId = getFirmFromEmployeeId(employeeId);
    const effectiveFirm = firmFromId || employee.firm;
    const firmFullName = FIRM_NAMES[effectiveFirm] || employee.firm;

    // Sundays earned: 1 per 6 full working days (for Full Time employees)
    const sundaysEarned = employee.employmentType === 'Full Time' || !employee.employmentType
      ? Math.floor(presentDays / 6)
      : 0;
    const sundayEarnedHours = Math.round(sundaysEarned * employee.shiftHours * 100) / 100;

    // Total hours including Sunday + PH
    const totalHrsInclSundayPH = Math.round((totalWorkHours + totalSundayHours + totalPHHours) * 100) / 100;

    // Leave breakdown
    const annualLeaves = leaves.filter(l => l.type === 'annual' || l.type === 'AL' || l.type === 'Casual' || l.type === 'CL').reduce((sum, l) => sum + l.days, 0);
    const unpaidLeaves = leaves.filter(l => l.type === 'unpaid' || l.type === 'UL' || l.type === 'LOP').reduce((sum, l) => sum + l.days, 0);

    // Get overtime records
    const overtimeRecords = await db.overtime.findMany({
      where: { employeeId, date: { gte: startDate, lt: endDate } },
    });
    const otHoursFromOT = Math.round(overtimeRecords.reduce((sum, o) => sum + o.hours, 0) * 100) / 100;

    // ─── LAXREE SALARY CALCULATION (consistent with payroll) ───
    // Per Day Rate = monthlySalary / daysInMonth
    // Hourly Rate = perDayRate / shiftHours
    // Base Salary = monthlySalary - (perDayRate × absentDays)
    // OT Amount = otHours × hourlyRate (1x normal rate, NOT 1.5x)
    const perDayRate = Math.round((employee.monthlySalary / daysInMonth) * 100) / 100;
    const calculatedHourlyRate = Math.round((perDayRate / employee.shiftHours) * 100) / 100;
    const calculatedBaseSalary = Math.round((employee.monthlySalary - (perDayRate * absentDays)) * 100) / 100;
    const calculatedOtAmount = Math.round(otHoursFromOT * calculatedHourlyRate * 100) / 100;
    const calculatedGrossSalary = Math.round((calculatedBaseSalary + calculatedOtAmount) * 100) / 100;

    return NextResponse.json({
      employee: {
        ...employee,
        firm: effectiveFirm,
        firmFullName,
        hourlyRate: calculatedHourlyRate,
      },
      month,
      year,
      monthName: new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'long' }),
      daysInMonth,
      totalWorkingDays,
      presentDays: effectivePresentDays,
      rawPresentDays: presentDays,
      absentDays,
      leaveDays,
      paidLeaves,
      annualLeaves,
      unpaidLeaves,
      halfDays,
      holidayDays,
      weeklyOffs,
      sundays,
      sundaysEarned,
      sundayEarnedHours,
      totalAttendance,
      totalWorkHours,
      totalOvertimeHours: otHoursFromOT || totalOvertimeHours,
      totalSundayHours,
      totalPHHours,
      totalHrsInclSundayPH,
      lateEntries,
      earlyOuts,
      records: attendance,
      leaves,
      // Salary calculation fields
      perDayRate,
      calculatedHourlyRate,
      calculatedBaseSalary,
      calculatedOtAmount,
      calculatedGrossSalary,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
