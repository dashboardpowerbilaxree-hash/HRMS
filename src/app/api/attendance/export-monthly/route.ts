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
  font: { bold: true, color: { rgb: GOLD }, sz: 16 },
  fill: { fgColor: { rgb } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  border: goldBorder,
});

const styleSubHeader = (rgb: string = DEEP_BLUE) => ({
  font: { bold: true, color: { rgb: WHITE }, sz: 12 },
  fill: { fgColor: { rgb } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  border: fullBorder('FFFFFF', 'medium'),
});

const styleColHeader = (rgb: string = TEAL) => ({
  font: { bold: true, color: { rgb: WHITE }, sz: 10 },
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

    // Get all attendance records
    const attendance = await db.attendance.findMany({
      where: { employeeId, date: { gte: startDate, lt: endDate } },
      orderBy: { date: 'asc' },
    });

    // Get approved leaves
    const leaves = await db.leave.findMany({
      where: { employeeId, status: 'approved', startDate: { gte: startDate }, endDate: { lt: endDate } },
    });

    // Get holidays
    const holidays = await db.holiday.findMany({ where: { date: { gte: startDate, lt: endDate } } });
    const holidayDays = holidays.length;

    // Count Sundays
    let sundays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(year, month - 1, d).getDay() === 0) sundays++;
    }

    // Attendance calculations (consistent with monthly-summary API)
    const rawPresentDays = attendance.filter(a => ['present', 'late', 'early-out'].includes(a.status)).length;
    const halfDays = attendance.filter(a => a.status === 'half-day' || a.halfDay).length;
    const presentDays = rawPresentDays; // Full present days only (half-days tracked separately)
    const effectivePresentDays = rawPresentDays + halfDays * 0.5; // For salary calculation
    const totalWorkingDays = daysInMonth - sundays - holidayDays;

    // Effective paid leave calculation (same as monthly-summary API)
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

    // ═══════════════════════════════════════════════════
    // SHEET 1: Monthly Attendance Register (Day-by-Day)
    // ═══════════════════════════════════════════════════
    const wb = XLSXStyle.utils.book_new();

    const headerRows: any[][] = [
      [firmFullName],
      ['MONTHLY ATTENDANCE REGISTER'],
      [`Employee: ${employee.fullName} (${employee.employeeId})`, '', '', `Month: ${monthName} ${year}`, '', '', `Generated: ${new Date().toLocaleString('en-IN')}`],
      [`Company: ${firmFullName}`, '', '', `Location: ${employee.location}`, '', '', `Designation: ${employee.designation || 'N/A'}`],
      [`Shift Hours: ${formatHours(employee.shiftHours)} hrs`, '', '', `Department: ${employee.department || 'N/A'}`],
      [],
    ];
    const ws1 = XLSXStyle.utils.aoa_to_sheet(headerRows);

    const cols12 = ['A','B','C','D','E','F','G','H','I','J','K','L'];
    cols12.forEach(c => {
      safeStyle(ws1, `${c}1`, styleHeader());
      safeStyle(ws1, `${c}2`, styleSubHeader('2D2D2D'));
    });
    for (let r = 3; r <= 5; r++) {
      cols12.forEach(c => {
        safeStyle(ws1, `${c}${r}`, { font: { sz: 9, color: { rgb: 'CCCCCC' } }, fill: { fgColor: { rgb: '2D2D2D' } } });
      });
    }

    const dayHeaders = [
      'S.No', 'Date', 'Day', 'Check In', 'Check Out', 'Total Hrs',
      'Status', 'OT Hrs', 'Sunday Hrs', 'PH Hrs', 'Late', 'Early Out',
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
        dayRows.push([
          day,
          dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          dayName,
          rec.checkIn || '-',
          rec.checkOut || '-',
          rec.totalHours > 0 ? formatHours(rec.totalHours) : '0.00',
          rec.status.charAt(0).toUpperCase() + rec.status.slice(1).replace('-', ' '),
          rec.overtimeHours > 0 ? formatHours(rec.overtimeHours) : '0.00',
          rec.sundayHours > 0 ? formatHours(rec.sundayHours) : '0.00',
          rec.phHours > 0 ? formatHours(rec.phHours) : '0.00',
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
          '0.00', '0.00', '0.00', '', '',
        ]);
      }
    }

    XLSXStyle.utils.sheet_add_aoa(ws1, dayRows, { origin: 'A7' });

    cols12.forEach(c => {
      const cell = ws1[`${c}7`];
      if (cell) cell.s = styleColHeader(EMERALD);
    });

    for (let i = 0; i < dayRows.length - 1; i++) {
      const row = i + 8;
      const bg = i % 2 === 0 ? LIGHT_BG : undefined;
      cols12.forEach(c => {
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
          } else if (c === 'K') {
            if (String(cell.v) === 'Yes') cell.s = styleBold(AMBER, LIGHT_AMBER);
            else cell.s = styleData(bg);
          } else if (c === 'L') {
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
      { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
      { wch: 8 }, { wch: 10 },
    ];
    ws1['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
    ];

    XLSXStyle.utils.book_append_sheet(wb, ws1, 'Attendance Register');

    // ═══════════════════════════════════════════════════
    // SHEET 2: Monthly Summary (Beautiful)
    // ═══════════════════════════════════════════════════
    const totalWorkHours = Math.round(attendance.reduce((sum, a) => sum + a.totalHours, 0) * 100) / 100;
    const totalOvertimeHours = Math.round(attendance.reduce((sum, a) => sum + a.overtimeHours, 0) * 100) / 100;
    const totalSundayHours = Math.round(attendance.reduce((sum, a) => sum + a.sundayHours, 0) * 100) / 100;
    const totalPHHours = Math.round(attendance.reduce((sum, a) => sum + a.phHours, 0) * 100) / 100;
    const lateEntries = attendance.filter(a => a.lateEntry).length;
    const earlyOuts = attendance.filter(a => a.earlyOut).length;
    const weeklyOffs = attendance.filter(a => a.isWeeklyOff || a.isSunday).length;
    const annualLeaves = effectivePaidLeaves;
    const unpaidLeaves = effectiveUnpaidLeaves;
    const sundaysEarned = employee.employmentType === 'Full Time' || !employee.employmentType ? Math.floor(rawPresentDays / 6) : 0;
    const sundayEarnedHours = Math.round(sundaysEarned * employee.shiftHours * 100) / 100;
    const totalHrsInclSundayPH = Math.round((totalWorkHours + totalSundayHours + totalPHHours) * 100) / 100;

    const summaryData: any[][] = [
      [firmFullName],
      ['Attendance Summary'],
      [`Employee: ${employee.fullName} (${employee.employeeId})`, '', '', `Month: ${monthName} ${year}`],
      [],
      ['Category', 'Count', '', 'Category', 'Count'],
      ['Days Present', presentDays, '', 'Days Absent', absentDays],
      ['Half Days', halfDays, '', 'Annual Leaves', annualLeaves],
      ['Unpaid Leaves', unpaidLeaves, '', 'Public Holidays', holidayDays],
      ['Working Days', totalWorkingDays, '', 'Weekly Offs', weeklyOffs],
      ['Sundays', sundays, '', 'Sundays Earned', sundaysEarned],
      ['Late Entries', lateEntries, '', 'Early Outs', earlyOuts],
      [],
      ['Hours Breakdown'],
      ['Total Work Hours', formatHours(totalWorkHours)],
      ['OT Hours', formatHours(totalOvertimeHours)],
      ['Sunday Hours', formatHours(totalSundayHours)],
      ['PH Hours', formatHours(totalPHHours)],
      ['Total Hrs (incl. Sunday + PH)', formatHours(totalHrsInclSundayPH)],
      ['Shift Hours', formatHours(employee.shiftHours)],
    ];
    const ws2 = XLSXStyle.utils.aoa_to_sheet(summaryData);

    const cols5 = ['A','B','C','D','E'];
    cols5.forEach(c => { safeStyle(ws2, `${c}1`, styleHeader()); });
    cols5.forEach(c => { safeStyle(ws2, `${c}2`, styleSubHeader('2D2D2D')); });
    cols5.forEach(c => { safeStyle(ws2, `${c}5`, styleColHeader(EMERALD)); });
    safeStyle(ws2, 'A6', styleBold(EMERALD, LIGHT_GREEN)); safeStyle(ws2, 'B6', styleBold(EMERALD, LIGHT_GREEN));
    safeStyle(ws2, 'D6', styleBold(RED, LIGHT_RED)); safeStyle(ws2, 'E6', styleBold(RED, LIGHT_RED));
    safeStyle(ws2, 'A7', styleBold(AMBER, LIGHT_AMBER)); safeStyle(ws2, 'B7', styleBold(AMBER, LIGHT_AMBER));
    safeStyle(ws2, 'D7', styleBold(SKY, 'EFF6FF')); safeStyle(ws2, 'E7', styleBold(SKY, 'EFF6FF'));
    safeStyle(ws2, 'A8', styleData(LIGHT_BG)); safeStyle(ws2, 'B8', styleData(LIGHT_BG));
    safeStyle(ws2, 'D8', styleBold(PURPLE, 'F5F3FF')); safeStyle(ws2, 'E8', styleBold(PURPLE, 'F5F3FF'));
    safeStyle(ws2, 'A9', styleData()); safeStyle(ws2, 'B9', styleData());
    safeStyle(ws2, 'D9', styleBold(SKY, 'EFF6FF')); safeStyle(ws2, 'E9', styleBold(SKY, 'EFF6FF'));
    safeStyle(ws2, 'A10', styleBold(SKY, 'EFF6FF')); safeStyle(ws2, 'B10', styleBold(SKY, 'EFF6FF'));
    safeStyle(ws2, 'D10', styleBold(EMERALD, LIGHT_GREEN)); safeStyle(ws2, 'E10', styleBold(EMERALD, LIGHT_GREEN));
    safeStyle(ws2, 'A11', styleBold(AMBER, LIGHT_AMBER)); safeStyle(ws2, 'B11', styleBold(AMBER, LIGHT_AMBER));
    safeStyle(ws2, 'D11', styleBold('E11D48', LIGHT_RED)); safeStyle(ws2, 'E11', styleBold('E11D48', LIGHT_RED));
    safeStyle(ws2, 'A13', styleSubHeader('2D2D2D')); cols5.filter(c => c !== 'A').forEach(c => { safeStyle(ws2, `${c}13`, styleSubHeader('2D2D2D')); });
    for (let r = 14; r <= 20; r++) {
      const bg2 = (r - 14) % 2 === 0 ? LIGHT_BG : undefined;
      safeStyle(ws2, `A${r}`, styleData(bg2)); safeStyle(ws2, `B${r}`, styleBold(DARK, bg2));
    }

    ws2['!cols'] = [
      { wch: 26 }, { wch: 14 }, { wch: 6 }, { wch: 26 }, { wch: 14 },
    ];
    ws2['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    ];
    XLSXStyle.utils.book_append_sheet(wb, ws2, 'Summary');

    // Generate buffer
    const buf = XLSXStyle.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return as downloadable file
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
