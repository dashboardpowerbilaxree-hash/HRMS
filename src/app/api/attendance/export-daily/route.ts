import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSXStyle from 'xlsx-js-style';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

// Color constants - matching Daily_Attendance_Formate.xlsx
const GOLD = 'D4A843';
const DARK = '1A1A1A';
const WHITE = 'FFFFFF';
const EMERALD = '059669';
const RED = 'DC2626';
const AMBER = 'D97706';
const CYAN = '0891B2';
const LIGHT_BG = 'FFF8E7';
const LIGHT_GREEN = 'ECFDF5';
const LIGHT_RED = 'FEF2F2';
const LIGHT_AMBER = 'FFFBEB';

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
  font: { bold: true, color: { rgb: GOLD }, sz: 20 },
  fill: { fgColor: { rgb } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  border: fullBorder('B0B0B0', 'thin'),
});

const styleSubHeader = () => ({
  font: { bold: true, italic: true, color: { rgb: WHITE }, sz: 20 },
  fill: { fgColor: { rgb: DARK } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  border: fullBorder('B0B0B0', 'thin'),
});

const styleColHeader = () => ({
  font: { bold: true, color: { rgb: WHITE }, sz: 20 },
  fill: { fgColor: { rgb: EMERALD } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
  border: fullBorder('B0B0B0', 'thin'),
});

const styleData = (bg?: string) => ({
  font: { sz: 11, color: { rgb: '333333' } },
  fill: bg ? { fgColor: { rgb: bg } } : undefined,
  alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  border: fullBorder('D0D0D0'),
});

const styleBold = (rgb: string = DARK, bg?: string) => ({
  font: { bold: true, color: { rgb }, sz: 11 },
  fill: bg ? { fgColor: { rgb: bg } } : undefined,
  alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  border: fullBorder('D0D0D0'),
});

const safeStyle = (ws: any, cellRef: string, style: any) => {
  if (ws[cellRef]) ws[cellRef].s = style;
};

// Get firm name from employee ID
function getFirmFromEmployeeId(employeeId: string): string {
  const id = employeeId.toUpperCase();
  if (id.startsWith('LAPL')) return 'LAPL';
  if (id.startsWith('LRSL')) return 'LRSL';
  if (id.startsWith('SI-') || id.startsWith('SI0')) return 'SI';
  if (id.startsWith('SDF')) return 'SDF';
  return '';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '';
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const department = searchParams.get('department') || '';
    const location = searchParams.get('location') || '';

    const params: any = {};
    if (date) {
      params.date = new Date(date);
    } else {
      params.date = { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) };
    }

    const where: any = { date: params.date };
    if (department && department !== 'all') {
      const emps = await db.employee.findMany({ where: { firm: department }, select: { employeeId: true } });
      where.employeeId = { in: emps.map(e => e.employeeId) };
    }
    if (location && location !== 'all') {
      const emps = await db.employee.findMany({ where: { location }, select: { employeeId: true } });
      if (where.employeeId?.in) {
        const locEmps = emps.map(e => e.employeeId);
        where.employeeId.in = where.employeeId.in.filter((id: string) => locEmps.includes(id));
      } else {
        where.employeeId = { in: emps.map(e => e.employeeId) };
      }
    }

    const records = await db.attendance.findMany({
      where,
      include: {
        employee: {
          select: { fullName: true, employeeId: true, department: true, firm: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Also get all active employees for the selected date/firm to show even those without attendance
    const allEmpsWhere: any = { status: 'Yes' };
    if (department && department !== 'all') {
      allEmpsWhere.firm = department;
    }
    if (location && location !== 'all') {
      allEmpsWhere.location = location;
    }
    const allEmployees = await db.employee.findMany({
      where: allEmpsWhere,
      select: { employeeId: true, fullName: true, department: true, firm: true },
      orderBy: { fullName: 'asc' },
    });

    // Determine the attendance date for display
    let attendanceDate: Date;
    if (date) {
      attendanceDate = new Date(date + 'T00:00:00');
    } else if (records.length > 0) {
      attendanceDate = new Date(records[0].date);
    } else {
      attendanceDate = new Date(year, month - 1, 1);
    }

    // Build combined list: all employees with their attendance (if any)
    const attendanceMap = new Map<string, any>();
    for (const rec of records) {
      attendanceMap.set(rec.employeeId, rec);
    }

    // Merge: employees with attendance + employees without attendance for that date
    const combinedRows: any[] = [];
    for (const emp of allEmployees) {
      const rec = attendanceMap.get(emp.employeeId);
      const firmCode = getFirmFromEmployeeId(emp.employeeId) || emp.firm || emp.department || '';
      combinedRows.push({
        employee: emp,
        attendance: rec || null,
        firmCode,
      });
    }

    // Also include any records from employees not in the active list
    const activeEmpIds = new Set(allEmployees.map(e => e.employeeId));
    for (const rec of records) {
      if (!activeEmpIds.has(rec.employeeId)) {
        const firmCode = getFirmFromEmployeeId(rec.employeeId) || rec.employee?.firm || rec.employee?.department || '';
        combinedRows.push({
          employee: { employeeId: rec.employeeId, fullName: rec.employee?.fullName || rec.employeeId, department: rec.employee?.department || '', firm: firmCode },
          attendance: rec,
          firmCode,
        });
      }
    }

    // Sort by firm then name
    combinedRows.sort((a, b) => {
      const firmCmp = (a.firmCode || '').localeCompare(b.firmCode || '');
      if (firmCmp !== 0) return firmCmp;
      return (a.employee.fullName || '').localeCompare(b.employee.fullName || '');
    });

    const wb = XLSXStyle.utils.book_new();

    // ═══════════════════════════════════════════════════════════
    // SHEET 1: Daily Attendance - Matching Daily_Attendance_Formate.xlsx
    // Layout:
    // Row 1: LAXREE GROUP OF COMPANIES (merged B1:I1, gold on dark, sz=20)
    // Row 2: Date of Attendance (merged B2:I2, date formatted, sz=20)
    // Row 3: Daily Attendance Report — (merged B3:I3, bold+italic, sz=20)
    // Row 4: empty
    // Row 5: Column headers: S.No | Employee Name | Emp Code | Company | In Time | Out Time | Hours | Status | OT Hours | Remark
    // Row 6+: Data rows
    // ═══════════════════════════════════════════════════════════

    // Format attendance date for display: "1/06/2026" style
    const attendanceDateStr = `${attendanceDate.getDate()}/${String(attendanceDate.getMonth() + 1).padStart(2, '0')}/${attendanceDate.getFullYear()}`;

    const headerData: any[][] = [
      ['', 'LAXREE GROUP OF COMPANIES'],                          // Row 1 - A1 empty, B1 title
      ['', `Date of Attendance: ${attendanceDateStr}`],          // Row 2 - A2 empty, B2 date string
      ['', 'Daily Attendance Report —'],                        // Row 3 - A3 empty, B3 subtitle
      [],                                                       // Row 4 empty
    ];
    const ws = XLSXStyle.utils.aoa_to_sheet(headerData);

    // Style Row 1: Company name header (gold on dark, sz=20)
    const cols10 = ['A','B','C','D','E','F','G','H','I','J'];
    // Row 1: LAXREE GROUP OF COMPANIES
    cols10.forEach(c => {
      safeStyle(ws, `${c}1`, styleHeader());
    });

    // Row 2: Date of Attendance - actual date displayed as text
    safeStyle(ws, 'A2', { fill: { fgColor: { rgb: DARK } }, border: fullBorder('B0B0B0', 'thin') });
    cols10.slice(1).forEach(c => {
      safeStyle(ws, `${c}2`, {
        font: { bold: true, color: { rgb: WHITE }, sz: 20 },
        fill: { fgColor: { rgb: DARK } },
        alignment: { horizontal: 'center' as const, vertical: 'center' as const },
        border: fullBorder('B0B0B0', 'thin'),
      });
    });

    // Row 3: Daily Attendance Report —
    safeStyle(ws, 'A3', { fill: { fgColor: { rgb: DARK } }, border: fullBorder('B0B0B0', 'thin') });
    cols10.slice(1).forEach(c => {
      safeStyle(ws, `${c}3`, styleSubHeader());
    });

    // Row 4: empty (dark bg)
    cols10.forEach(c => {
      safeStyle(ws, `${c}4`, { fill: { fgColor: { rgb: '2D2D2D' } } });
    });

    // Row 5: Column headers (emerald green, sz=20, matching template)
    const colHeaders = ['S.No', 'Employee Name', 'Emp Code', 'Company', 'In Time', 'Out Time', 'Hours', 'Status', 'OT Hours', 'Remark'];
    XLSXStyle.utils.sheet_add_aoa(ws, [colHeaders], { origin: 'A5' });
    cols10.forEach(c => {
      safeStyle(ws, `${c}5`, styleColHeader());
    });

    // Data rows (Row 6+)
    for (let i = 0; i < combinedRows.length; i++) {
      const row = combinedRows[i];
      const rec = row.attendance;
      const emp = row.employee;
      const dataRow = i + 6;

      const sno = i + 1;
      const empName = emp.fullName || emp.employeeId;
      const empCode = emp.employeeId;
      const company = row.firmCode || emp.department || '';
      const inTime = rec?.checkIn || '';
      const outTime = rec?.checkOut || '';
      const hours = rec && rec.totalHours > 0 ? formatHours(rec.totalHours) : '';
      const status = rec ? (rec.status.charAt(0).toUpperCase() + rec.status.slice(1).replace('-', ' ')) : '';
      const otHours = rec && rec.overtimeHours > 0 ? formatOT(rec.overtimeHours) : '';
      const remark = '';

      XLSXStyle.utils.sheet_add_aoa(ws, [[sno, empName, empCode, company, inTime, outTime, hours, status, otHours, remark]], { origin: `A${dataRow}` });

      // Style the data row
      const bg = i % 2 === 0 ? LIGHT_BG : undefined;
      cols10.forEach(c => {
        const cell = ws[`${c}${dataRow}`];
        if (cell) {
          if (c === 'H') {
            // Status column - color coded
            const statusVal = String(cell.v || '');
            if (statusVal === 'Present') cell.s = styleBold(EMERALD, LIGHT_GREEN);
            else if (statusVal === 'Absent') cell.s = styleBold(RED, LIGHT_RED);
            else if (statusVal === 'Late') cell.s = styleBold(AMBER, LIGHT_AMBER);
            else if (statusVal === 'Early Out') cell.s = styleBold('E11D48', LIGHT_RED);
            else if (statusVal === 'Half Day') cell.s = styleBold(AMBER, LIGHT_AMBER);
            else if (statusVal === 'Weekly Off') cell.s = styleBold('0284C7', 'EFF6FF');
            else if (statusVal === 'Holiday') cell.s = styleBold('7C3AED', 'F5F3FF');
            else cell.s = styleData(bg);
          } else {
            cell.s = styleData(bg);
          }
        }
      });
    }

    // Column widths matching Daily_Attendance_Formate.xlsx
    ws['!cols'] = [
      { wch: 16 },   // A: S.No
      { wch: 34 },   // B: Employee Name
      { wch: 26 },   // C: Emp Code
      { wch: 23 },   // D: Company
      { wch: 20 },   // E: In Time
      { wch: 22 },   // F: Out Time
      { wch: 18 },   // G: Hours
      { wch: 20 },   // H: Status
      { wch: 22 },   // I: OT Hours
      { wch: 22 },   // J: Remark
    ];

    // Row heights
    ws['!rows'] = [];
    ws['!rows'][0] = { hpt: 40 };   // Row 1
    ws['!rows'][1] = { hpt: 40 };   // Row 2
    ws['!rows'][2] = { hpt: 40 };   // Row 3
    for (let i = 5; i < 5 + combinedRows.length; i++) {
      ws['!rows'][i] = { hpt: 30 };  // Data rows
    }

    // Merged cells matching template
    ws['!merges'] = [
      { s: { r: 0, c: 1 }, e: { r: 0, c: 9 } },  // R1: B1:J1
      { s: { r: 1, c: 1 }, e: { r: 1, c: 9 } },  // R2: B2:J2
      { s: { r: 2, c: 1 }, e: { r: 2, c: 9 } },  // R3: B3:J3
    ];

    XLSXStyle.utils.book_append_sheet(wb, ws, 'Daily Attendance');

    // ═══════════════════════════════════════════════════════════
    // SHEET 2: Summary - matching Daily_Attendance_Formate.xlsx
    // ═══════════════════════════════════════════════════════════
    const present = combinedRows.filter(r => r.attendance && ['present', 'late', 'early-out'].includes(r.attendance.status)).length;
    const absent = combinedRows.filter(r => r.attendance && r.attendance.status === 'absent').length;
    const late = combinedRows.filter(r => r.attendance && r.attendance.lateEntry).length;
    const earlyOut = combinedRows.filter(r => r.attendance && r.attendance.earlyOut).length;
    const ot = Math.round(combinedRows.reduce((s, r) => s + (r.attendance?.overtimeHours || 0), 0) * 100) / 100;
    const otDisplay = formatOT(ot);

    const summaryRows: any[][] = [
      ['Attendance Summary'],
      [],
      ['Category', 'Count'],
      ['Present', present],
      ['Absent', absent],
      ['Late', late],
      ['Early Out', earlyOut],
      ['OT Hours', otDisplay],
    ];
    const ws2 = XLSXStyle.utils.aoa_to_sheet(summaryRows);

    // Style matching template Summary sheet
    ['A1', 'B1'].forEach(c => {
      safeStyle(ws2, c, {
        font: { bold: true, color: { rgb: GOLD }, sz: 16 },
        fill: { fgColor: { rgb: DARK } },
        alignment: { horizontal: 'center' as const, vertical: 'center' as const },
        border: goldBorder,
      });
    });
    ['A3', 'B3'].forEach(c => {
      safeStyle(ws2, c, {
        font: { bold: true, color: { rgb: WHITE }, sz: 10 },
        fill: { fgColor: { rgb: EMERALD } },
        alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
        border: fullBorder('B0B0B0', 'medium'),
      });
    });
    safeStyle(ws2, 'A4', styleBold(EMERALD, LIGHT_GREEN)); safeStyle(ws2, 'B4', styleBold(EMERALD, LIGHT_GREEN));
    safeStyle(ws2, 'A5', styleBold(RED, LIGHT_RED)); safeStyle(ws2, 'B5', styleBold(RED, LIGHT_RED));
    safeStyle(ws2, 'A6', styleBold(AMBER, LIGHT_AMBER)); safeStyle(ws2, 'B6', styleBold(AMBER, LIGHT_AMBER));
    safeStyle(ws2, 'A7', styleBold('E11D48', LIGHT_RED)); safeStyle(ws2, 'B7', styleBold('E11D48', LIGHT_RED));
    safeStyle(ws2, 'A8', styleBold(CYAN)); safeStyle(ws2, 'B8', styleBold(CYAN));
    ws2['!cols'] = [{ wch: 19 }, { wch: 15 }];
    ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

    XLSXStyle.utils.book_append_sheet(wb, ws2, 'Summary');

    const buf = XLSXStyle.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Use the actual date for filename
    const dateStr = attendanceDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\s+/g, '_');

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Daily_Attendance_${dateStr}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Daily export error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
