import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSXStyle from 'xlsx-js-style';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatHours(decimal: number): string {
  if (!decimal || decimal === 0) return '0.00';
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  if (minutes >= 60) return `${hours + 1}.00`;
  return `${hours}.${String(minutes).padStart(2, '0')}`;
}

// Color constants
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
          select: { fullName: true, employeeId: true, department: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    if (records.length === 0) {
      return NextResponse.json({ error: 'No records to export' }, { status: 400 });
    }

    const wb = XLSXStyle.utils.book_new();

    // Company Header
    const headerData: any[][] = [
      ['LAXREE GROUP OF COMPANIES'],
      [`Daily Attendance Report — ${MONTHS[month - 1]} ${year}`],
      [`Generated: ${new Date().toLocaleString('en-IN')}`],
      [],
    ];
    const ws = XLSXStyle.utils.aoa_to_sheet(headerData);

    ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1', 'I1'].forEach(c => {
      safeStyle(ws, c, styleHeader());
    });
    ['A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'G2', 'H2', 'I2'].forEach(c => {
      safeStyle(ws, c, { font: { bold: true, color: { rgb: WHITE }, sz: 12 }, fill: { fgColor: { rgb: '2D2D2D' } }, alignment: { horizontal: 'center' as const } });
    });
    ['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3', 'H3', 'I3'].forEach(c => {
      safeStyle(ws, c, { font: { italic: true, color: { rgb: '888888' }, sz: 9 }, fill: { fgColor: { rgb: '2D2D2D' } }, alignment: { horizontal: 'center' as const } });
    });

    // Data rows
    const dataRows = records.map(rec => ({
      'Employee Name': rec.employee?.fullName || rec.employeeId,
      'Emp Code': rec.employeeId,
      'Company': rec.employee?.department || '',
      'Date': new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      'In Time': rec.checkIn || '-',
      'Out Time': rec.checkOut || '-',
      'Hours': rec.totalHours > 0 ? formatHours(rec.totalHours) : '0.00',
      'Status': rec.status.charAt(0).toUpperCase() + rec.status.slice(1).replace('-', ' '),
      'OT Hours': rec.overtimeHours > 0 ? rec.overtimeHours.toFixed(2) : '0.00',
    }));
    XLSXStyle.utils.sheet_add_json(ws, dataRows, { origin: 'A5' });

    const colKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    colKeys.forEach(c => {
      const cell = ws[`${c}5`];
      if (cell) cell.s = styleColHeader(EMERALD);
    });

    for (let i = 0; i < dataRows.length; i++) {
      const row = i + 6;
      const bg = i % 2 === 0 ? LIGHT_BG : undefined;
      colKeys.forEach(c => {
        const cell = ws[`${c}${row}`];
        if (cell) {
          if (c === 'H') {
            const status = String(cell.v || '');
            if (status === 'Present') cell.s = styleBold(EMERALD, LIGHT_GREEN);
            else if (status === 'Absent') cell.s = styleBold(RED, LIGHT_RED);
            else if (status === 'Late') cell.s = styleBold(AMBER, LIGHT_AMBER);
            else if (status === 'Early Out') cell.s = styleBold('E11D48', LIGHT_RED);
            else if (status === 'Half Day') cell.s = styleBold(AMBER, LIGHT_AMBER);
            else cell.s = styleData(bg);
          } else {
            cell.s = styleData(bg);
          }
        }
      });
    }

    ws['!cols'] = [
      { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 14 },
      { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 10 },
    ];
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
    ];

    XLSXStyle.utils.book_append_sheet(wb, ws, 'Daily Attendance');

    // Summary sheet
    const present = records.filter(a => ['present', 'late', 'early-out'].includes(a.status)).length;
    const absent = records.filter(a => a.status === 'absent').length;
    const late = records.filter(a => a.lateEntry).length;
    const earlyOut = records.filter(a => a.earlyOut).length;
    const ot = Math.round(records.reduce((s, a) => s + a.overtimeHours, 0) * 100) / 100;
    // Display OT as decimal sum (matching dashboard display)
    const otDisplay = ot.toFixed(2);

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
    ['A1', 'B1'].forEach(c => { safeStyle(ws2, c, styleHeader()); });
    ['A3', 'B3'].forEach(c => { safeStyle(ws2, c, styleColHeader(EMERALD)); });
    safeStyle(ws2, 'A4', styleBold(EMERALD, LIGHT_GREEN)); safeStyle(ws2, 'B4', styleBold(EMERALD, LIGHT_GREEN));
    safeStyle(ws2, 'A5', styleBold(RED, LIGHT_RED)); safeStyle(ws2, 'B5', styleBold(RED, LIGHT_RED));
    safeStyle(ws2, 'A6', styleBold(AMBER, LIGHT_AMBER)); safeStyle(ws2, 'B6', styleBold(AMBER, LIGHT_AMBER));
    safeStyle(ws2, 'A7', styleBold('E11D48', LIGHT_RED)); safeStyle(ws2, 'B7', styleBold('E11D48', LIGHT_RED));
    safeStyle(ws2, 'A8', styleBold(CYAN)); safeStyle(ws2, 'B8', styleBold(CYAN));
    ws2['!cols'] = [{ wch: 18 }, { wch: 14 }];
    ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    XLSXStyle.utils.book_append_sheet(wb, ws2, 'Summary');

    const buf = XLSXStyle.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Daily_Attendance_${MONTHS[month - 1]}_${year}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Daily export error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
