import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';
import { db } from '@/lib/db';
import {
  getEffectiveCutoffDay,
  countSundaysUpTo,
  countHolidaysUpTo,
  filterAttendanceUpTo,
  getActualShiftHours,
  recomputeStatus,
} from '@/lib/payroll-calc';

// ════════════════════════════════════════════════════════════
// Payroll Summary Export — matches Payroll_July_2026.xlsx format
// Sheet 1: "Payroll Register" — one row per employee with all
//          payroll columns + TOTAL row at the bottom.
// Sheet 2: "Summary" — aggregate totals (Total Gross, OT, Bonus,
//          Deductions, Net Payroll, Employees Processed, Avg Net,
//          Total OT Hours).
// ════════════════════════════════════════════════════════════

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Theme colors ──
const GOLD       = 'D4A843';
const DARK       = '1A1A1A';
const WHITE      = 'FFFFFF';
const EMERALD    = '059669';
const DEEP_BLUE  = '1E3A5F';
const LIGHT_BG   = 'FFF8E7';
const LIGHT_GREEN = 'ECFDF5';
const LIGHT_AMBER = 'FFFBEB';
const LIGHT_RED   = 'FEF2F2';
const LIGHT_BLUE  = 'DBEAFE';
const RED         = 'DC2626';
const AMBER       = 'D97706';
const CYAN        = '0891B2';
const PURPLE      = '7C3AED';
const SKY         = '0284C7';

// ── Helpers ──

function getFirmFromEmployeeId(employeeId: string): string {
  const id = employeeId.toUpperCase();
  if (id.startsWith('LAPL')) return 'LAPL';
  if (id.startsWith('LRSL')) return 'LRSL';
  if (id.startsWith('SI-') || id.startsWith('SI0')) return 'SI';
  if (id.startsWith('SDF')) return 'SDF';
  return '';
}

// HH:MM format matching Attendance Tracker's displayDecimalAsColon (e.g. 202.43 → "202:43")
// This treats the decimal part as the minute display (2-digit zero-padded),
// consistent with how the Attendance Tracker UI displays the same value.
function displayDecimalAsColon(value: number | undefined | null): string {
  if (value == null || isNaN(value as number)) return '0:00';
  const [intPart, decPart] = Number(value).toFixed(2).split('.');
  return `${intPart}:${decPart}`;
}

