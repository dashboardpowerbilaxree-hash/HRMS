import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSXStyle from 'xlsx-js-style';

// Generate a BLANK daily attendance template (no employee data pre-filled)
// When HR selects a date and downloads, it should be empty format only
// Company name should NOT be pre-filled - it will be filled when HR imports

const GOLD = 'D4A843';
const DARK = '1A1A1A';
const WHITE = 'FFFFFF';
const EMERALD = '059669';
const LIGHT_BG = 'FFF8E7';

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

const styleHeader = () => ({
  font: { bold: true, color: { rgb: GOLD }, sz: 20 },
  fill: { fgColor: { rgb: DARK } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  border: fullBorder('B0B0B0', 'thin'),
});

const styleDateHeader = () => ({
  font: { bold: true, color: { rgb: WHITE }, sz: 20 },
  fill: { fgColor: { rgb: DARK } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  border: fullBorder('B0B0B0', 'thin'),
  numfmt: 'dddd, mmmm dd, yyyy',
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

const safeStyle = (ws: any, cellRef: string, style: any) => {
  if (ws[cellRef]) ws[cellRef].s = style;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '';

    // Parse the selected date
    let attendanceDate: Date;
    if (date) {
      attendanceDate = new Date(date + 'T00:00:00');
    } else {
      attendanceDate = new Date();
    }

    const wb = XLSXStyle.utils.book_new();

    // ═══════════════════════════════════════════════════════════
    // SHEET 1: Daily Attendance - BLANK template
    // Same format as Daily_Attendance_Formate.xlsx but EMPTY data
    // ═══════════════════════════════════════════════════════════

    const headerData: any[][] = [
      ['', 'LAXREE GROUP OF COMPANIES'],  // Row 1
      ['', attendanceDate],                // Row 2 - date with formatting
      ['', 'Daily Attendance Report —'],  // Row 3
      [],                                  // Row 4 empty
    ];
    const ws = XLSXStyle.utils.aoa_to_sheet(headerData);

    const cols10 = ['A','B','C','D','E','F','G','H','I','J'];

    // Style Row 1
    cols10.forEach(c => { safeStyle(ws, `${c}1`, styleHeader()); });

    // Style Row 2
    safeStyle(ws, 'A2', { fill: { fgColor: { rgb: DARK } }, border: fullBorder('B0B0B0', 'thin') });
    cols10.slice(1).forEach(c => { safeStyle(ws, `${c}2`, styleDateHeader()); });

    // Style Row 3
    safeStyle(ws, 'A3', { fill: { fgColor: { rgb: DARK } }, border: fullBorder('B0B0B0', 'thin') });
    cols10.slice(1).forEach(c => { safeStyle(ws, `${c}3`, styleSubHeader()); });

    // Row 4: empty
    cols10.forEach(c => { safeStyle(ws, `${c}4`, { fill: { fgColor: { rgb: '2D2D2D' } } }); });

    // Row 5: Column headers
    const colHeaders = ['S.No', 'Employee Name', 'Emp Code', 'Company', 'In Time', 'Out Time', 'Hours', 'Status', 'OT Hours', 'Remark'];
    XLSXStyle.utils.sheet_add_aoa(ws, [colHeaders], { origin: 'A5' });
    cols10.forEach(c => { safeStyle(ws, `${c}5`, styleColHeader()); });

    // Empty data rows (50 blank rows for data entry)
    for (let i = 0; i < 50; i++) {
      const dataRow = i + 6;
      XLSXStyle.utils.sheet_add_aoa(ws, [[i + 1, '', '', '', '', '', '', '', '', '']], { origin: `A${dataRow}` });
      const bg = i % 2 === 0 ? LIGHT_BG : undefined;
      cols10.forEach(c => {
        safeStyle(ws, `${c}${dataRow}`, styleData(bg));
      });
    }

    // Column widths matching template
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
    ws['!rows'][0] = { hpt: 40 };
    ws['!rows'][1] = { hpt: 40 };
    ws['!rows'][2] = { hpt: 40 };

    // Merged cells
    ws['!merges'] = [
      { s: { r: 0, c: 1 }, e: { r: 0, c: 9 } },  // R1: B1:J1
      { s: { r: 1, c: 1 }, e: { r: 1, c: 9 } },  // R2: B2:J2
      { s: { r: 2, c: 1 }, e: { r: 2, c: 9 } },  // R3: B3:J3
    ];

    XLSXStyle.utils.book_append_sheet(wb, ws, 'Daily Attendance');

    // ═══════════════════════════════════════════════════════════
    // SHEET 2: Summary - BLANK
    // ═══════════════════════════════════════════════════════════
    const summaryRows: any[][] = [
      ['Attendance Summary'],
      [],
      ['Category', 'Count'],
      ['Present', 0],
      ['Absent', 0],
      ['Late', 0],
      ['Early Out', 0],
      ['OT Hours', '0m'],
    ];
    const ws2 = XLSXStyle.utils.aoa_to_sheet(summaryRows);
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
    ws2['!cols'] = [{ wch: 19 }, { wch: 15 }];
    ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

    XLSXStyle.utils.book_append_sheet(wb, ws2, 'Summary');

    const buf = XLSXStyle.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const dateStr = attendanceDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\s+/g, '_');

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Daily_Attendance_Template_${dateStr}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Template generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
