import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSXStyle from 'xlsx-js-style';

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
  if (!decimal || decimal === 0) return '0.00';
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  if (minutes >= 60) return `${hours + 1}.00`;
  return `${hours}.${String(minutes).padStart(2, '0')}`;
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
    const holidayDays = holidays.length;

    let sundays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(year, month - 1, d).getDay() === 0) sundays++;
    }

    const rawPresentDays = attendance.filter(a => ['present', 'late', 'early-out'].includes(a.status)).length;
    const halfDays = attendance.filter(a => a.status === 'half-day' || a.halfDay).length;
    const presentDays = rawPresentDays;
    const effectivePresentDays = rawPresentDays + halfDays * 0.5;
    const totalWorkingDays = daysInMonth - sundays - holidayDays;

    const holidayDateStrs = new Set(
      holidays.map(h => {
        const hd = new Date(h.date);
        return `${hd.getFullYear()}-${String(hd.getMonth() + 1).padStart(2, '0')}-${String(hd.getDate()).padStart(2, '0')}`;
      })
    );
    const presentDateStrs = new Set();
    for (const a of attendance) {
      if (['present', 'late', 'early-out', 'half-day'].includes(a.status)) {
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
    const absentDays = Math.max(0, totalWorkingDays - presentDays - halfDays - effectivePaidLeaves - effectiveUnpaidLeaves);

    const firmFromId = getFirmFromEmployeeId(employeeId);
    const effectiveFirm = firmFromId || employee.firm;
    const firmFullName = FIRM_NAMES[effectiveFirm] || employee.firm;
    const monthName = MONTHS[month - 1];

    // Computed totals — calculate from RAW check-in/check-out times for accuracy
    // Instead of summing stored decimal hours (which have rounding errors),
    // we calculate from the actual times to get exact totals in HH.MM format.
    let totalWorkMinutes = 0;
    let totalOTMinutes = 0;
    let totalSundayMinutes = 0;
    const shiftMinutes = Math.round(employee.shiftHours * 60);

    for (const a of attendance) {
      if (a.checkIn && a.checkOut) {
        const [h1, m1] = a.checkIn.split(':').map(Number);
        const [h2, m2] = a.checkOut.split(':').map(Number);
        const workMin = Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
        totalWorkMinutes += workMin;
        const otMin = Math.max(0, workMin - shiftMinutes);
        totalOTMinutes += otMin;
      }
      if (a.sundayHours > 0) {
        totalSundayMinutes += hhmmToMinutes(a.sundayHours);
      }
    }

    const totalWorkHours = formatMinutesToHHMM(totalWorkMinutes);
    const totalOvertimeHours = formatMinutesToHHMM(totalOTMinutes);
    const totalSundayHours = formatMinutesToHHMM(totalSundayMinutes);
    const lateEntries = attendance.filter(a => a.lateEntry).length;
    const earlyOuts = attendance.filter(a => a.earlyOut).length;
    const weeklyOffs = attendance.filter(a => a.isWeeklyOff || a.isSunday).length;
    const annualLeaves = effectivePaidLeaves;
    const unpaidLeaves = effectiveUnpaidLeaves;
    const sundaysEarned = employee.employmentType === 'Full Time' || !employee.employmentType ? Math.floor(rawPresentDays / 6) : 0;
    const sundayEarnedHours = formatMinutesToHHMM(sundaysEarned * shiftMinutes);
    const totalHrsInclSunday = formatMinutesToHHMM(totalWorkMinutes + totalSundayMinutes);

    const wb = XLSXStyle.utils.book_new();

    // ═══════════════════════════════════════════════════
    // SHEET 1: Monthly Attendance Register (Day-by-Day)
    // ═══════════════════════════════════════════════════
    const headerRows: any[][] = [
      [firmFullName],
      ['MONTHLY ATTENDANCE REGISTER'],
      [`Employee: ${employee.fullName} (${employee.employeeId})`, '', '', `Month: ${monthName} ${year}`, '', '', `Generated: ${new Date().toLocaleString('en-IN')}`],
      [`Company: ${firmFullName}`, '', '', `Location: ${employee.location}`, '', '', `Designation: ${employee.designation || 'N/A'}`],
      [`Shift Hours: ${formatHours(employee.shiftHours)} hrs`, '', '', `Department: ${employee.department || 'N/A'}`],
      [],
    ];
    const ws1 = XLSXStyle.utils.aoa_to_sheet(headerRows);

    const cols11 = ['A','B','C','D','E','F','G','H','I','J','K'];
    cols11.forEach(c => {
      safeStyle(ws1, `${c}1`, styleHeader());
      safeStyle(ws1, `${c}2`, styleSubHeader('2D2D2D'));
    });
    for (let r = 3; r <= 5; r++) {
      cols11.forEach(c => {
        safeStyle(ws1, `${c}${r}`, { font: { sz: 9, color: { rgb: 'CCCCCC' } }, fill: { fgColor: { rgb: '2D2D2D' } } });
      });
    }

    // Daily register columns (NO PH Hrs column)
    const dayHeaders = [
      'S.No', 'Date', 'Day', 'Check In', 'Check Out', 'Total Hrs',
      'Status', 'OT Hrs', 'Sunday Hrs', 'Late', 'Early Out',
    ];
    const dayRows: any[][] = [dayHeaders];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dateObj = new Date(dateStr + 'T00:00:00');
      const dayName = dayNames[dateObj.getDay()];
      const isSunday = dateObj.getDay() === 0;

      const rec = attendance.find((r: any) => {
        const rDate = new Date(r.date);
        return rDate.getFullYear() === year && rDate.getMonth() + 1 === month && rDate.getDate() === day;
      });

      if (rec) {
        // Calculate OT and total hours from raw times for accuracy
        let dayTotalHrs = '0.00';
        let dayOTHrs = '0.00';
        let daySundayHrs = '0.00';
        if (rec.checkIn && rec.checkOut) {
          const [h1, m1] = rec.checkIn.split(':').map(Number);
          const [h2, m2] = rec.checkOut.split(':').map(Number);
          const workMin = Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
          dayTotalHrs = formatMinutesToHHMM(workMin);
          const otMin = Math.max(0, workMin - shiftMinutes);
          dayOTHrs = formatMinutesToHHMM(otMin);
        }
        if (rec.sundayHours > 0) {
          daySundayHrs = formatHours(rec.sundayHours);
        }
        dayRows.push([
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
        ]);
      } else {
        dayRows.push([
          day,
          dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          dayName,
          '-', '-', isSunday ? '0.00' : '-',
          isSunday ? 'Weekly Off' : 'No Record',
          '0.00', '0.00', '', '',
        ]);
      }
    }

    XLSXStyle.utils.sheet_add_aoa(ws1, dayRows, { origin: 'A7' });

    cols11.forEach(c => {
      const cell = ws1[`${c}7`];
      if (cell) cell.s = styleColHeader(EMERALD);
    });

    for (let i = 0; i < dayRows.length - 1; i++) {
      const row = i + 8;
      const bg = i % 2 === 0 ? LIGHT_BG : undefined;
      cols11.forEach(c => {
        const cell = ws1[`${c}${row}`];
        if (cell) {
          if (c === 'G') {
            const status = String(cell.v || '');
            if (status === 'Present') cell.s = styleBold(EMERALD, LIGHT_GREEN);
            else if (status === 'Absent') cell.s = styleBold(RED, LIGHT_RED);
            else if (status === 'Late') cell.s = styleBold(AMBER, LIGHT_AMBER);
            else if (status === 'Early Out') cell.s = styleBold('E11D48', LIGHT_RED);
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
      { wch: 6 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 12 },
      { wch: 8 }, { wch: 10 },
    ];
    ws1['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
    ];

    XLSXStyle.utils.book_append_sheet(wb, ws1, 'Attendance Register');

    // ═══════════════════════════════════════════════════
    // SHEET 2: Summary — Exactly matching dashboard format
    // ═══════════════════════════════════════════════════
    // Layout:
    // Row 1: Company Name (merged across all cols)
    // Row 2: "Attendance Summary" (merged)
    // Row 3: Employee info | Month
    // Row 4: empty
    // Row 5: Green header row (11 cols) — matching dashboard table headers
    // Row 6: Data row (11 cols) — matching dashboard colored values
    // Row 7: empty
    // Row 8: Additional info sub-headers (6 cols) — Working Days, Weekly Offs, etc.
    // Row 9: Additional info values (6 cols)

    const summaryData: any[][] = [
      [firmFullName],
      ['Attendance Summary'],
      [`Employee: ${employee.fullName} (${employee.employeeId})`, '', '', `Month: ${monthName} ${year}`],
      [],
      // Row 5: Green header row — exact same columns as dashboard
      ['Days Present', 'Days Absent', 'Half Days', 'AL', 'UL', 'PH', 'Total Hrs Worked', 'OT Hrs', 'Sundays Earned', 'Sunday Hrs', 'Total Hrs (incl. Sunday)'],
      // Row 6: Data row — same color coding as dashboard
      [presentDays, absentDays, halfDays, annualLeaves, unpaidLeaves, holidayDays, totalWorkHours, totalOvertimeHours, sundaysEarned, sundayEarnedHours, totalHrsInclSunday],
      [],
      // Row 8: Additional info sub-headers
      ['Working Days', 'Weekly Offs', 'Sundays', 'Late Entries', 'Early Outs', 'Shift Hrs'],
      // Row 9: Additional info values
      [totalWorkingDays, weeklyOffs, sundays, lateEntries, earlyOuts, formatMinutesToHHMM(shiftMinutes) + 'h'],
    ];

    const ws2 = XLSXStyle.utils.aoa_to_sheet(summaryData);

    const cols11s = ['A','B','C','D','E','F','G','H','I','J','K'];

    // Row 1: Company header (gold on dark, merged)
    cols11s.forEach(c => { safeStyle(ws2, `${c}1`, styleHeader()); });
    // Row 2: Sub header
    cols11s.forEach(c => { safeStyle(ws2, `${c}2`, styleSubHeader('2D2D2D')); });
    // Row 3: Employee info
    ['A','D'].forEach(c => {
      safeStyle(ws2, `${c}3`, { font: { sz: 10, color: { rgb: 'CCCCCC' } }, fill: { fgColor: { rgb: '2D2D2D' } } });
    });

    // Row 5: Summary column headers (green header matching dashboard)
    cols11s.forEach(c => {
      safeStyle(ws2, `${c}5`, styleColHeader(EMERALD));
    });

    // Row 6: Summary data values — color-coded matching dashboard
    safeStyle(ws2, 'A6', styleBold(EMERALD, LIGHT_GREEN));   // Days Present - green
    safeStyle(ws2, 'B6', styleBold(RED, LIGHT_RED));          // Days Absent - red
    safeStyle(ws2, 'C6', styleBold(AMBER, LIGHT_AMBER));      // Half Days - orange
    safeStyle(ws2, 'D6', styleBold(SKY, 'EFF6FF'));           // AL - blue
    safeStyle(ws2, 'E6', styleBold(AMBER, LIGHT_AMBER));      // UL - amber
    safeStyle(ws2, 'F6', styleBold(PURPLE, 'F5F3FF'));        // PH - purple
    safeStyle(ws2, 'G6', styleBold(CYAN, LIGHT_BG));          // Total Hrs Worked - cyan
    safeStyle(ws2, 'H6', styleBold(AMBER, LIGHT_AMBER));      // OT Hrs - yellow/amber
    safeStyle(ws2, 'I6', styleBold(SKY, 'EFF6FF'));           // Sundays Earned - blue
    safeStyle(ws2, 'J6', styleBold(SKY, 'EFF6FF'));           // Sunday Hrs - blue
    safeStyle(ws2, 'K6', styleBold(GOLD, LIGHT_BG));          // Total Hrs (incl. Sunday) - gold

    // Row 8: Additional info sub-headers (dark green style)
    ['A','B','C','D','E','F'].forEach(c => {
      safeStyle(ws2, `${c}8`, styleColHeader('2D2D2D'));
    });

    // Row 9: Additional info values
    safeStyle(ws2, 'A9', styleBold(EMERALD));       // Working Days - green
    safeStyle(ws2, 'B9', styleBold(SKY));            // Weekly Offs - blue
    safeStyle(ws2, 'C9', styleBold(SKY));            // Sundays - blue
    safeStyle(ws2, 'D9', styleBold(AMBER));          // Late Entries - yellow
    safeStyle(ws2, 'E9', styleBold(RED));            // Early Outs - red
    safeStyle(ws2, 'F9', styleBold(CYAN));           // Shift Hrs - blue

    ws2['!cols'] = [
      { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 8 },
      { wch: 8 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 12 },
      { wch: 22 },
    ];
    ws2['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
    ];

    XLSXStyle.utils.book_append_sheet(wb, ws2, 'Summary');

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
