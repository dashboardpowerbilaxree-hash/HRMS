import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSXStyle from 'xlsx-js-style';

// Master Excel Sheet Export
// Generates a single Excel file with firm-wise sheets
// Each sheet matches the "Laxree Group Monthly Excel Formate.xlsx" template:
// - 3 sections: Days 1-11, Days 12-22, Days 23-31
// - Each day has 3 columns: IN, OUT, TOTAL HRS
// - Section 3 ends with Total Working Hours + Leave columns
// - Date headers show actual dates like "1/06/2026" instead of "Date"

const FIRM_NAMES: Record<string, string> = {
  LAPL: 'LAXREE AMENITIES PVT LTD',
  LRSL: 'LAXREE ROOFING SOLUTION',
  SI: 'SMARTH INTERNATIONAL',
  SDF: 'SANGRAH DECOR & FURNITURE',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

// Color constants
const GOLD = 'D4A843';
const DARK = '1A1A1A';
const WHITE = 'FFFFFF';
const DEEP_BLUE = '1E3A5F';
const LIGHT_BG = 'FFF8E7';
const LIGHT_GREEN = 'ECFDF5';
const LIGHT_RED = 'FEF2F2';
const LIGHT_AMBER = 'FFFBEB';
const AMBER_HIGHLIGHT = 'FFC000';

const fullBorder = (color: string = 'B0B0B0', style: 'thin' | 'medium' = 'thin') => ({
  top: { style, color: { rgb: color } },
  bottom: { style, color: { rgb: color } },
  left: { style, color: { rgb: color } },
  right: { style, color: { rgb: color } },
});

const safeStyle = (ws: any, cellRef: string, style: any) => {
  if (ws[cellRef]) ws[cellRef].s = style;
};

// Helper: get column letter from 0-based index
const colLetter = (idx: number): string => {
  let result = '';
  let n = idx;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const firm = searchParams.get('firm') || '';
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const daysInMonth = new Date(year, month, 0).getDate();
    const monthName = MONTHS[month - 1];

    // Determine which firms to include
    const firms = firm && firm !== 'all' ? [firm] : ['LAPL', 'LRSL', 'SI', 'SDF'];

    const wb = XLSXStyle.utils.book_new();

    for (const firmCode of firms) {
      const firmName = FIRM_NAMES[firmCode] || firmCode;

      // Get all employees for this firm
      const employees = await db.employee.findMany({
        where: { firm: firmCode, status: 'Yes' },
        select: {
          employeeId: true, fullName: true, firm: true, department: true,
          designation: true, location: true, shiftHours: true,
          monthlySalary: true, hourlyRate: true, overtimeRate: true,
        },
        orderBy: { fullName: 'asc' },
      });

      if (employees.length === 0) continue;

      // Get attendance for all employees of this firm for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);

      const allAttendance = await db.attendance.findMany({
        where: {
          employeeId: { in: employees.map(e => e.employeeId) },
          date: { gte: startDate, lt: endDate },
        },
        orderBy: { date: 'asc' },
      });

      // Group attendance by employeeId -> day
      const attendanceByEmp = new Map<string, Map<number, any>>();
      for (const rec of allAttendance) {
        const recDate = new Date(rec.date);
        const day = recDate.getDate();
        if (!attendanceByEmp.has(rec.employeeId)) {
          attendanceByEmp.set(rec.employeeId, new Map());
        }
        attendanceByEmp.get(rec.employeeId)!.set(day, rec);
      }

      // ═══════════════════════════════════════════════════════════
      // BUILD THE SHEET matching template format:
      // Row 1: ATTENDENCE - 2026 | SALARY SHEET OF [FIRM] OF THE MONTH OF [MONTH] [YEAR]
      // Then 3 sections, each with:
      //   - Date header row (merged 3-col per day showing "1/06/2026" etc.)
      //   - IN/OUT/TOTAL HRS sub-header row
      //   - Employee data rows (one per employee)
      // Section 1: Days 1-11 (11 days × 3 cols = 33 data cols)
      // Section 2: Days 12-22 (11 days × 3 cols = 33 data cols)
      // Section 3: Days 23-31 (9 days × 3 cols + Total Working Hours + Leave = 29 data cols)
      // ═══════════════════════════════════════════════════════════

      const maxDataCols = 34; // 1 (EMP) + 11×3 = 34 max columns for sections 1&2
      const aoa: any[][] = [];
      const allMerges: XLSXStyle.Range[] = [];

      // ── Row 1: Title row ──
      const titleRow: any[] = ['ATTENDENCE - ' + year];
      for (let i = 1; i < maxDataCols; i++) titleRow.push('');
      titleRow[1] = `SALARY SHEET OF ${firmName} OF THE MONTH OF ${monthName.toUpperCase()} ${year}`;
      aoa.push(titleRow);
      // Merge B1 to last col
      allMerges.push({ s: { r: 0, c: 1 }, e: { r: 0, c: maxDataCols - 1 } });

      // ── Helper to format date like "1/06/2026" ──
      const formatDateHeader = (day: number): string => {
        return `${day}/${String(month).padStart(2, '0')}/${year}`;
      };

      // ── Build section function ──
      const buildSection = (
        sectionIdx: number,
        dayStart: number,
        dayEnd: number,
        extraCols: string[]  // e.g. ['Total Working Hours', 'Leave']
      ) => {
        const numDays = dayEnd - dayStart + 1;
        const dayColCount = numDays * 3;
        const totalDataCols = dayColCount + extraCols.length;
        const totalCols = 1 + totalDataCols;

        // ── Date header row ──
        const dateRow: any[] = [sectionIdx === 0 ? 'EMP' : ''];
        const merges: XLSXStyle.Range[] = [];

        for (let d = dayStart; d <= dayEnd; d++) {
          const colOffset = 1 + (d - dayStart) * 3;
          // Merge 3 cells for the date header
          merges.push({
            s: { r: aoa.length, c: colOffset },
            e: { r: aoa.length, c: colOffset + 2 },
          });
          dateRow.push(formatDateHeader(d));
          dateRow.push('');
          dateRow.push('');
        }

        // Extra column headers (merged if needed)
        let extraOffset = 1 + dayColCount;
        for (const extraCol of extraCols) {
          dateRow.push(extraCol);
          // No merge needed for single extra columns
        }

        // Pad row to maxDataCols
        while (dateRow.length < maxDataCols) dateRow.push('');

        aoa.push(dateRow);
        allMerges.push(...merges);

        // ── IN/OUT/TOTAL HRS sub-header row ──
        const subRow: any[] = [''];
        for (let d = dayStart; d <= dayEnd; d++) {
          subRow.push('IN');
          subRow.push('OUT');
          subRow.push('TOTAL HRS');
        }
        for (const extraCol of extraCols) {
          subRow.push('');  // Extra column sub-header (already in date header)
        }
        while (subRow.length < maxDataCols) subRow.push('');
        aoa.push(subRow);

        // ── Employee data rows ──
        for (const emp of employees) {
          const empAttendance = attendanceByEmp.get(emp.employeeId);
          const empRow: any[] = [emp.fullName];

          let totalWorkMin = 0;
          let absentDays = 0;

          for (let d = dayStart; d <= dayEnd; d++) {
            if (d > daysInMonth) {
              empRow.push('', '', '');
              continue;
            }

            const rec = empAttendance?.get(d);
            const dateObj = new Date(year, month - 1, d);
            const isSunday = dateObj.getDay() === 0;

            if (rec) {
              if (rec.status === 'absent') {
                empRow.push('A', '', '');
                absentDays++;
              } else if (rec.status === 'weekly-off') {
                if (rec.checkIn && rec.totalHours > 0) {
                  const inTime = rec.checkIn || '';
                  const outTime = rec.checkOut || '';
                  empRow.push(inTime, outTime, formatHours(rec.totalHours));
                  totalWorkMin += rec.totalHours * 60;
                } else {
                  empRow.push('WO', '', '');
                }
              } else if (rec.status === 'holiday') {
                if (rec.checkIn && rec.totalHours > 0) {
                  const inTime = rec.checkIn || '';
                  const outTime = rec.checkOut || '';
                  empRow.push(inTime, outTime, formatHours(rec.totalHours));
                  totalWorkMin += rec.totalHours * 60;
                } else {
                  empRow.push('H', '', '');
                }
              } else if (rec.halfDay) {
                const inTime = rec.checkIn || 'HD';
                const outTime = rec.checkOut || '';
                empRow.push(inTime, outTime, formatHours(rec.totalHours));
                totalWorkMin += rec.totalHours * 60;
                absentDays += 0.5;
              } else {
                // present, late, early-out
                const inTime = rec.checkIn || '';
                const outTime = rec.checkOut || '';
                empRow.push(inTime, outTime, formatHours(rec.totalHours));
                totalWorkMin += rec.totalHours * 60;
              }
            } else {
              // No record
              if (isSunday) {
                empRow.push('WO', '', '');
              } else {
                empRow.push('A', '', '');
                absentDays++;
              }
            }
          }

          // Extra columns data
          for (const extraCol of extraCols) {
            if (extraCol === 'Total Working Hours') {
              empRow.push(formatHours(totalWorkMin / 60));
            } else if (extraCol === 'Leave') {
              empRow.push(Math.round(absentDays));
            } else {
              empRow.push('');
            }
          }

          // Pad to maxDataCols
          while (empRow.length < maxDataCols) empRow.push('');
          aoa.push(empRow);
        }
      };

      // ── SECTION 1: Days 1-11 ──
      buildSection(0, 1, 11, []);

      // ── SECTION 2: Days 12-22 ──
      buildSection(1, 12, 22, []);

      // ── SECTION 3: Days 23-31 + Total Working Hours + Leave ──
      buildSection(2, 23, 31, ['Total Working Hours', 'Leave']);

      // ── Create worksheet ──
      const ws = XLSXStyle.utils.aoa_to_sheet(aoa);
      ws['!merges'] = allMerges;

      // ── STYLES ──

      // Row 1: Title row - Gold background
      for (let c = 0; c < maxDataCols; c++) {
        const addr = `${colLetter(c)}1`;
        if (!ws[addr]) {
          ws[addr] = { t: 's', v: '', s: {} };
        }
        ws[addr].s = {
          font: { bold: true, color: { rgb: WHITE }, sz: 14 },
          fill: { fgColor: { rgb: GOLD } },
          alignment: { horizontal: 'center' as const, vertical: 'center' as const },
          border: fullBorder(GOLD, 'medium'),
        };
      }

      // Style each section
      let currentRow = 2; // Start after title

      const styleSectionRows = (
        dayStart: number,
        dayEnd: number,
        numEmployees: number,
        extraCols: string[]
      ) => {
        const numDays = dayEnd - dayStart + 1;

        // ── Date header row ── Dark background, white text, bold date
        for (let c = 0; c < maxDataCols; c++) {
          const addr = `${colLetter(c)}${currentRow}`;
          if (!ws[addr]) {
            ws[addr] = { t: 's', v: '', s: {} };
          }

          // Check if this column is a Sunday
          const isSunday = (c > 0 && c <= numDays * 3) ? 
            new Date(year, month - 1, dayStart + Math.floor((c - 1) / 3)).getDay() === 0 : false;

          ws[addr].s = {
            font: { bold: true, color: { rgb: isSunday ? AMBER_HIGHLIGHT : WHITE }, sz: 11 },
            fill: { fgColor: { rgb: DARK } },
            alignment: { horizontal: 'center' as const, vertical: 'center' as const },
            border: fullBorder(WHITE, 'medium'),
          };
        }
        currentRow++;

        // ── Sub-header row (IN/OUT/TOTAL HRS) ── Deep blue
        for (let c = 0; c < maxDataCols; c++) {
          const addr = `${colLetter(c)}${currentRow}`;
          if (!ws[addr]) {
            ws[addr] = { t: 's', v: '', s: {} };
          }

          const isSunday = (c > 0 && c <= numDays * 3) ?
            new Date(year, month - 1, dayStart + Math.floor((c - 1) / 3)).getDay() === 0 : false;

          ws[addr].s = {
            font: { bold: true, color: { rgb: isSunday ? AMBER_HIGHLIGHT : WHITE }, sz: 9 },
            fill: { fgColor: { rgb: DEEP_BLUE } },
            alignment: { horizontal: 'center' as const, vertical: 'center' as const },
            border: fullBorder(DEEP_BLUE),
          };
        }
        currentRow++;

        // ── Employee data rows ──
        for (let eIdx = 0; eIdx < numEmployees; eIdx++) {
          const isEven = eIdx % 2 === 0;
          const bg = isEven ? LIGHT_BG : WHITE;

          for (let c = 0; c < maxDataCols; c++) {
            const addr = `${colLetter(c)}${currentRow}`;
            const cell = ws[addr];
            if (!cell) continue;

            const val = String(cell.v || '');

            if (c === 0) {
              // Employee name column
              cell.s = {
                font: { bold: true, sz: 10, color: { rgb: WHITE } },
                fill: { fgColor: { rgb: DEEP_BLUE } },
                alignment: { horizontal: 'left' as const, vertical: 'center' as const },
                border: fullBorder('FFFFFF', 'thin'),
              };
            } else if (val === 'A') {
              cell.s = {
                font: { bold: true, sz: 10, color: { rgb: 'DC2626' } },
                fill: { fgColor: { rgb: LIGHT_RED } },
                alignment: { horizontal: 'center' as const, vertical: 'center' as const },
                border: fullBorder('D0D0D0'),
              };
            } else if (val === 'WO') {
              cell.s = {
                font: { bold: true, sz: 10, color: { rgb: '059669' } },
                fill: { fgColor: { rgb: LIGHT_GREEN } },
                alignment: { horizontal: 'center' as const, vertical: 'center' as const },
                border: fullBorder('D0D0D0'),
              };
            } else if (val === 'H') {
              cell.s = {
                font: { bold: true, sz: 10, color: { rgb: '7C3AED' } },
                fill: { fgColor: { rgb: 'EDE9FE' } },
                alignment: { horizontal: 'center' as const, vertical: 'center' as const },
                border: fullBorder('D0D0D0'),
              };
            } else if (val === 'HD' || val.startsWith('HD')) {
              cell.s = {
                font: { bold: true, sz: 10, color: { rgb: 'D97706' } },
                fill: { fgColor: { rgb: LIGHT_AMBER } },
                alignment: { horizontal: 'center' as const, vertical: 'center' as const },
                border: fullBorder('D0D0D0'),
              };
            } else if (val === 'L') {
              cell.s = {
                font: { bold: true, sz: 10, color: { rgb: 'D97706' } },
                fill: { fgColor: { rgb: 'FEF3C7' } },
                alignment: { horizontal: 'center' as const, vertical: 'center' as const },
                border: fullBorder('D0D0D0'),
              };
            } else {
              // Default data cell
              // Check if this is a Sunday column - highlight with amber
              const dayIdx = (c > 0 && c <= numDays * 3) ? dayStart + Math.floor((c - 1) / 3) : -1;
              const isSundayCol = dayIdx > 0 && new Date(year, month - 1, dayIdx).getDay() === 0;

              if (isSundayCol && val) {
                cell.s = {
                  font: { sz: 9, color: { rgb: '059669' } },
                  fill: { fgColor: { rgb: LIGHT_GREEN } },
                  alignment: { horizontal: 'center' as const, vertical: 'center' as const },
                  border: fullBorder('D0D0D0'),
                };
              } else {
                cell.s = {
                  font: { sz: 9, color: { rgb: '333333' } },
                  fill: { fgColor: { rgb: bg } },
                  alignment: { horizontal: 'center' as const, vertical: 'center' as const },
                  border: fullBorder('D0D0D0'),
                };
              }
            }
          }
          currentRow++;
        }
      };

      // Style section 1
      styleSectionRows(1, 11, employees.length, []);
      // Style section 2
      styleSectionRows(12, 22, employees.length, []);
      // Style section 3
      styleSectionRows(23, 31, employees.length, ['Total Working Hours', 'Leave']);

      // ── Column widths ──
      const colWidths: { wch: number }[] = [{ wch: 22 }]; // Column A = employee name
      // Each day: IN(8), OUT(8), TOTAL HRS(12)
      for (let s = 0; s < 3; s++) {
        const dayStart = s === 0 ? 1 : s === 1 ? 12 : 23;
        const dayEnd = s === 0 ? 11 : s === 1 ? 22 : 31;
        for (let d = dayStart; d <= dayEnd; d++) {
          colWidths.push({ wch: 8 });  // IN
          colWidths.push({ wch: 8 });  // OUT
          colWidths.push({ wch: 12 }); // TOTAL HRS
        }
        if (s === 2) {
          colWidths.push({ wch: 16 }); // Total Working Hours
          colWidths.push({ wch: 8 });  // Leave
        }
      }
      // Pad to maxDataCols
      while (colWidths.length < maxDataCols) colWidths.push({ wch: 8 });
      ws['!cols'] = colWidths;

      // Sheet name (max 31 chars for Excel)
      const sheetName = firmCode.length <= 31 ? firmCode : firmCode.substring(0, 31);
      XLSXStyle.utils.book_append_sheet(wb, ws, sheetName);
    }

    if (wb.SheetNames.length === 0) {
      return NextResponse.json({ error: 'No employees found for the selected firm(s)' }, { status: 400 });
    }

    const buf = XLSXStyle.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Master_Sheet_${monthName}_${year}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Master export error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
