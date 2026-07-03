import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSXStyle from 'xlsx-js-style';

// Master Excel Sheet Export
// Generates a single Excel file with firm-wise sheets
// Each sheet has the calendar-style monthly attendance format matching
// the "Laxree Group Monthly Excel Formate.xlsx" template

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

function formatOT(decimal: number): string {
  if (!decimal || decimal === 0) return '0m';
  const totalMinutes = Math.round(decimal * 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

// Color constants
const GOLD = 'D4A843';
const DARK = '1A1A1A';
const WHITE = 'FFFFFF';
const EMERALD = '059669';
const RED = 'DC2626';
const AMBER = 'D97706';
const CYAN = '0891B2';
const AMBER_HIGHLIGHT = 'FFC000'; // Sunday highlight from template
const LIGHT_BG = 'FFF8E7';
const LIGHT_GREEN = 'ECFDF5';
const LIGHT_RED = 'FEF2F2';
const LIGHT_AMBER = 'FFFBEB';
const NAVY = '1E3A5F';
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

const safeStyle = (ws: any, cellRef: string, style: any) => {
  if (ws[cellRef]) ws[cellRef].s = style;
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

      // Group attendance by employeeId
      const attendanceByEmp = new Map<string, Map<number, any>>();
      for (const rec of allAttendance) {
        const recDate = new Date(rec.date);
        const day = recDate.getDate();
        if (!attendanceByEmp.has(rec.employeeId)) {
          attendanceByEmp.set(rec.employeeId, new Map());
        }
        attendanceByEmp.get(rec.employeeId)!.set(day, rec);
      }

      // ── Build the calendar-style sheet ──
      // Layout matching Laxree Group Monthly Excel Formate:
      // Row 1: Title (merged) - SALARY SHEET OF [FIRM] OF THE MONTH OF [MONTH] [YEAR]
      // Row 2: Date headers (each date gets 3 columns: IN, OUT, TOTAL HRS) - we show 1-11 in first section
      // Row 3: Sub-headers: IN | OUT | TOTAL HRS repeating
      // Rows 4+: Employee data rows (name in col A, then attendance data)
      // 
      // Since xlsx-js-style doesn't support very wide sheets well with 3-col-per-day,
      // we'll use a practical approach: each day gets 2 columns (IN, OUT) + one TOTAL HRS column
      // But for readability, we'll use a single-column-per-day approach with status

      // PRACTICAL APPROACH: Compact calendar layout
      // Row 1: Title
      // Row 2: Column headers - Emp Name | 1 | 2 | 3 | ... | 31 | Total Hrs | OT | Present | Absent | Status Summary
      // Row 3: Day names - Day | Mon | Tue | Wed | ... | Thu | 
      // Rows 4+: Employee data

      // Actually let's match the format more closely with the user's template:
      // The template has IN/OUT/TOTAL HRS per day across 3 columns
      // Let's build it that way with sections of ~10 days each to fit page width

      // SECTION APPROACH: 
      // Each section has ~10-11 days with 3 columns each (IN, OUT, TOTAL HRS)
      // Plus employee name column (A)
      // Section 1: Days 1-11, Section 2: Days 12-22, Section 3: Days 23-31

      // But for xlsx-js-style, this is very complex. Let's use a SIMPLER but matching format:
      // Column A: Employee Name
      // Columns B onwards: Each day has 1 column showing "IN-OUT" or status
      // Last columns: Total Working Hours, Leave, Present Days, Absent Days

      // FINAL APPROACH - Match template closely:
      // Row 1: Title merged across
      // Row 2: Firm info
      // Row 3: Column headers: EMP | 1-Jun | 2-Jun | 3-Jun | ... | 30-Jun | Total Hrs | OT | Present | Absent
      // Row 4+: Data: Name | IN-OUT/status per day | totals
      
      const totalCols = 1 + daysInMonth + 4; // A (name) + days + Total Hrs + OT + Present + Absent

      // Build header row 1: Title
      const titleRow: any[] = [`SALARY SHEET OF ${firmName} OF THE MONTH OF ${monthName.toUpperCase()} ${year}`];
      for (let i = 1; i < totalCols; i++) titleRow.push('');

      // Build header row 2: Day numbers with date format like "1 Jun", "2 Jun"
      const dayHeaderRow: any[] = ['EMPLOYEE'];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month - 1, d);
        const dayNum = dateObj.getDate();
        const monthAbbr = monthName.substring(0, 3);
        dayHeaderRow.push(`${dayNum} ${monthAbbr}`);
      }
      dayHeaderRow.push('Total Working Hours');
      dayHeaderRow.push('OT Hours');
      dayHeaderRow.push('Present');
      dayHeaderRow.push('Absent');

      // Build header row 3: Day names
      const dayNameRow: any[] = [''];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month - 1, d);
        dayNameRow.push(DAY_ABBR[dateObj.getDay()]);
      }
      dayNameRow.push('', '', '', '');

      // Build data rows
      const dataRows: any[][] = [];
      for (const emp of employees) {
        const empAttendance = attendanceByEmp.get(emp.employeeId);
        const row: any[] = [emp.fullName];

        let presentDays = 0;
        let absentDays = 0;
        let totalWorkHrs = 0;
        let totalOT = 0;

        for (let d = 1; d <= daysInMonth; d++) {
          const dateObj = new Date(year, month - 1, d);
          const isSunday = dateObj.getDay() === 0;
          const rec = empAttendance?.get(d);

          if (rec) {
            if (rec.checkIn && rec.checkOut) {
              const [h1, m1] = rec.checkIn.split(':').map(Number);
              const [h2, m2] = rec.checkOut.split(':').map(Number);
              const workMin = Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
              totalWorkHrs += workMin;
            }
            if (rec.overtimeHours > 0) {
              totalOT += rec.overtimeHours * 60;
            }

            if (['present', 'late', 'early-out'].includes(rec.status)) {
              presentDays++;
              // Show IN-OUT format
              if (rec.checkIn && rec.checkOut) {
                row.push(`${rec.checkIn}-${rec.checkOut}`);
              } else {
                row.push('P');
              }
            } else if (rec.status === 'half-day' || rec.halfDay) {
              presentDays += 0.5;
              absentDays += 0.5;
              row.push('HD');
            } else if (rec.status === 'absent') {
              absentDays++;
              row.push('A');
            } else if (rec.status === 'weekly-off' || isSunday) {
              row.push('WO');
            } else if (rec.status === 'holiday') {
              row.push('PH');
            } else {
              row.push(rec.status.charAt(0).toUpperCase());
            }
          } else {
            // No record
            if (isSunday) {
              row.push('WO');
            } else {
              row.push('');
            }
          }
        }

        // Summary columns
        row.push(formatHours(totalWorkHrs / 60));
        row.push(totalOT > 0 ? formatOT(totalOT / 60) : '0m');
        row.push(presentDays);
        row.push(Math.round(absentDays));

        dataRows.push(row);
      }

      // Create the worksheet
      const allRows: any[][] = [titleRow, dayHeaderRow, dayNameRow, ...dataRows];
      const ws = XLSXStyle.utils.aoa_to_sheet(allRows);

      // Build column refs properly (A-Z, then AA, AB, etc.)
      const getColRef = (colIdx: number): string => {
        if (colIdx < 26) return String.fromCharCode(65 + colIdx);
        return String.fromCharCode(65 + Math.floor(colIdx / 26) - 1) + String.fromCharCode(65 + (colIdx % 26));
      };

      // Build all column refs for styling
      const allColRefs: string[] = [];
      for (let i = 0; i < totalCols; i++) {
        allColRefs.push(getColRef(i));
      }

      // Style title row
      for (let i = 0; i < totalCols; i++) {
        safeStyle(ws, `${getColRef(i)}1`, {
          font: { bold: true, color: { rgb: GOLD }, sz: 14 },
          fill: { fgColor: { rgb: DARK } },
          alignment: { horizontal: 'center' as const, vertical: 'center' as const },
          border: goldBorder,
        });
      }

      // Style day header row
      for (let i = 0; i < totalCols; i++) {
        const isSunday = (i > 0 && i <= daysInMonth) ? new Date(year, month - 1, i).getDay() === 0 : false;
        safeStyle(ws, `${getColRef(i)}2`, {
          font: { bold: true, color: { rgb: WHITE }, sz: 10 },
          fill: { fgColor: { rgb: isSunday ? AMBER_HIGHLIGHT : EMERALD } },
          alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
          border: fullBorder(WHITE, 'medium'),
        });
      }

      // Style day name row
      for (let i = 0; i < totalCols; i++) {
        const isSunday = (i > 0 && i <= daysInMonth) ? new Date(year, month - 1, i).getDay() === 0 : false;
        safeStyle(ws, `${getColRef(i)}3`, {
          font: { bold: true, color: { rgb: isSunday ? AMBER_HIGHLIGHT : '888888' }, sz: 8 },
          fill: { fgColor: { rgb: '2D2D2D' } },
          alignment: { horizontal: 'center' as const, vertical: 'center' as const },
          border: fullBorder('444444'),
        });
      }

      // Style data rows
      for (let r = 0; r < dataRows.length; r++) {
        const excelRow = r + 4; // Row 4 onwards
        const bg = r % 2 === 0 ? LIGHT_BG : undefined;

        for (let i = 0; i < totalCols; i++) {
          const cellRef = `${getColRef(i)}${excelRow}`;
          const cell = ws[cellRef];
          if (!cell) continue;

          const val = String(cell.v || '');

          if (i === 0) {
            // Employee name column
            cell.s = {
              font: { bold: true, sz: 10, color: { rgb: WHITE } },
              fill: { fgColor: { rgb: NAVY } },
              alignment: { horizontal: 'left' as const, vertical: 'center' as const },
              border: fullBorder('FFFFFF', 'thin'),
            };
          } else if (val === 'A') {
            cell.s = {
              font: { bold: true, sz: 10, color: { rgb: RED } },
              fill: { fgColor: { rgb: LIGHT_RED } },
              alignment: { horizontal: 'center' as const, vertical: 'center' as const },
              border: fullBorder('D0D0D0'),
            };
          } else if (val === 'P' || val.includes('-')) {
            cell.s = {
              font: { sz: 9, color: { rgb: EMERALD } },
              fill: { fgColor: { rgb: LIGHT_GREEN } },
              alignment: { horizontal: 'center' as const, vertical: 'center' as const },
              border: fullBorder('D0D0D0'),
            };
          } else if (val === 'WO') {
            cell.s = {
              font: { bold: true, sz: 10, color: { rgb: AMBER_HIGHLIGHT } },
              fill: { fgColor: { rgb: '2D2D2D' } },
              alignment: { horizontal: 'center' as const, vertical: 'center' as const },
              border: fullBorder('D0D0D0'),
            };
          } else if (val === 'HD') {
            cell.s = {
              font: { bold: true, sz: 10, color: { rgb: AMBER } },
              fill: { fgColor: { rgb: LIGHT_AMBER } },
              alignment: { horizontal: 'center' as const, vertical: 'center' as const },
              border: fullBorder('D0D0D0'),
            };
          } else if (val === 'PH') {
            cell.s = {
              font: { bold: true, sz: 10, color: { rgb: '7C3AED' } },
              fill: { fgColor: { rgb: 'F5F3FF' } },
              alignment: { horizontal: 'center' as const, vertical: 'center' as const },
              border: fullBorder('D0D0D0'),
            };
          } else {
            // Default data cell
            cell.s = {
              font: { sz: 10, color: { rgb: '333333' } },
              fill: bg ? { fgColor: { rgb: bg } } : undefined,
              alignment: { horizontal: 'center' as const, vertical: 'center' as const },
              border: fullBorder('D0D0D0'),
            };
          }
        }
      }

      // Column widths
      ws['!cols'] = [];
      ws['!cols'][0] = { wch: 30 }; // Employee name
      for (let d = 1; d <= daysInMonth; d++) {
        ws['!cols'][d] = { wch: 12 }; // Day columns
      }
      ws['!cols'][daysInMonth + 1] = { wch: 18 }; // Total Working Hours
      ws['!cols'][daysInMonth + 2] = { wch: 12 }; // OT Hours
      ws['!cols'][daysInMonth + 3] = { wch: 10 }; // Present
      ws['!cols'][daysInMonth + 4] = { wch: 10 }; // Absent

      // Merged cells - title row
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },  // Title
      ];

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
