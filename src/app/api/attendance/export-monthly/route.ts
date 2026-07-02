import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSXStyle from 'xlsx-js-style';
import {
  getEffectiveCutoffDay,
  countSundaysUpTo,
  countHolidaysUpTo,
  filterAttendanceUpTo,
} from '@/lib/payroll-calc';

const FIRM_NAMES: Record<string, string> = {
  LAPL: 'LAXREE AMENITIES PVT LTD',
  LRSL: 'LAXREE ROOFING SOLUTION',
  SI: 'SMARTH INTERNATIONAL',
  SDF: 'SANGRAH DECOR & FURNITURE',
};

function getFirmFromEmployeeId(employeeId: string): string {
  const id = employeeId.toUpperCase();
  if (id.startsWith('LAPL')) return 'LAPL';
  if (id.startsWith('LRSL')) return 'LRSL';
  if (id.startsWith('SI-') || id.startsWith('SI0')) return 'SI';
  if (id.startsWith('SDF')) return 'SDF';
  return '';
}

function formatHours(decimal: number): string {
  if (!decimal || decimal === 0) return '0:00';
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  if (minutes >= 60) return `${hours + 1}:00`;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

// Format overtime in clear human-readable format (e.g., "7m", "1h 30m")
function formatOT(decimal: number): string {
  if (!decimal || decimal === 0) return '0m';
  const totalMinutes = Math.round(decimal * 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

// Format minutes directly to HH.MM string (e.g., 71 → "1.11", 325 → "5.25")
function formatMinutesToHHMM(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes === 0) return '0.00';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}.${String(minutes).padStart(2, '0')}`;
}

// Convert HH.MM numeric (e.g., 1.11 = 1h 11min) to total minutes
function hhmmToMinutes(val: number): number {
  const h = Math.floor(val);
  const m = Math.round((val - h) * 100); // extract minutes part from HH.MM
  return h * 60 + m;
}

// Count Sundays where employee actually worked (has present/late/early-out record)
function countSundaysEarned(attendance: any[]): number {
  return attendance.filter(a => a.isSunday && ['present', 'late', 'early-out', 'half-day', 'half_day'].includes(a.status)).length;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Color constants
const GOLD = 'D4A843';
const DARK = '1A1A1A';
const WHITE = 'FFFFFF';
const EMERALD = '059669';
const RED = 'DC2626';
const AMBER = 'D97706';
const CYAN = '0891B2';
const PURPLE = '7C3AED';
const SKY = '0284C7';
const LIGHT_BG = 'FFF8E7';
const LIGHT_GREEN = 'ECFDF5';
const LIGHT_RED = 'FEF2F2';
const LIGHT_AMBER = 'FFFBEB';
const DEEP_BLUE = '1E3A5F';
const TEAL = '0D9488';

const fullBorder = (color: string = 'B0B0B0', style: 'thin' | 'medium' = 'thin') => ({
  top: { style, color: { rgb: color } },
  bottom: { style, color: { rgb: color } },
  left: { style, color: { rgb: color } },
  right: { style, color: { rgb: color } },
});

const goldBorder = {
  top: { style: 'medium' as const, color: { rgb: GOLD } },
  bottom: { style: 'medium' as const, color: { rgb: GOLD } },
  left: { style: 'medium' as const, color: { rgb: GOLD } },
  right: { style: 'medium' as const, color: { rgb: GOLD } },
};

const styleHeader = (rgb: string = DARK) => ({
  font: { bold: true, color: { rgb: GOLD }, sz: 14 },
  fill: { fgColor: { rgb } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  border: goldBorder,
});

const styleSubHeader = (rgb: string = DEEP_BLUE) => ({
  font: { bold: true, color: { rgb: WHITE }, sz: 11 },
  fill: { fgColor: { rgb } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  border: fullBorder('FFFFFF', 'medium'),
});

const styleColHeader = (rgb: string = TEAL) => ({
  font: { bold: true, color: { rgb: WHITE }, sz: 9 },
  fill: { fgColor: { rgb } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
  border: fullBorder(WHITE, 'medium'),
});

const styleData = (bg?: string) => ({
  font: { sz: 10, color: { rgb: '333333' } },
  fill: bg ? { fgColor: { rgb: bg } } : undefined,
  alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  border: fullBorder('D0D0D0'),
});

const styleBold = (rgb: string = DARK, bg?: string) => ({
  font: { bold: true, color: { rgb }, sz: 10 },
  fill: bg ? { fgColor: { rgb: bg } } : undefined,
  alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  border: fullBorder('D0D0D0'),
});

const safeStyle = (ws: any, cellRef: string, style: any) => {
  if (ws[cellRef]) ws[cellRef].s = style;
};

// Style for label-value pair rows (like "Employee Name: | Khushboo | | Employee Code: | EMP-007")
const styleLabelCell = { font: { bold: true, sz: 10, color: { rgb: 'AAAAAA' } }, fill: { fgColor: { rgb: '2D2D2D' } }, alignment: { horizontal: 'right' as const, vertical: 'center' as const } };
const styleValueCell = { font: { bold: true, sz: 10, color: { rgb: WHITE } }, fill: { fgColor: { rgb: '2D2D2D' } }, alignment: { horizontal: 'left' as const, vertical: 'center' as const } };

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
        fullName: true, employeeId: true, firm: true, location: true,
        department: true, designation: true, shiftHours: true,
        employmentType: true, hourlyRate: true, monthlySalary: true, overtimeRate: true,
        relievingDate: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    const attendance = await db.attendance.findMany({
      where: { employeeId, date: { gte: startDate, lt: endDate } },
      orderBy: { date: 'asc' },
    });

    const leaves = await db.leave.findMany({
      where: { employeeId, status: 'approved', startDate: { gte: startDate }, endDate: { lt: endDate } },
    });

    const holidays = await db.holiday.findMany({ where: { date: { gte: startDate, lt: endDate } } });

    // ── Effective cutoff day: caps future days and post-relieving days ──
    const cutoffDay = getEffectiveCutoffDay(year, month, daysInMonth, employee.relievingDate);
    const elapsedHolidays = countHolidaysUpTo(holidays, cutoffDay);
    const holidayDays = elapsedHolidays;
    // Sundays only up to cutoff day
    const sundays = countSundaysUpTo(year, month, cutoffDay);
    // Filter attendance defensively
    const effectiveAttendance = filterAttendanceUpTo(attendance, year, month, cutoffDay);

    const rawPresentDays = effectiveAttendance.filter(a => ['present', 'late', 'early-out'].includes(a.status)).length;
    const halfDays = effectiveAttendance.filter(a => a.status === 'half-day' || a.halfDay).length;
    const presentDays = rawPresentDays;
    const shiftMinutes = Math.round(employee.shiftHours * 60);
    let totalBaseHours = 0;
    let effectivePresentDays = 0;
    for (const a of effectiveAttendance) {
      if (['present', 'late', 'early-out', 'half-day', 'half_day'].includes(a.status)) {
        const baseHrs = Math.max(0, (a.totalHours || 0) - (a.overtimeHours || 0));
        totalBaseHours += baseHrs;
        if (a.status === 'half-day' || a.status === 'half_day') {
          effectivePresentDays += 0.5;
        } else {
          effectivePresentDays += Math.min(1, baseHrs / employee.shiftHours);
        }
      }
    }
    effectivePresentDays = Math.round(effectivePresentDays * 100) / 100;
    // Working days = cutoffDay - sundays - elapsedHolidays (caps future days)
    const totalWorkingDays = Math.max(0, cutoffDay - sundays - elapsedHolidays);

    const holidayDateStrs = new Set(
      holidays.map(h => {
        const hd = new Date(h.date);
        return `${hd.getFullYear()}-${String(hd.getMonth() + 1).padStart(2, '0')}-${String(hd.getDate()).padStart(2, '0')}`;
      })
    );
    const presentDateStrs = new Set();
    for (const a of effectiveAttendance) {
      if (['present', 'late', 'early-out', 'half-day'].includes(a.status)) {
        const ad = new Date(a.date);
        presentDateStrs.add(`${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}`);
      }
    }
    let effectivePaidLeaves = 0;
    let effectiveUnpaidLeaves = 0;
    const cutoffDate = new Date(year, month - 1, cutoffDay);
    for (const leave of leaves) {
      const isUnpaid = leave.type === 'unpaid' || leave.type === 'UL' || leave.type === 'LOP';
      let d = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      // Cap leave iteration at cutoff day — don't count future leave days
      const effectiveEnd = end > cutoffDate ? cutoffDate : end;
      while (d <= effectiveEnd) {
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
    const absentDays = Math.max(0, totalWorkingDays - presentDays - halfDays - effectivePaidLeaves - effectiveUnpaidLeaves);

    const firmFromId = getFirmFromEmployeeId(employeeId);
    const effectiveFirm = firmFromId || employee.firm;
    const firmFullName = FIRM_NAMES[effectiveFirm] || employee.firm;
    const monthName = MONTHS[month - 1];

    // Computed totals
    let totalWorkMinutes = 0;
    let totalSundayMinutes = 0;

    for (const a of effectiveAttendance) {
      if (a.checkIn && a.checkOut) {
        const [h1, m1] = a.checkIn.split(':').map(Number);
        const [h2, m2] = a.checkOut.split(':').map(Number);
        const workMin = Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
        totalWorkMinutes += workMin;
      }
      if (a.sundayHours > 0) {
        totalSundayMinutes += hhmmToMinutes(a.sundayHours);
      }

    }

    const totalWorkHours = formatMinutesToHHMM(totalWorkMinutes);
    const totalOvertimeHoursDecimal = Math.round(effectiveAttendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0) * 100) / 100;
    const totalOvertimeHours = formatOT(totalOvertimeHoursDecimal);
    const totalSundayHours = formatMinutesToHHMM(totalSundayMinutes);

    const lateEntries = effectiveAttendance.filter(a => a.lateEntry).length;
    const earlyOuts = effectiveAttendance.filter(a => a.earlyOut).length;
    const weeklyOffs = effectiveAttendance.filter(a => a.isWeeklyOff || a.isSunday).length;
    const annualLeaves = effectivePaidLeaves;
    const unpaidLeaves = effectiveUnpaidLeaves;
    const sundaysEarned = countSundaysEarned(attendance);
    const totalHrsInclSunday = formatMinutesToHHMM(totalWorkMinutes + totalSundayMinutes);

    // ─── Salary Calculation (matching Excel Payroll Master) ───
    const salaryHourlyRate = employee.monthlySalary / (daysInMonth * employee.shiftHours);
    const salaryPerDayRate = employee.monthlySalary / daysInMonth;
    const salarySundayHrs = sundays * employee.shiftHours;
    const salaryPaidLeaveHrs = effectivePaidLeaves * employee.shiftHours;
    const salaryTotalHrs = totalBaseHours + salarySundayHrs + totalOvertimeHoursDecimal + salaryPaidLeaveHrs;
    const salaryBaseSalary = salaryHourlyRate * totalBaseHours;
    const salarySundayEarnings = salaryHourlyRate * salarySundayHrs;
    const salaryOtAmount = totalOvertimeHoursDecimal * salaryHourlyRate;
    const salaryGrossSalary = salaryHourlyRate * salaryTotalHrs;

    const wb = XLSXStyle.utils.book_new();

    // ═══════════════════════════════════════════════════════════════════
    // SHEET 1: Attendance Register (Matching Khushboo May 2026 format)
    // ═══════════════════════════════════════════════════════════════════
    // Layout:
    // Row 1: Company Name (merged across all 12 cols)
    // Row 2: "MONTHLY ATTENDANCE REGISTER" (merged)
    // Row 3: empty
    // Row 4: Employee Name: | name | | Employee Code: | code | | Month: | May 2026 | | Company: | firm
    // Row 5: Designation: | desig | | Department: | dept | | Location: | loc | | Shift Hrs: | hrs
    // Row 6: Generated: | datetime
    // Row 7: empty
    // Row 8: Summary header (11 cols): DAYS PRESENT | DAYS ABSENT | HALF DAYS | AL | UL | PH | TOTAL HRS WORKED | OT HRS | SUNDAYS EARNED | SUNDAY HRS | TOTAL HRS (INCL. S+PH)
    // Row 9: Summary data (11 cols)
    // Row 10: Additional header (7 cols): WORKING DAYS | WEEKLY OFFS | SUNDAYS | LATE ENTRIES | EARLY OUTS | PH HOURS | SHIFT HRS
    // Row 11: Additional data (7 cols)
    // Row 12: empty
    // Row 13: Daily register header (12 cols): S.No | Date | Day | Check In | Check Out | Total Hrs | Status | OT Hrs | Sunday Hrs | PH Hrs | Late | Early Out
    // Row 14+: Daily data rows

    const regData: any[][] = [
      [firmFullName],                                                                                             // R1
      ['MONTHLY ATTENDANCE REGISTER'],                                                                            // R2
      [],                                                                                                          // R3
      ['Employee Name:', employee.fullName, '', 'Employee Code:', employee.employeeId, '', 'Month:', `${monthName} ${year}`, '', 'Company:', firmFullName], // R4
      ['Designation:', employee.designation || 'N/A', '', 'Department:', employee.department || 'N/A', '', 'Location:', employee.location || 'N/A', '', 'Shift Hrs:', `${formatHours(employee.shiftHours)} hrs`], // R5
      ['Generated:', new Date().toLocaleString('en-IN')],                                                         // R6
      [],                                                                                                          // R7
      // Row 8: Attendance overview header
      ['DAYS PRESENT', 'DAYS ABSENT', 'HALF DAYS', 'AL', 'UL', 'TOTAL HRS WORKED', 'OT HRS', 'SUNDAYS EARNED', 'SUNDAY HRS', 'TOTAL HRS (INCL. SUNDAY)'],
      // Row 9: Attendance overview data
      [presentDays, absentDays, halfDays, annualLeaves, unpaidLeaves, totalWorkHours, totalOvertimeHours, sundaysEarned, totalSundayHours, totalHrsInclSunday],
      // Row 10: Additional info header
      ['WORKING DAYS', 'WEEKLY OFFS', 'SUNDAYS', 'LATE ENTRIES', 'EARLY OUTS', 'SHIFT HRS'],
      // Row 11: Additional info data
      [totalWorkingDays, weeklyOffs, sundays, lateEntries, earlyOuts, `${formatMinutesToHHMM(shiftMinutes)}h`],
      [],                                                                                                          // R12
      // Row 13: Daily register header (11 columns)
      ['S.No', 'Date', 'Day', 'Check In', 'Check Out', 'Total Hrs', 'Status', 'OT Hrs', 'Sunday Hrs', 'Late', 'Early Out'],
    ];

    const ws1 = XLSXStyle.utils.aoa_to_sheet(regData);

    // Style Row 1: Company name (gold on dark, merged)
    const cols12 = ['A','B','C','D','E','F','G','H','I','J','K','L'];
    cols12.forEach(c => { safeStyle(ws1, `${c}1`, styleHeader()); });
    // Style Row 2: Sub header
    cols12.forEach(c => { safeStyle(ws1, `${c}2`, styleSubHeader('2D2D2D')); });
    // Row 3: empty (dark bg)
    cols12.forEach(c => { safeStyle(ws1, `${c}3`, { fill: { fgColor: { rgb: '2D2D2D' } } }); });

    // Style Row 4: Employee Name / Code / Month / Company (label-value pairs)
    ['A','C','F','I'].forEach(c => { safeStyle(ws1, `${c}4`, styleLabelCell); });
    ['B','E','H','K'].forEach(c => { safeStyle(ws1, `${c}4`, styleValueCell); });
    // Fill remaining cells in R4 with dark bg
    ['D','G','J','L'].forEach(c => { safeStyle(ws1, `${c}4`, { fill: { fgColor: { rgb: '2D2D2D' } } }); });

    // Style Row 5: Designation / Department / Location / Shift Hrs
    ['A','C','F','I'].forEach(c => { safeStyle(ws1, `${c}5`, styleLabelCell); });
    ['B','E','H','K'].forEach(c => { safeStyle(ws1, `${c}5`, styleValueCell); });
    ['D','G','J','L'].forEach(c => { safeStyle(ws1, `${c}5`, { fill: { fgColor: { rgb: '2D2D2D' } } }); });

    // Style Row 6: Generated
    safeStyle(ws1, 'A6', styleLabelCell);
    safeStyle(ws1, 'B6', { font: { sz: 9, color: { rgb: '888888' } }, fill: { fgColor: { rgb: '2D2D2D' } }, alignment: { horizontal: 'left' as const, vertical: 'center' as const } });
    ['C','D','E','F','G','H','I','J','K','L'].forEach(c => { safeStyle(ws1, `${c}6`, { fill: { fgColor: { rgb: '2D2D2D' } } }); });

    // Row 7: empty
    cols12.forEach(c => { safeStyle(ws1, `${c}7`, { fill: { fgColor: { rgb: '2D2D2D' } } }); });

    // Style Row 8: Attendance overview header (EMERALD green)
    const cols10 = ['A','B','C','D','E','F','G','H','I','J'];
    cols10.forEach(c => { safeStyle(ws1, `${c}8`, styleColHeader(EMERALD)); });
    safeStyle(ws1, 'K8', { fill: { fgColor: { rgb: '1A1A1A' } } });

    // Style Row 9: Attendance overview data — color-coded
    safeStyle(ws1, 'A9', styleBold(EMERALD, LIGHT_GREEN));    // Days Present
    safeStyle(ws1, 'B9', styleBold(RED, LIGHT_RED));           // Days Absent
    safeStyle(ws1, 'C9', styleBold(AMBER, LIGHT_AMBER));       // Half Days
    safeStyle(ws1, 'D9', styleBold(SKY, 'EFF6FF'));            // AL
    safeStyle(ws1, 'E9', styleBold(AMBER, LIGHT_AMBER));       // UL
    safeStyle(ws1, 'F9', styleBold(CYAN, LIGHT_BG));           // Total Hrs Worked
    safeStyle(ws1, 'G9', styleBold(AMBER, LIGHT_AMBER));       // OT Hrs
    safeStyle(ws1, 'H9', styleBold(EMERALD, LIGHT_GREEN));     // Sundays Earned
    safeStyle(ws1, 'I9', styleBold(SKY, 'EFF6FF'));            // Sunday Hrs
    safeStyle(ws1, 'J9', styleBold(GOLD, LIGHT_BG));           // Total Hrs (incl. Sunday)
    safeStyle(ws1, 'K9', { fill: { fgColor: { rgb: '1A1A1A' } } });

    // Style Row 10: Additional info header (dark style)
    const cols6 = ['A','B','C','D','E','F'];
    cols6.forEach(c => { safeStyle(ws1, `${c}10`, styleColHeader('2D2D2D')); });

    // Style Row 11: Additional info data
    safeStyle(ws1, 'A11', styleBold(EMERALD));     // Working Days
    safeStyle(ws1, 'B11', styleBold(SKY));          // Weekly Offs
    safeStyle(ws1, 'C11', styleBold(SKY));          // Sundays
    safeStyle(ws1, 'D11', styleBold(AMBER));        // Late Entries
    safeStyle(ws1, 'E11', styleBold(RED));          // Early Outs
    safeStyle(ws1, 'F11', styleBold(CYAN));         // Shift Hrs

    // Row 12: empty
    cols12.forEach(c => { safeStyle(ws1, `${c}12`, { fill: { fgColor: { rgb: '2D2D2D' } } }); });

    // Style Row 13: Daily register header (TEAL)
    const cols11 = ['A','B','C','D','E','F','G','H','I','J','K'];
    cols11.forEach(c => { safeStyle(ws1, `${c}13`, styleColHeader(TEAL)); });

    // ── Daily data rows ──
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let dailyStartRow = 14;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dateObj = new Date(dateStr + 'T00:00:00');
      const dayName = dayNames[dateObj.getDay()];
      const isSunday = dateObj.getDay() === 0;

      const rec = attendance.find((r: any) => {
        const rDate = new Date(r.date);
        return rDate.getFullYear() === year && rDate.getMonth() + 1 === month && rDate.getDate() === day;
      });

      const row = dailyStartRow + day - 1;

      if (rec) {
        let dayTotalHrs = '-';
        let dayOTHrs = '0.00';
        let daySundayHrs = '0.00';
        if (rec.checkIn && rec.checkOut) {
          const [h1, m1] = rec.checkIn.split(':').map(Number);
          const [h2, m2] = rec.checkOut.split(':').map(Number);
          const workMin = Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
          dayTotalHrs = formatMinutesToHHMM(workMin);
          dayOTHrs = rec.overtimeHours > 0 ? formatOT(rec.overtimeHours) : '0m';
        }
        if (rec.sundayHours > 0) {
          daySundayHrs = formatHours(rec.sundayHours);
        }

        XLSXStyle.utils.sheet_add_aoa(ws1, [[
          day,
          dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          dayName,
          rec.checkIn || '-',
          rec.checkOut || '-',
          dayTotalHrs,
          rec.status.charAt(0).toUpperCase() + rec.status.slice(1).replace('-', ' '),
          dayOTHrs,
          daySundayHrs,
          rec.lateEntry ? 'Yes' : '',
          rec.earlyOut ? 'Yes' : '',
        ]], { origin: `A${row}` });
      } else {
        XLSXStyle.utils.sheet_add_aoa(ws1, [[
          day,
          dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          dayName,
          '-', '-', isSunday ? '0.00' : '-',
          isSunday ? 'Weekly Off' : 'No Record',
          '0.00', '0.00', '', '',
        ]], { origin: `A${row}` });
      }

      // Style daily rows
      const bg = (day - 1) % 2 === 0 ? LIGHT_BG : undefined;
      cols12.forEach(c => {
        const cell = ws1[`${c}${row}`];
        if (cell) {
          if (c === 'G') {
            const status = String(cell.v || '');
            if (status === 'Present') cell.s = styleBold(EMERALD, LIGHT_GREEN);
            else if (status === 'Absent') cell.s = styleBold(RED, LIGHT_RED);
            else if (status === 'Late') cell.s = styleBold(AMBER, LIGHT_AMBER);
            else if (status === 'Early out' || status === 'Early Out') cell.s = styleBold('E11D48', LIGHT_RED);
            else if (status === 'Half Day') cell.s = styleBold(AMBER, LIGHT_AMBER);
            else if (status === 'Weekly Off') cell.s = styleBold(SKY, 'EFF6FF');
            else if (status === 'Holiday') cell.s = styleBold(PURPLE, 'F5F3FF');
            else cell.s = styleData(bg);
          } else if (c === 'C') {
            const dayVal = String(cell.v || '');
            if (dayVal === 'Sunday') cell.s = styleBold(SKY, 'EFF6FF');
            else cell.s = styleData(bg);
          } else if (c === 'J') {
            if (String(cell.v) === 'Yes') cell.s = styleBold(AMBER, LIGHT_AMBER);
            else cell.s = styleData(bg);
          } else if (c === 'K') {
            if (String(cell.v) === 'Yes') cell.s = styleBold('E11D48', LIGHT_RED);
            else cell.s = styleData(bg);
          } else {
            cell.s = styleData(bg);
          }
        }
      });
    }

    ws1['!cols'] = [
      { wch: 6 },   // A: S.No
      { wch: 16 },  // B: Date
      { wch: 12 },  // C: Day
      { wch: 10 },  // D: Check In
      { wch: 10 },  // E: Check Out
      { wch: 10 },  // F: Total Hrs
      { wch: 14 },  // G: Status
      { wch: 10 },  // H: OT Hrs
      { wch: 12 },  // I: Sunday Hrs
      { wch: 8 },   // J: Late
      { wch: 10 },  // K: Early Out
    ];
    ws1['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },  // R1: Company name
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },  // R2: Sub header
    ];

    XLSXStyle.utils.book_append_sheet(wb, ws1, 'Attendance Register');

    // ═══════════════════════════════════════════════════════════════════
    // SHEET 2: Summary (Matching Khushboo May 2026 format - Dashboard style)
    // ═══════════════════════════════════════════════════════════════════
    // Layout:
    // R1: Company Name (merged across all 12 cols)
    // R2: "ATTENDANCE SUMMARY DASHBOARD" (merged)
    // R3: empty
    // R4: Employee Name: | name | | Employee Code: | code | | Month: | May 2026 | | Company: | firm
    // R5: Designation: | desig | | Department: | dept | | Location: | loc | | Shift Hrs: | hrs
    // R6: empty
    // R7: "ATTENDANCE OVERVIEW" section header
    // R8: DAYS PRESENT: 16 | | DAYS ABSENT: 8 | | HALF DAYS: 0 | | AL: 0
    // R9: UL: 0 | | PH: 0 | | WORKING DAYS: 26 | | WEEKLY OFFS: 0
    // R10: SUNDAYS: 5 | | SUNDAYS EARNED: 2 | | LATE ENTRIES: 2 | | EARLY OUTS: 1
    // R11: empty
    // R12: "HOURS OVERVIEW" section header
    // R13: TOTAL HRS WORKED: 144.00 | | OT HRS: 0.38 | | SUNDAY HRS: 0.00 | | PH HOURS: 0.00h
    // R14: TOTAL HRS (INCL. S+PH): 144.00 | | SHIFT HRS: 9.00h
    // R15: empty

    const summaryData: any[][] = [
      [firmFullName],                                                                                             // R1
      ['ATTENDANCE SUMMARY DASHBOARD'],                                                                           // R2
      [],                                                                                                          // R3
      ['Employee Name:', employee.fullName, '', 'Employee Code:', employee.employeeId, '', 'Month:', `${monthName} ${year}`, '', 'Company:', firmFullName, ''], // R4
      ['Designation:', employee.designation || 'N/A', '', 'Department:', employee.department || 'N/A', '', 'Location:', employee.location || 'N/A', '', 'Shift Hrs:', `${formatHours(employee.shiftHours)} hrs`, ''], // R5
      [],                                                                                                          // R6
      ['ATTENDANCE OVERVIEW'],                                                                                     // R7
      ['DAYS PRESENT', presentDays, '', 'DAYS ABSENT', absentDays, '', 'HALF DAYS', halfDays, '', 'AL', annualLeaves],  // R8
      ['UL', unpaidLeaves, '', 'WORKING DAYS', totalWorkingDays, '', 'WEEKLY OFFS', weeklyOffs, '', 'SUNDAYS EARNED', sundaysEarned], // R9
      ['SUNDAYS', sundays, '', 'LATE ENTRIES', lateEntries, '', 'EARLY OUTS', earlyOuts, '', '', ''], // R10
      [],                                                                                                          // R11
      ['HOURS OVERVIEW'],                                                                                          // R12
      ['TOTAL HRS WORKED', totalWorkHours, '', 'OT HRS', totalOvertimeHours, '', 'SUNDAY HRS', totalSundayHours, '', '', ''],  // R13
      ['TOTAL HRS (INCL. SUNDAY)', totalHrsInclSunday, '', 'SHIFT HRS', `${formatMinutesToHHMM(shiftMinutes)}h`],  // R14
      [],                                                                                                          // R15
    ];

    const ws2 = XLSXStyle.utils.aoa_to_sheet(summaryData);

    // Style R1: Company name (gold on dark)
    cols12.forEach(c => { safeStyle(ws2, `${c}1`, styleHeader()); });
    // Style R2: Sub header
    cols12.forEach(c => { safeStyle(ws2, `${c}2`, styleSubHeader('2D2D2D')); });
    // R3: empty
    cols12.forEach(c => { safeStyle(ws2, `${c}3`, { fill: { fgColor: { rgb: '2D2D2D' } } }); });

    // Style R4: Employee Name / Code / Month / Company
    ['A','D','G','J'].forEach(c => { safeStyle(ws2, `${c}4`, styleLabelCell); });
    ['B','E','H','K'].forEach(c => { safeStyle(ws2, `${c}4`, styleValueCell); });
    ['C','F','I','L'].forEach(c => { safeStyle(ws2, `${c}4`, { fill: { fgColor: { rgb: '2D2D2D' } } }); });

    // Style R5: Designation / Department / Location / Shift Hrs
    ['A','D','G','J'].forEach(c => { safeStyle(ws2, `${c}5`, styleLabelCell); });
    ['B','E','H','K'].forEach(c => { safeStyle(ws2, `${c}5`, styleValueCell); });
    ['C','F','I','L'].forEach(c => { safeStyle(ws2, `${c}5`, { fill: { fgColor: { rgb: '2D2D2D' } } }); });

    // R6: empty
    cols12.forEach(c => { safeStyle(ws2, `${c}6`, { fill: { fgColor: { rgb: '2D2D2D' } } }); });

    // R7: "ATTENDANCE OVERVIEW" section header (EMERALD green)
    cols12.forEach(c => { safeStyle(ws2, `${c}7`, styleColHeader(EMERALD)); });

    // R8: DAYS PRESENT | DAYS ABSENT | HALF DAYS | AL (label-value pairs)
    const styleSectionLabel = { font: { bold: true, sz: 9, color: { rgb: '888888' } }, fill: { fgColor: { rgb: '2D2D2D' } }, alignment: { horizontal: 'center' as const, vertical: 'center' as const }, border: fullBorder('444444') };
    const styleSectionValueGreen = { font: { bold: true, sz: 12, color: { rgb: EMERALD } }, fill: { fgColor: { rgb: '2D2D2D' } }, alignment: { horizontal: 'center' as const, vertical: 'center' as const }, border: fullBorder('444444') };
    const styleSectionValueRed = { font: { bold: true, sz: 12, color: { rgb: RED } }, fill: { fgColor: { rgb: '2D2D2D' } }, alignment: { horizontal: 'center' as const, vertical: 'center' as const }, border: fullBorder('444444') };
    const styleSectionValueAmber = { font: { bold: true, sz: 12, color: { rgb: AMBER } }, fill: { fgColor: { rgb: '2D2D2D' } }, alignment: { horizontal: 'center' as const, vertical: 'center' as const }, border: fullBorder('444444') };
    const styleSectionValueSky = { font: { bold: true, sz: 12, color: { rgb: SKY } }, fill: { fgColor: { rgb: '2D2D2D' } }, alignment: { horizontal: 'center' as const, vertical: 'center' as const }, border: fullBorder('444444') };
    const styleSectionValuePurple = { font: { bold: true, sz: 12, color: { rgb: PURPLE } }, fill: { fgColor: { rgb: '2D2D2D' } }, alignment: { horizontal: 'center' as const, vertical: 'center' as const }, border: fullBorder('444444') };
    const styleSectionValueCyan = { font: { bold: true, sz: 12, color: { rgb: CYAN } }, fill: { fgColor: { rgb: '2D2D2D' } }, alignment: { horizontal: 'center' as const, vertical: 'center' as const }, border: fullBorder('444444') };
    const styleSectionValueGold = { font: { bold: true, sz: 12, color: { rgb: GOLD } }, fill: { fgColor: { rgb: '2D2D2D' } }, alignment: { horizontal: 'center' as const, vertical: 'center' as const }, border: fullBorder('444444') };
    const styleEmpty = { fill: { fgColor: { rgb: '2D2D2D' } } };

    // R8: DAYS PRESENT (green) | DAYS ABSENT (red) | HALF DAYS (amber) | AL (sky)
    safeStyle(ws2, 'A8', styleSectionLabel);
    safeStyle(ws2, 'B8', styleSectionValueGreen);
    safeStyle(ws2, 'C8', styleEmpty);
    safeStyle(ws2, 'D8', styleSectionLabel);
    safeStyle(ws2, 'E8', styleSectionValueRed);
    safeStyle(ws2, 'F8', styleEmpty);
    safeStyle(ws2, 'G8', styleSectionLabel);
    safeStyle(ws2, 'H8', styleSectionValueAmber);
    safeStyle(ws2, 'I8', styleEmpty);
    safeStyle(ws2, 'J8', styleSectionLabel);
    safeStyle(ws2, 'K8', styleSectionValueSky);
    safeStyle(ws2, 'L8', styleEmpty);

    // R9: UL (amber) | WORKING DAYS (emerald) | WEEKLY OFFS (sky) | SUNDAYS EARNED (emerald)
    safeStyle(ws2, 'A9', styleSectionLabel);
    safeStyle(ws2, 'B9', styleSectionValueAmber);
    safeStyle(ws2, 'C9', styleEmpty);
    safeStyle(ws2, 'D9', styleSectionLabel);
    safeStyle(ws2, 'E9', styleSectionValueGreen);
    safeStyle(ws2, 'F9', styleEmpty);
    safeStyle(ws2, 'G9', styleSectionLabel);
    safeStyle(ws2, 'H9', styleSectionValueSky);
    safeStyle(ws2, 'I9', styleEmpty);
    safeStyle(ws2, 'J9', styleSectionLabel);
    safeStyle(ws2, 'K9', styleSectionValueGreen);
    safeStyle(ws2, 'L9', styleEmpty);

    // R10: SUNDAYS (sky) | LATE ENTRIES (amber) | EARLY OUTS (red) | (empty)
    safeStyle(ws2, 'A10', styleSectionLabel);
    safeStyle(ws2, 'B10', styleSectionValueSky);
    safeStyle(ws2, 'C10', styleEmpty);
    safeStyle(ws2, 'D10', styleSectionLabel);
    safeStyle(ws2, 'E10', styleSectionValueAmber);
    safeStyle(ws2, 'F10', styleEmpty);
    safeStyle(ws2, 'G10', styleSectionLabel);
    safeStyle(ws2, 'H10', styleSectionValueRed);
    safeStyle(ws2, 'I10', styleEmpty);
    safeStyle(ws2, 'J10', styleEmpty);
    safeStyle(ws2, 'K10', styleEmpty);
    safeStyle(ws2, 'L10', styleEmpty);

    // R11: empty
    cols12.forEach(c => { safeStyle(ws2, `${c}11`, styleEmpty); });

    // R12: "HOURS OVERVIEW" section header (DEEP_BLUE)
    cols12.forEach(c => { safeStyle(ws2, `${c}12`, styleColHeader(DEEP_BLUE)); });

    // R13: TOTAL HRS WORKED (cyan) | OT HRS (amber) | SUNDAY HRS (sky) | (empty)
    safeStyle(ws2, 'A13', styleSectionLabel);
    safeStyle(ws2, 'B13', styleSectionValueCyan);
    safeStyle(ws2, 'C13', styleEmpty);
    safeStyle(ws2, 'D13', styleSectionLabel);
    safeStyle(ws2, 'E13', styleSectionValueAmber);
    safeStyle(ws2, 'F13', styleEmpty);
    safeStyle(ws2, 'G13', styleSectionLabel);
    safeStyle(ws2, 'H13', styleSectionValueSky);
    safeStyle(ws2, 'I13', styleEmpty);
    safeStyle(ws2, 'J13', styleEmpty);
    safeStyle(ws2, 'K13', styleEmpty);
    safeStyle(ws2, 'L13', styleEmpty);

    // R14: TOTAL HRS (INCL. SUNDAY) (gold) | SHIFT HRS (cyan)
    safeStyle(ws2, 'A14', styleSectionLabel);
    safeStyle(ws2, 'B14', styleSectionValueGold);
    safeStyle(ws2, 'C14', styleEmpty);
    safeStyle(ws2, 'D14', styleSectionLabel);
    safeStyle(ws2, 'E14', styleSectionValueCyan);
    ['F','G','H','I','J','K','L'].forEach(c => { safeStyle(ws2, `${c}14`, styleEmpty); });

    // R15: empty
    cols12.forEach(c => { safeStyle(ws2, `${c}15`, styleEmpty); });

    ws2['!cols'] = [
      { wch: 22 },  // A: Label
      { wch: 12 },  // B: Value
      { wch: 3 },   // C: spacer
      { wch: 18 },  // D: Label
      { wch: 12 },  // E: Value
      { wch: 3 },   // F: spacer
      { wch: 18 },  // G: Label
      { wch: 12 },  // H: Value
      { wch: 3 },   // I: spacer
      { wch: 16 },  // J: Label
      { wch: 12 },  // K: Value
      { wch: 3 },   // L: spacer
    ];
    ws2['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },  // R1
      { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },  // R2
      { s: { r: 6, c: 0 }, e: { r: 6, c: 11 } },  // R7: ATTENDANCE OVERVIEW
      { s: { r: 11, c: 0 }, e: { r: 11, c: 11 } }, // R12: HOURS OVERVIEW
    ];

    XLSXStyle.utils.book_append_sheet(wb, ws2, 'Summary');

    // ═══════════════════════════════════════════════════════════════════
    // SHEET 3: Salary Calculation (matching Excel Payroll Master)
    // ═══════════════════════════════════════════════════════════════════
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const salaryData: any[][] = [
      [firmFullName],
      ['SALARY CALCULATION SHEET'],
      [`Employee Name:`, employee.fullName, '', 'Employee Code:', employee.employeeId, '', `Month: ${monthName} ${year}`],
      [`Monthly Salary: ₹${employee.monthlySalary.toLocaleString('en-IN')}`, '', '', `Days in Month: ${daysInMonth}`, '', '', `Shift Hrs: ${employee.shiftHours}`],
      [],
      ['Component', 'Hours / Days', 'Rate (₹)', 'Amount (₹)'],
      ['Total Worked Hrs (Base)', round2(totalBaseHours), round2(salaryHourlyRate), round2(salaryBaseSalary)],
      ['OT Hours', totalOvertimeHoursDecimal, round2(salaryHourlyRate), round2(salaryOtAmount)],
      ['Sunday Hours (Paid Off)', salarySundayHrs, round2(salaryHourlyRate), round2(salarySundayEarnings)],
      ['Paid Leave Hours', salaryPaidLeaveHrs, round2(salaryHourlyRate), round2(salaryHourlyRate * salaryPaidLeaveHrs)],
      ['Total Hours', round2(salaryTotalHrs), round2(salaryHourlyRate), round2(salaryGrossSalary)],
      [],
      ['Summary', '', '', ''],
      ['Hourly Rate', '', '', `₹${round2(salaryHourlyRate)}`],
      ['Per Day Rate', '', '', `₹${round2(salaryPerDayRate)}`],
      ['Gross Salary', '', '', `₹${round2(salaryGrossSalary).toLocaleString('en-IN')}`],
      ['Sundays Earned', `${sundays} × ${employee.shiftHours} = ${salarySundayHrs}h`, '', `₹${round2(salarySundayEarnings).toLocaleString('en-IN')}`],
      ['Effective Present Days', effectivePresentDays, '', ''],
    ];

    const ws3 = XLSXStyle.utils.aoa_to_sheet(salaryData);
    const cols4 = ['A','B','C','D','E','F','G'];
    cols4.forEach(c => { safeStyle(ws3, `${c}1`, styleHeader()); });
    cols4.forEach(c => { safeStyle(ws3, `${c}2`, styleSubHeader('2D2D2D')); });
    // R3: Employee info with label-value style
    safeStyle(ws3, 'A3', styleLabelCell);
    safeStyle(ws3, 'B3', styleValueCell);
    safeStyle(ws3, 'D3', styleLabelCell);
    safeStyle(ws3, 'E3', styleValueCell);
    safeStyle(ws3, 'G3', { font: { sz: 10, color: { rgb: 'CCCCCC' } }, fill: { fgColor: { rgb: '2D2D2D' } } });
    ['C','F'].forEach(c => { safeStyle(ws3, `${c}3`, { fill: { fgColor: { rgb: '2D2D2D' } } }); });

    safeStyle(ws3, 'A4', { font: { sz: 10, color: { rgb: 'CCCCCC' } }, fill: { fgColor: { rgb: '2D2D2D' } } });
    safeStyle(ws3, 'D4', { font: { sz: 10, color: { rgb: 'CCCCCC' } }, fill: { fgColor: { rgb: '2D2D2D' } } });
    safeStyle(ws3, 'G4', { font: { sz: 10, color: { rgb: 'CCCCCC' } }, fill: { fgColor: { rgb: '2D2D2D' } } });

    cols4.forEach(c => { safeStyle(ws3, `${c}6`, styleColHeader(EMERALD)); });
    for (let r = 7; r <= 11; r++) {
      const isTotal = r === 11;
      const bg = isTotal ? 'F0FDF4' : (r % 2 === 0 ? LIGHT_BG : undefined);
      cols4.forEach(c => {
        safeStyle(ws3, `${c}${r}`, {
          font: { sz: 10, bold: isTotal, color: { rgb: isTotal ? EMERALD : '333333' } },
          fill: bg ? { fgColor: { rgb: bg } } : undefined,
          alignment: { horizontal: 'center' as const, vertical: 'center' as const },
          border: fullBorder(isTotal ? EMERALD : 'D0D0D0', isTotal ? 'medium' : 'thin'),
        });
      });
    }
    cols4.forEach(c => { safeStyle(ws3, `${c}13`, styleColHeader('2D2D2D')); });
    for (let r = 14; r <= 18; r++) {
      const bg = r % 2 === 0 ? LIGHT_BG : undefined;
      cols4.forEach(c => {
        safeStyle(ws3, `${c}${r}`, {
          font: { sz: 10, color: { rgb: '666666' } },
          fill: bg ? { fgColor: { rgb: bg } } : undefined,
          alignment: { horizontal: 'center' as const, vertical: 'center' as const },
          border: fullBorder('D0D0D0'),
        });
      });
    }
    ws3['!cols'] = [{ wch: 24 }, { wch: 20 }, { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    ws3['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    ];

    XLSXStyle.utils.book_append_sheet(wb, ws3, 'Salary Calculation');

    // Generate buffer
    const buf = XLSXStyle.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Monthly_Attendance_${employee.fullName}_${monthName}_${year}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Monthly export error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