// HH:MM format for OT hours in summary (e.g. 1.5 → "1:30")
function formatOTHHMM(decimal: number): string {
  if (!decimal || decimal === 0) return '0:00';
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  if (minutes >= 60) return `${hours + 1}:00`;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

function fullBorder(color: string = 'B0B0B0', style: 'thin' | 'medium' = 'thin') {
  return {
    top:    { style, color: { rgb: color } },
    bottom: { style, color: { rgb: color } },
    left:   { style, color: { rgb: color } },
    right:  { style, color: { rgb: color } },
  };
}

const ss = (ws: XLSX.WorkSheet, cellRef: string, style: any) => {
  if (ws[cellRef]) ws[cellRef]!.s = style;
};

// ════════════════════════════════════════════════════════════
// GET /api/payroll/summary-export?month=7&year=2026&firm=LAPL
// ════════════════════════════════════════════════════════════
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year  = parseInt(searchParams.get('year')  || String(new Date().getFullYear()));
    const firm  = searchParams.get('firm') || '';

    // ── Build query ──
    const where: any = { month, year };
    if (firm) {
      const emps = await db.employee.findMany({
        where: { firm },
        select: { employeeId: true },
      });
      where.employeeId = { in: emps.map(e => e.employeeId) };
    }

    const payrolls = await db.payroll.findMany({
      where,
      include: {
        employee: {
          select: {
            fullName: true,
            employeeId: true,
            firm: true,
            department: true,
            designation: true,
            location: true,
            salaryType: true,
            hourlyRate: true,
            shiftHours: true,
            shiftStart: true,
            shiftEnd: true,
            monthlySalary: true,
            relievingDate: true,
          },
        },
      },
      orderBy: { employeeId: 'asc' },
    });

    const monthName = MONTHS[month - 1];
    const generatedDate = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    });

    // ── Recompute live values for each payroll (so the export is always current) ──
    const enriched = await Promise.all(payrolls.map(async (p) => {
      const daysInMonth = new Date(p.year, p.month, 0).getDate();
      const emp = p.employee;
      const shiftHrs = emp?.shiftHours || 9;

      const cutoffDay = getEffectiveCutoffDay(p.year, p.month, daysInMonth, emp?.relievingDate);

      const hourlyRate = Math.round((p.monthlySalary / (daysInMonth * shiftHrs)) * 100) / 100;

      // ── Attendance recalculation ──
      const startDate = new Date(p.year, p.month - 1, 1);
      const endDate = new Date(p.year, p.month, 1);

      const [attendance, holidays] = await Promise.all([
        db.attendance.findMany({
          where: { employeeId: p.employeeId, date: { gte: startDate, lt: endDate } },
        }),
        db.holiday.findMany({ where: { date: { gte: startDate, lt: endDate } } }),
      ]);

      const elapsedHolidays = countHolidaysUpTo(holidays, cutoffDay);
      const sundays = countSundaysUpTo(p.year, p.month, cutoffDay);
      const totalWorkingDays = Math.max(0, cutoffDay - sundays - elapsedHolidays);

      const effectiveAttendance = filterAttendanceUpTo(attendance, p.year, p.month, cutoffDay);

      // ── Recompute half-day status on-the-fly ──
      // Existing DB records may have status='half-day' set wrongly due to the
      // 12-hour format bug in upload routes. We recompute the effective status
      // here WITHOUT modifying the DB (per user's "no data tampering" instruction).
      // Records that were full shifts (worked >= half the actual shift) are
      // treated as 'present' / 'late' / 'early-out' based on stored flags.
      const actualShiftHours = getActualShiftHours(emp?.shiftHours, emp?.shiftStart, emp?.shiftEnd);
      const correctedAttendance = effectiveAttendance.map(a => ({
        ...a,
        status: recomputeStatus(a, actualShiftHours),
      }));

      const rawPresentDays = correctedAttendance.filter(a => ['present', 'late', 'early-out'].includes(a.status)).length;
      const halfDays = correctedAttendance.filter(a => a.status === 'half-day' || a.status === 'half_day').length;
      const presentDays = rawPresentDays;

      let totalBaseHours = 0;
      let totalWorkMinutes = 0; // Sum of check-in/out durations (includes OT) — matches Attendance Tracker
      for (const a of correctedAttendance) {
        // Sum work minutes from check-in/check-out (includes OT)
        if (a.checkIn && a.checkOut) {
          const [h1, m1] = a.checkIn.split(':').map(Number);
          const [h2, m2] = a.checkOut.split(':').map(Number);
          const workMin = Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
          totalWorkMinutes += workMin;
        }
        // Base hours (excludes OT) — used internally for gross calc
        if (['present', 'late', 'early-out', 'half-day', 'half_day'].includes(a.status)) {
          const baseHrs = Math.max(0, (a.totalHours || 0) - (a.overtimeHours || 0));
          totalBaseHours += baseHrs;
        }
      }
      totalBaseHours = Math.round(totalBaseHours * 100) / 100;
      // TRUE decimal hours (includes OT) — matches Attendance Tracker's totalWorkHours exactly
      const totalWorkHoursDecimal = Math.round((totalWorkMinutes / 60) * 100) / 100;

      const otHours = Math.round(
        correctedAttendance
          .filter(a => ['present', 'late', 'half-day', 'half_day', 'early-out'].includes(a.status))
          .reduce((sum, a) => sum + (a.overtimeHours || 0), 0) * 100
      ) / 100;

      // Leaves
      const leaves = await db.leave.findMany({
        where: { employeeId: p.employeeId, status: 'approved', startDate: { gte: startDate }, endDate: { lt: endDate } },
      });

      const holidayDateStrs = new Set(
        holidays.map(h => {
          const hd = new Date(h.date);
          return `${hd.getFullYear()}-${String(hd.getMonth() + 1).padStart(2, '0')}-${String(hd.getDate()).padStart(2, '0')}`;
        })
      );
      const presentDateStrs = new Set();
      for (const a of correctedAttendance) {
        if (['present', 'late', 'early-out', 'half-day', 'half_day'].includes(a.status)) {
          const ad = new Date(a.date);
          presentDateStrs.add(`${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}`);
        }
      }

      let effectivePaidLeaves = 0;
      let effectiveUnpaidLeaves = 0;
      const cutoffDate = new Date(p.year, p.month - 1, cutoffDay);
      for (const leave of leaves) {
        const isUnpaid = leave.type === 'unpaid' || leave.type === 'UL' || leave.type === 'LOP';
        let d = new Date(leave.startDate);
        const end = new Date(leave.endDate);
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

      const sundayHrs = sundays * shiftHrs;
      const paidLeaveHrs = effectivePaidLeaves * shiftHrs;
      const totalHrs = Math.round((totalBaseHours + sundayHrs + otHours + paidLeaveHrs) * 100) / 100;
      const grossSalary = Math.round(hourlyRate * totalHrs * 100) / 100;
      const otAmount = Math.round(otHours * hourlyRate * 100) / 100;
      const netSalary = Math.round((grossSalary + (p.bonus || 0) + (p.incentive || 0) + (p.arrear || 0) - (p.totalDeductions || 0)) * 100) / 100;

      const firmCode = getFirmFromEmployeeId(p.employeeId) || emp?.firm || emp?.department || '';
      const firmDisplay = firmCode;

      return {
        employeeId: p.employeeId,
        fullName: emp?.fullName || p.employeeId,
        firm: firmDisplay,
        monthlySalary: p.monthlySalary,
        presentDays,
        absentDays,
        // workedHrs now matches Attendance Tracker's "Total Hrs Worked" exactly
        // (true decimal, includes OT). Display uses displayDecimalAsColon → "202:43"
        workedHrs: totalWorkHoursDecimal,
        otHours,
        otAmount,
        grossSalary,
        deductions: p.totalDeductions || 0,
        bonus: p.bonus || 0,
        netSalary,
        status: p.status || 'generated',
      };
    }));

    // ── Aggregate totals ──
    const totalGross    = enriched.reduce((s, p) => s + p.grossSalary, 0);
    const totalOTAmount = enriched.reduce((s, p) => s + p.otAmount, 0);
    const totalBonus    = enriched.reduce((s, p) => s + p.bonus, 0);
    const totalDeduct   = enriched.reduce((s, p) => s + p.deductions, 0);
    const totalNet      = enriched.reduce((s, p) => s + p.netSalary, 0);
    const totalOTHrs    = enriched.reduce((s, p) => s + p.otHours, 0);
    const empProcessed  = enriched.length;
    const avgNet        = empProcessed > 0 ? totalNet / empProcessed : 0;

    // ════════════════════════════════════════════════════════════
    // SHEET 1: Payroll Register
    // ════════════════════════════════════════════════════════════
    const cols = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'];

    const headerRows: any[][] = [
      // Row 1
      ['LAXREE GROUP OF COMPANIES', ...Array(14).fill('')],
      // Row 2
      [`Payroll Register — ${monthName} ${year}`, ...Array(14).fill('')],
      // Row 3 — meta row: Generated date | (blank,blank) | Total Employees: X | (blank,blank) | Total Net Payroll: ₹Y
      [`Generated: ${generatedDate}`, '', '', `Total Employees: ${empProcessed}`, '', '', `Total Net Payroll: ₹${totalNet.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, ...Array(8).fill('')],
      // Row 4 — column letters (matches template)
      [...cols],
      // Row 5 — column headers
      [
        'S.No', 'Employee Name', 'Emp Code', 'Firm', 'Monthly Salary',
        'Present Days', 'Absent Days', 'Worked Hrs', 'OT Hrs', 'OT Amount',
        'Gross Salary', 'Deductions', 'Bonus', 'Net Salary', 'Status',
      ],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(headerRows);

    // ── Shared style definitions ──
    const styleCompanyHeader = {
      font: { bold: true, color: { rgb: GOLD }, sz: 18, name: 'Calibri' },
      fill: { fgColor: { rgb: DARK } },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const },
      border: {
        top:    { style: 'medium' as const, color: { rgb: GOLD } },
        bottom: { style: 'medium' as const, color: { rgb: GOLD } },
        left:   { style: 'medium' as const, color: { rgb: GOLD } },
        right:  { style: 'medium' as const, color: { rgb: GOLD } },
      },
    };

    const styleReportTitle = {
      font: { bold: true, color: { rgb: WHITE }, sz: 13, name: 'Calibri' },
      fill: { fgColor: { rgb: DEEP_BLUE } },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const },
      border: fullBorder('4472C4', 'thin'),
    };

    const styleMetaLabel = {
      font: { bold: true, color: { rgb: WHITE }, sz: 10, name: 'Calibri' },
      fill: { fgColor: { rgb: '2D2D2D' } },
      alignment: { horizontal: 'left' as const, vertical: 'center' as const },
      border: fullBorder('444444', 'thin'),
    };

    const styleColLetter = {
      font: { bold: true, color: { rgb: GOLD }, sz: 9, name: 'Calibri' },
      fill: { fgColor: { rgb: '2D2D2D' } },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const },
      border: fullBorder('444444', 'thin'),
    };

    const styleColHeader = {
      font: { bold: true, color: { rgb: WHITE }, sz: 10, name: 'Calibri' },
      fill: { fgColor: { rgb: EMERALD } },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
      border: fullBorder(WHITE, 'thin'),
    };

    const styleTotals = {
      font: { bold: true, color: { rgb: WHITE }, sz: 10, name: 'Calibri' },
      fill: { fgColor: { rgb: DARK } },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const },
      border: {
        top:    { style: 'medium' as const, color: { rgb: GOLD } },
        bottom: { style: 'medium' as const, color: { rgb: GOLD } },
        left:   { style: 'thin'  as const, color: { rgb: GOLD } },
        right:  { style: 'thin'  as const, color: { rgb: GOLD } },
      },
    };

    // ── Row 1: Company name ──
    cols.forEach(c => { ss(ws1, `${c}1`, styleCompanyHeader); });

    // ── Row 2: Report title ──
    cols.forEach(c => { ss(ws1, `${c}2`, styleReportTitle); });

    // ── Row 3: Meta row (Generated date | Total Employees | Total Net Payroll) ──
    // A:C — Generated date
    ['A','B','C'].forEach(c => {
      ss(ws1, `${c}3`, styleMetaLabel);
    });
    // D:F — Total Employees
    ['D','E','F'].forEach(c => {
      ss(ws1, `${c}3`, styleMetaLabel);
    });
    // G:O — Total Net Payroll
    ['G','H','I','J','K','L','M','N','O'].forEach(c => {
      ss(ws1, `${c}3`, styleMetaLabel);
    });

    // ── Row 4: Column letters ──
    cols.forEach(c => { ss(ws1, `${c}4`, styleColLetter); });

    // ── Row 5: Column headers ──
    cols.forEach(c => { ss(ws1, `${c}5`, styleColHeader); });

    // ── Data rows starting at row 6 ──
    enriched.forEach((p, idx) => {
      const row = idx + 6;
      const status = p.status;
      const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
      const dataRow = [
        idx + 1,                                    // A: S.No
        p.fullName,                                 // B: Employee Name
        p.employeeId,                               // C: Emp Code
        p.firm,                                     // D: Firm
        Math.round(p.monthlySalary),                // E: Monthly Salary
        p.presentDays,                              // F: Present Days
        p.absentDays,                               // G: Absent Days
        displayDecimalAsColon(p.workedHrs),         // H: Worked Hrs (HH:MM, matches Attendance Tracker)
        displayDecimalAsColon(p.otHours),           // I: OT Hrs (HH:MM, matches Attendance Tracker)
        Math.round(p.otAmount),                     // J: OT Amount
        Math.round(p.grossSalary),                  // K: Gross Salary
        Math.round(p.deductions),                   // L: Deductions
        Math.round(p.bonus),                        // M: Bonus
        Math.round(p.netSalary),                    // N: Net Salary
        statusLabel,                                // O: Status
      ];

      XLSX.utils.sheet_add_aoa(ws1, [dataRow], { origin: `A${row}` });

      // Alternating row colors
      const bgColor = idx % 2 === 0 ? LIGHT_BG : WHITE;
      const styleDataRow = {
        font: { sz: 10, color: { rgb: '333333' }, name: 'Calibri' },
        fill: { fgColor: { rgb: bgColor } },
        alignment: { horizontal: 'center' as const, vertical: 'center' as const },
        border: fullBorder('D0D0D0', 'thin'),
      };
      cols.forEach(c => { ss(ws1, `${c}${row}`, styleDataRow); });

      // Employee name = left aligned
      ss(ws1, `B${row}`, { ...styleDataRow, alignment: { horizontal: 'left' as const, vertical: 'center' as const } });

      // Net Salary = gold bold
      ss(ws1, `N${row}`, {
        ...styleDataRow,
        font: { bold: true, color: { rgb: GOLD }, sz: 10, name: 'Calibri' },
      });

      // Status color coding
      const statusCol = 'O';
      if (status === 'paid') {
        ss(ws1, `${statusCol}${row}`, {
          ...styleDataRow,
          font: { bold: true, color: { rgb: EMERALD }, sz: 10, name: 'Calibri' },
          fill: { fgColor: { rgb: LIGHT_GREEN } },
        });
      } else if (status === 'approved') {
        ss(ws1, `${statusCol}${row}`, {
          ...styleDataRow,
          font: { bold: true, color: { rgb: SKY }, sz: 10, name: 'Calibri' },
          fill: { fgColor: { rgb: LIGHT_BLUE } },
        });
      } else {
        ss(ws1, `${statusCol}${row}`, {
          ...styleDataRow,
          font: { bold: true, color: { rgb: AMBER }, sz: 10, name: 'Calibri' },
          fill: { fgColor: { rgb: LIGHT_AMBER } },
        });
      }
    });

    // ── Footer row: Repeat column headers + TOTAL row (matches template) ──
    const headerRepeatRow = enriched.length + 6;
    XLSX.utils.sheet_add_aoa(ws1, [[
      'S.No', 'Employee Name', 'Emp Code', 'Firm', 'Monthly Salary',
      'Present Days', 'Absent Days', 'Worked Hrs', 'OT Hrs', 'OT Amount',
      'Gross Salary', 'Deductions', 'Bonus', 'Net Salary', 'Status',
    ]], { origin: `A${headerRepeatRow}` });
    cols.forEach(c => { ss(ws1, `${c}${headerRepeatRow}`, styleColHeader); });

    const totalRow = enriched.length + 7;
    const totalMonthlySalary = enriched.reduce((s, p) => s + p.monthlySalary, 0);
    const totalPresentDays   = enriched.reduce((s, p) => s + p.presentDays, 0);
    const totalAbsentDays    = enriched.reduce((s, p) => s + p.absentDays, 0);
    const totalWorkedHrs     = enriched.reduce((s, p) => s + p.workedHrs, 0);

    XLSX.utils.sheet_add_aoa(ws1, [[
      '', 'TOTAL', '', '', Math.round(totalMonthlySalary),
      totalPresentDays, totalAbsentDays,
      displayDecimalAsColon(totalWorkedHrs),
      displayDecimalAsColon(totalOTHrs),
      Math.round(totalOTAmount),
      Math.round(totalGross), Math.round(totalDeduct), Math.round(totalBonus),
      Math.round(totalNet), '',
    ]], { origin: `A${totalRow}` });
    cols.forEach(c => { ss(ws1, `${c}${totalRow}`, styleTotals); });

    // ── Merges ──
    if (!ws1['!merges']) ws1['!merges'] = [];
    ws1['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 14 } }); // Row 1: A1:O1
    ws1['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 14 } }); // Row 2: A2:O2
    ws1['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 2 } });  // A3:C3 (Generated)
    ws1['!merges'].push({ s: { r: 2, c: 3 }, e: { r: 2, c: 5 } });  // D3:F3 (Total Employees)
    ws1['!merges'].push({ s: { r: 2, c: 6 }, e: { r: 2, c: 14 } }); // G3:O3 (Total Net Payroll)

    // ── Column widths ──
    ws1['!cols'] = [
      { wch: 6 },   // A: S.No
      { wch: 26 },  // B: Employee Name
      { wch: 14 },  // C: Emp Code
      { wch: 8 },   // D: Firm
      { wch: 14 },  // E: Monthly Salary
      { wch: 12 },  // F: Present Days
      { wch: 12 },  // G: Absent Days
      { wch: 11 },  // H: Worked Hrs
      { wch: 9 },   // I: OT Hrs
      { wch: 12 },  // J: OT Amount
      { wch: 14 },  // K: Gross Salary
      { wch: 13 },  // L: Deductions
      { wch: 11 },  // M: Bonus
      { wch: 14 },  // N: Net Salary
      { wch: 12 },  // O: Status
    ];

    // ════════════════════════════════════════════════════════════
    // SHEET 2: Summary
    // ════════════════════════════════════════════════════════════
    const sumRows: any[][] = [
      // Row 1
      ['Payroll Summary', ''],
      // Row 2 (spacer)
      ['', ''],
      // Row 3 — section header
      ['Category', 'Amount (₹)'],
      // Row 4
      ['Total Gross Salary', Math.round(totalGross)],
      // Row 5
      ['Total OT Amount', Math.round(totalOTAmount)],
      // Row 6
      ['Total Bonus', Math.round(totalBonus)],
      // Row 7
      ['Total Deductions', Math.round(totalDeduct)],
      // Row 8
      ['Total Net Payroll', Math.round(totalNet)],
      // Row 9 (spacer)
      ['', ''],
      // Row 10 — second section header
      ['Metric', 'Value'],
      // Row 11
      ['Employees Processed', empProcessed],
      // Row 12
      ['Average Net Salary', Math.round(avgNet)],
      // Row 13
      ['Total OT Hours', formatOTHHMM(totalOTHrs)],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(sumRows);
    const cols2 = ['A','B'];

    // Row 1: Title
    cols2.forEach(c => {
      ss(ws2, `${c}1`, {
        font: { bold: true, color: { rgb: GOLD }, sz: 16, name: 'Calibri' },
        fill: { fgColor: { rgb: DARK } },
        alignment: { horizontal: 'center' as const, vertical: 'center' as const },
        border: {
          top:    { style: 'medium' as const, color: { rgb: GOLD } },
          bottom: { style: 'medium' as const, color: { rgb: GOLD } },
          left:   { style: 'medium' as const, color: { rgb: GOLD } },
          right:  { style: 'medium' as const, color: { rgb: GOLD } },
        },
      });
    });

    // Row 3 & Row 10: Section headers (Category | Amount / Metric | Value)
    ['A3','B3','A10','B10'].forEach(ref => {
      ss(ws2, ref, {
        font: { bold: true, color: { rgb: WHITE }, sz: 11, name: 'Calibri' },
        fill: { fgColor: { rgb: EMERALD } },
        alignment: { horizontal: 'center' as const, vertical: 'center' as const },
        border: fullBorder(WHITE, 'thin'),
      });
    });

    // Amount rows (4-8): styling per category
    const amountRowStyles: Record<number, { color: string; bg: string }> = {
      4: { color: CYAN,   bg: LIGHT_BLUE },   // Total Gross Salary
      5: { color: AMBER,  bg: LIGHT_AMBER },  // Total OT Amount
      6: { color: PURPLE, bg: LIGHT_BG },     // Total Bonus
      7: { color: RED,    bg: LIGHT_RED },    // Total Deductions
      8: { color: GOLD,   bg: LIGHT_BG },     // Total Net Payroll
    };

    for (let r = 4; r <= 8; r++) {
      const style = amountRowStyles[r];
      ss(ws2, `A${r}`, {
        font: { bold: true, color: { rgb: '333333' }, sz: 11, name: 'Calibri' },
        fill: { fgColor: { rgb: style.bg } },
        alignment: { horizontal: 'left' as const, vertical: 'center' as const },
        border: fullBorder('D0D0D0', 'thin'),
      });
      ss(ws2, `B${r}`, {
        font: { bold: true, color: { rgb: style.color }, sz: 12, name: 'Calibri' },
        fill: { fgColor: { rgb: style.bg } },
        alignment: { horizontal: 'right' as const, vertical: 'center' as const },
        border: fullBorder('D0D0D0', 'thin'),
      });
    }

    // Metric rows (11-13)
    const metricRowStyles: Record<number, { color: string; bg: string }> = {
      11: { color: EMERALD, bg: LIGHT_GREEN }, // Employees Processed
      12: { color: GOLD,    bg: LIGHT_BG },    // Average Net Salary
      13: { color: AMBER,   bg: LIGHT_AMBER }, // Total OT Hours
    };

    for (let r = 11; r <= 13; r++) {
      const style = metricRowStyles[r];
      ss(ws2, `A${r}`, {
        font: { bold: true, color: { rgb: '333333' }, sz: 11, name: 'Calibri' },
        fill: { fgColor: { rgb: style.bg } },
        alignment: { horizontal: 'left' as const, vertical: 'center' as const },
        border: fullBorder('D0D0D0', 'thin'),
      });
      ss(ws2, `B${r}`, {
        font: { bold: true, color: { rgb: style.color }, sz: 12, name: 'Calibri' },
        fill: { fgColor: { rgb: style.bg } },
        alignment: { horizontal: 'right' as const, vertical: 'center' as const },
        border: fullBorder('D0D0D0', 'thin'),
      });
    }

    // ── Merges for Summary sheet ──
    if (!ws2['!merges']) ws2['!merges'] = [];
    ws2['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }); // A1:B1

    ws2['!cols'] = [{ wch: 28 }, { wch: 20 }];

    // ════════════════════════════════════════════════════════════
    // Build workbook & return
    // ════════════════════════════════════════════════════════════
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Payroll Register');
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    const filename = `Payroll_${monthName}_${year}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buf.byteLength),
      },
    });
  } catch (error: any) {
    console.error('Payroll summary export error:', error);
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}
