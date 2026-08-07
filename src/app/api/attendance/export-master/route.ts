import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSXStyle from 'xlsx-js-style';
import {
  getEffectiveCutoffDay,
  countHolidaysUpTo,
  getActualShiftHours,
  recomputeStatus,
} from '@/lib/payroll-calc';

// Master Excel Sheet Export
// Generates a single Excel file with firm-wise sheets
// Each sheet matches the "Laxree Group Monthly Excel Formate.xlsx" template:
// - 3 sections: Days 1-11, Days 12-22, Days 23-lastDayOfMonth
// - Each day has 3 columns: IN, OUT, TOTAL HRS
// - Section 3 ends with Total Working Hours + Leave columns
// - Date headers show actual dates like "1/06/2026"
// - Sections dynamically adjust for month length (28/29/30/31 days)
// - Future dates in current month are left blank (not counted as absent)
// - Total Working Hours & Leave are FULL-MONTH cumulative values (not just section 3)

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

// ── Display a TRUE-DECIMAL value as HH:MM by splitting on the decimal point ──
// e.g., 202.43 → "202:43", 9.5 → "9:50", 238.43 → "238:43"
// This matches Attendance Tracker's `displayDecimalAsColon` so the TOTAL row
// of the Master Sheet shows the SAME value the user sees in the UI.
// (The bug: `formatHours(202.43)` returned "202:26" because 0.43×60=26 min —
// that's a real time conversion, but the user wants the verbatim decimal split
// to match what Attendance Tracker displays.)
function displayDecimalAsColon(value: number | undefined | null): string {
  if (value == null || isNaN(value as number)) return '0:00';
  const [intPart, decPart] = Number(value).toFixed(2).split('.');
  return `${intPart}:${decPart}`;
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
          shiftStart: true, shiftEnd: true,  // <-- needed for half-day recompute
          monthlySalary: true, hourlyRate: true, overtimeRate: true,
          relievingDate: true,  // <-- needed for cutoff-day calculation
        },
        orderBy: { fullName: 'asc' },
      });

      if (employees.length === 0) continue;

      // Get attendance for all employees of this firm for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);

      const [allAttendance, holidays, allLeaves] = await Promise.all([
        db.attendance.findMany({
          where: {
            employeeId: { in: employees.map(e => e.employeeId) },
            date: { gte: startDate, lt: endDate },
          },
          orderBy: { date: 'asc' },
        }),
        db.holiday.findMany({ where: { date: { gte: startDate, lt: endDate } } }),
        db.leave.findMany({
          where: {
            employeeId: { in: employees.map(e => e.employeeId) },
            status: 'approved',
            // Use OVERLAP query: a leave overlaps the month if
            // leave.startDate < endOfMonth AND leave.endDate >= startOfMonth.
            // The previous query (startDate >= startOfMonth AND endDate < endOfMonth)
            // MISSED leaves that span month boundaries (e.g., June 27 to July 1
            // was excluded from July because leave.startDate < July 1).
            startDate: { lt: endDate },
            endDate: { gte: startDate },
          },
        }),
      ]);

      // Build a set of holiday day-numbers for quick lookup
      const holidayDaySet = new Set<number>(
        holidays.map(h => new Date(h.date).getDate())
      );

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

      // Group leaves by employeeId -> set of date strings (YYYY-MM-DD)
      // Only working-day leaves (not Sunday, not holiday, not already-present)
      // are counted as effective leave days.
      const leavesByEmp = new Map<string, Set<string>>();
      for (const lv of allLeaves) {
        if (!leavesByEmp.has(lv.employeeId)) {
          leavesByEmp.set(lv.employeeId, new Set());
        }
        const set = leavesByEmp.get(lv.employeeId)!;
        const start = new Date(lv.startDate);
        const end = new Date(lv.endDate);
        const cur = new Date(start);
        while (cur <= end) {
          const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
          set.add(dateStr);
          cur.setDate(cur.getDate() + 1);
        }
      }

      // ═══════════════════════════════════════════════════════════
      // PRE-COMPUTE full-month totals per employee
      // This ensures Total Working Hours & Leave are correct
      // regardless of which section they appear in
      // ═══════════════════════════════════════════════════════════
      const empTotals = new Map<string, { totalWorkHrs: number; absentDays: number; presentDays: number; leaveDays: number }>();

      for (const emp of employees) {
        const empAttendance = attendanceByEmp.get(emp.employeeId);
        const empLeaveDays = leavesByEmp.get(emp.employeeId) || new Set<string>();
        let totalWorkHrs = 0;
        let absentDays = 0;
        let presentDays = 0;
        let leaveDays = 0;

        // ── Per-employee cutoff: respect relieving date (Bug #1 fix) ──
        const empCutoffDay = getEffectiveCutoffDay(year, month, daysInMonth, emp.relievingDate);

        // ── Compute this employee's actual shift hours (shared helper) ──
        const actualShiftHours = getActualShiftHours(emp.shiftHours, emp.shiftStart, emp.shiftEnd);

        // Build a set of present-date-strings for this employee (for leave overlap check)
        const presentDateStrs = new Set<string>();
        if (empAttendance) {
          for (const [dayNum, rec] of empAttendance.entries()) {
            const correctedStatus = recomputeStatus(rec, actualShiftHours, emp.shiftStart, emp.shiftEnd);
            if (['present', 'late', 'early-out', 'half-day', 'half_day'].includes(correctedStatus)) {
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              presentDateStrs.add(dateStr);
            }
          }
        }

        for (let d = 1; d <= daysInMonth; d++) {
          const dateObj = new Date(year, month - 1, d);
          const isSunday = dateObj.getDay() === 0;
          const isHoliday = holidayDaySet.has(d);

          // Skip future dates for current month OR days beyond the per-employee cutoff
          if (d > empCutoffDay) continue;

          const rec = empAttendance?.get(d);
          // Recompute the status on-the-fly using the shared helper
          const correctedStatus = rec ? recomputeStatus(rec, actualShiftHours, emp.shiftStart, emp.shiftEnd) : '';

          if (rec) {
            if (correctedStatus === 'absent') {
              // The bulk-upload route creates an attendance record with
              // status='absent' when an employee doesn't punch in. So a
              // full-day leave (no punch in) ALSO has an 'absent' record.
              // We must check the Leave table to decide whether this is
              // a genuine absent or an approved leave.
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const isLeaveDay = empLeaveDays.has(dateStr) && !presentDateStrs.has(dateStr);
              if (isLeaveDay && !isSunday && !isHoliday) {
                // Full-day leave (no punch in, but leave record exists)
                leaveDays++;
              } else {
                absentDays++;
              }
            } else if (correctedStatus === 'weekly-off') {
              if (rec.checkIn && rec.totalHours > 0) {
                totalWorkHrs += rec.totalHours;
                presentDays++;
              }
              // WO without checkIn doesn't count as absent
            } else if (correctedStatus === 'holiday') {
              if (rec.checkIn && rec.totalHours > 0) {
                totalWorkHrs += rec.totalHours;
                presentDays++;
              }
              // Holiday without checkIn doesn't count as absent
            } else if (correctedStatus === 'half-day' || correctedStatus === 'half_day') {
              // Genuinely a half-day (worked < half the actual shift).
              // IMPORTANT: A half-day is NOT a leave. It counts as 0.5 present day
              // and 0.5 absent day, but NOT as a leave. Only full-day leaves
              // (from the Leave table) are counted in the Leave column.
              totalWorkHrs += rec.totalHours;
              presentDays += 0.5;
              absentDays += 0.5;
            } else {
              // present, late, early-out (includes recomputed-from-half-day)
              totalWorkHrs += rec.totalHours;
              presentDays++;
            }
          } else {
            // No record — check if it's a leave day before counting as absent
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isLeaveDay = empLeaveDays.has(dateStr) && !presentDateStrs.has(dateStr);
            if (isSunday || isHoliday) {
              // Sundays / holidays without record = NOT absent, NOT leave
            } else if (isLeaveDay) {
              // Full-day leave (from Leave table) — count ONLY these as leave
              leaveDays++;
            } else {
              absentDays++;
            }
          }
        }

        empTotals.set(emp.employeeId, { totalWorkHrs, absentDays, presentDays, leaveDays });
      }

      // ═══════════════════════════════════════════════════════════
      // DYNAMIC SECTION BOUNDARIES based on daysInMonth
      // Section 1: Days 1-11 (always same)
      // Section 2: Days 12-22 (always same)
      // Section 3: Days 23-lastDay (varies: 28/29/30/31)
      // ═══════════════════════════════════════════════════════════
      const section1End = 11;
      const section2End = 22;
      const section3End = daysInMonth; // 28, 29, 30, or 31

      // Max columns: Section 1 & 2 have 11 days × 3 = 33 data cols
      // Section 3 has (daysInMonth - 22) days × 3 + 2 extra = varies
      const s3DayCount = section3End - 22;
      const s3DataCols = s3DayCount * 3 + 2; // +2 for Total Working Hours + Leave
      const maxDataCols = Math.max(1 + 11 * 3, 1 + s3DataCols) + 2; // +2 buffer

      const aoa: any[][] = [];
      const allMerges: XLSXStyle.Range[] = [];

      // ── Row 1: Title row ──
      const titleRow: any[] = ['ATTENDENCE - ' + year];
      for (let i = 1; i < maxDataCols; i++) titleRow.push('');
      titleRow[1] = `SALARY SHEET OF ${firmName} OF THE MONTH OF ${monthName.toUpperCase()} ${year}`;
      aoa.push(titleRow);
      allMerges.push({ s: { r: 0, c: 1 }, e: { r: 0, c: maxDataCols - 1 } });

      // ── Helper to format date like "1/06/2026" ──
      const formatDateHeader = (day: number): string => {
        return `${day}/${String(month).padStart(2, '0')}/${year}`;
      };

      // ── Build section function ──
      // Returns the row data and merges for a section
      const buildSection = (
        sectionIdx: number,
        dayStart: number,
        dayEnd: number,
        extraCols: string[]
      ) => {
        const numDays = dayEnd - dayStart + 1;
        const dayColCount = numDays * 3;

        // ── Date header row ──
        const dateRow: any[] = [sectionIdx === 0 ? 'EMP' : ''];
        const merges: XLSXStyle.Range[] = [];

        for (let d = dayStart; d <= dayEnd; d++) {
          const colOffset = 1 + (d - dayStart) * 3;
          merges.push({
            s: { r: aoa.length, c: colOffset },
            e: { r: aoa.length, c: colOffset + 2 },
          });
          dateRow.push(formatDateHeader(d));
          dateRow.push('');
          dateRow.push('');
        }

        // Extra column headers
        for (const extraCol of extraCols) {
          dateRow.push(extraCol);
        }

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
          subRow.push('');
        }
        while (subRow.length < maxDataCols) subRow.push('');
        aoa.push(subRow);

        // ── Employee data rows ──
        for (const emp of employees) {
          const empAttendance = attendanceByEmp.get(emp.employeeId);
          const empLeaveDays = leavesByEmp.get(emp.employeeId) || new Set<string>();
          const empRow: any[] = [emp.fullName];

          // Per-employee cutoff (respects relieving date) — used to blank out
          // post-relieving day cells instead of marking them 'Absent'
          const empCutoffDay = getEffectiveCutoffDay(year, month, daysInMonth, emp.relievingDate);

          // Actual shift hours for this employee (shared helper, with 12-hour fix-up)
          const actualShiftHours = getActualShiftHours(emp.shiftHours, emp.shiftStart, emp.shiftEnd);

          // Build present-date-str set for this employee (for leave overlap check)
          const presentDateStrs = new Set<string>();
          if (empAttendance) {
            for (const [dayNum, rec] of empAttendance.entries()) {
              const cs = recomputeStatus(rec, actualShiftHours, emp.shiftStart, emp.shiftEnd);
              if (['present', 'late', 'early-out', 'half-day', 'half_day'].includes(cs)) {
                presentDateStrs.add(`${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`);
              }
            }
          }

          for (let d = dayStart; d <= dayEnd; d++) {
            if (d > daysInMonth) {
              empRow.push('', '', '');
              continue;
            }

            const rec = empAttendance?.get(d);
            const dateObj = new Date(year, month - 1, d);
            const isSunday = dateObj.getDay() === 0;
            const isHoliday = holidayDaySet.has(d);

            // Days beyond the per-employee cutoff (post-relieving or future)
            // = leave blank, do NOT mark 'Absent'
            if (d > empCutoffDay) {
              if (isSunday) {
                empRow.push('Weekly Off', '', '');
              } else if (isHoliday) {
                empRow.push('Holiday', '', '');
              } else {
                empRow.push('', '', '');
              }
              continue;
            }

            if (rec) {
              // Use recomputed status (handles wrongly-marked half-day AND early-out)
              const correctedStatus = recomputeStatus(rec, actualShiftHours, emp.shiftStart, emp.shiftEnd);
              if (correctedStatus === 'absent') {
                // The bulk-upload route creates an 'absent' attendance record
                // when an employee doesn't punch in. So a full-day leave also
                // has an 'absent' record. Check the Leave table to decide
                // whether to display 'Leave' or 'Absent'.
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isLeaveDay = empLeaveDays.has(dateStr) && !presentDateStrs.has(dateStr);
                if (isLeaveDay && !isSunday && !isHoliday) {
                  empRow.push('Leave', '', '');
                } else {
                  empRow.push('Absent', '', '');
                }
              } else if (correctedStatus === 'weekly-off') {
                if (rec.checkIn && rec.totalHours > 0) {
                  empRow.push(rec.checkIn || '', rec.checkOut || '', formatHours(rec.totalHours));
                } else {
                  empRow.push('Weekly Off', '', '');
                }
              } else if (correctedStatus === 'holiday') {
                if (rec.checkIn && rec.totalHours > 0) {
                  empRow.push(rec.checkIn || '', rec.checkOut || '', formatHours(rec.totalHours));
                } else {
                  empRow.push('Holiday', '', '');
                }
              } else if (correctedStatus === 'half-day' || correctedStatus === 'half_day') {
                // Genuinely a half-day — display with "Half Day" label
                empRow.push(rec.checkIn || 'Half Day', rec.checkOut || '', formatHours(rec.totalHours));
              } else {
                // present, late, early-out (includes recomputed-from-half-day)
                empRow.push(rec.checkIn || '', rec.checkOut || '', formatHours(rec.totalHours));
              }
            } else {
              // No record — check leave day before marking absent
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const isLeaveDay = empLeaveDays.has(dateStr) && !presentDateStrs.has(dateStr);
              if (isSunday) {
                empRow.push('Weekly Off', '', '');
              } else if (isHoliday) {
                empRow.push('Holiday', '', '');
              } else if (isLeaveDay) {
                empRow.push('Leave', '', '');
              } else {
                empRow.push('Absent', '', '');
              }
            }
          }

          // Extra columns data - use FULL-MONTH pre-computed totals
          const totals = empTotals.get(emp.employeeId);
          for (const extraCol of extraCols) {
            if (extraCol === 'Total Working Hours') {
              // Use displayDecimalAsColon so the Master Sheet TOTAL matches
              // Attendance Tracker's "Total Hrs Worked" exactly (e.g., 202:43).
              // Was: formatHours(202.43) → "202:26" (wrong time conversion).
              empRow.push(displayDecimalAsColon(totals?.totalWorkHrs || 0));
            } else if (extraCol === 'Leave') {
              // Only count FULL-DAY leaves (from Leave table) as Leave.
              // Half-days are NOT leaves — they are 0.5 present + 0.5 absent.
              empRow.push(totals?.leaveDays || 0);
            } else {
              empRow.push('');
            }
          }

          while (empRow.length < maxDataCols) empRow.push('');
          aoa.push(empRow);
        }
      };

      // ── SECTION 1: Days 1-11 ──
      buildSection(0, 1, section1End, []);

      // ── SECTION 2: Days 12-22 ──
      buildSection(1, 12, section2End, []);

      // ── SECTION 3: Days 23-lastDay + Total Working Hours + Leave ──
      buildSection(2, 23, section3End, ['Total Working Hours', 'Leave']);

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
      let currentRow = 2;

      const styleSectionRows = (
        dayStart: number,
        dayEnd: number,
        numEmployees: number,
        extraCols: string[]
      ) => {
        const numDays = dayEnd - dayStart + 1;
        const dayColCount = numDays * 3;

        // ── Date header row ── Dark background, white text
        for (let c = 0; c < maxDataCols; c++) {
          const addr = `${colLetter(c)}${currentRow}`;
          if (!ws[addr]) {
            ws[addr] = { t: 's', v: '', s: {} };
          }

          const dayIdx = (c > 0 && c <= dayColCount) ? dayStart + Math.floor((c - 1) / 3) : -1;
          const isSunday = dayIdx > 0 && dayIdx <= daysInMonth && new Date(year, month - 1, dayIdx).getDay() === 0;

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

          const dayIdx = (c > 0 && c <= dayColCount) ? dayStart + Math.floor((c - 1) / 3) : -1;
          const isSunday = dayIdx > 0 && dayIdx <= daysInMonth && new Date(year, month - 1, dayIdx).getDay() === 0;

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
            const dayIdx = (c > 0 && c <= dayColCount) ? dayStart + Math.floor((c - 1) / 3) : -1;
            const isSundayCol = dayIdx > 0 && dayIdx <= daysInMonth && new Date(year, month - 1, dayIdx).getDay() === 0;

            if (c === 0) {
              // Employee name column
              cell.s = {
                font: { bold: true, sz: 10, color: { rgb: WHITE } },
                fill: { fgColor: { rgb: DEEP_BLUE } },
                alignment: { horizontal: 'left' as const, vertical: 'center' as const },
                border: fullBorder('FFFFFF', 'thin'),
              };
            } else if (val === 'Absent') {
              // Absent - red on light red
              cell.s = {
                font: { bold: true, sz: 9, color: { rgb: 'DC2626' } },
                fill: { fgColor: { rgb: LIGHT_RED } },
                alignment: { horizontal: 'center' as const, vertical: 'center' as const },
                border: fullBorder('D0D0D0'),
              };
            } else if (val === 'Leave') {
              // Leave - blue on light blue (distinct from Absent)
              cell.s = {
                font: { bold: true, sz: 9, color: { rgb: '1D4ED8' } },
                fill: { fgColor: { rgb: 'EFF6FF' } },
                alignment: { horizontal: 'center' as const, vertical: 'center' as const },
                border: fullBorder('D0D0D0'),
              };
            } else if (val === 'Weekly Off') {
              // Weekly Off - teal/emerald on light green
              cell.s = {
                font: { bold: true, sz: 9, color: { rgb: '0D9488' } },
                fill: { fgColor: { rgb: LIGHT_GREEN } },
                alignment: { horizontal: 'center' as const, vertical: 'center' as const },
                border: fullBorder('D0D0D0'),
              };
            } else if (val === 'Holiday') {
              // Holiday - purple on light purple
              cell.s = {
                font: { bold: true, sz: 9, color: { rgb: '7C3AED' } },
                fill: { fgColor: { rgb: 'F5F3FF' } },
                alignment: { horizontal: 'center' as const, vertical: 'center' as const },
                border: fullBorder('D0D0D0'),
              };
            } else if (val === 'Half Day' || val.startsWith('Half Day')) {
              // Half Day - amber on light amber
              cell.s = {
                font: { bold: true, sz: 9, color: { rgb: 'D97706' } },
                fill: { fgColor: { rgb: LIGHT_AMBER } },
                alignment: { horizontal: 'center' as const, vertical: 'center' as const },
                border: fullBorder('D0D0D0'),
              };
            } else if (isSundayCol && val) {
              // Sunday with data - green text on light green
              cell.s = {
                font: { sz: 9, color: { rgb: '059669' } },
                fill: { fgColor: { rgb: LIGHT_GREEN } },
                alignment: { horizontal: 'center' as const, vertical: 'center' as const },
                border: fullBorder('D0D0D0'),
              };
            } else {
              // Default data cell - normal text on alternating bg
              cell.s = {
                font: { sz: 9, color: { rgb: '333333' } },
                fill: { fgColor: { rgb: bg } },
                alignment: { horizontal: 'center' as const, vertical: 'center' as const },
                border: fullBorder('D0D0D0'),
              };
            }
          }
          currentRow++;
        }
      };

      // Style section 1
      styleSectionRows(1, section1End, employees.length, []);
      // Style section 2
      styleSectionRows(12, section2End, employees.length, []);
      // Style section 3
      styleSectionRows(23, section3End, employees.length, ['Total Working Hours', 'Leave']);

      // ── Column widths ──
      const colWidths: { wch: number }[] = [{ wch: 22 }];
      const sectionBoundaries = [
        { start: 1, end: section1End, extras: [] },
        { start: 12, end: section2End, extras: [] },
        { start: 23, end: section3End, extras: ['Total Working Hours', 'Leave'] },
      ];

      for (const sec of sectionBoundaries) {
        for (let d = sec.start; d <= sec.end; d++) {
          colWidths.push({ wch: 8 });  // IN
          colWidths.push({ wch: 8 });  // OUT
          colWidths.push({ wch: 12 }); // TOTAL HRS
        }
        for (const extra of sec.extras) {
          colWidths.push({ wch: extra === 'Total Working Hours' ? 16 : 8 });
        }
      }

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
