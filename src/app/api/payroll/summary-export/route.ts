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
// Payroll Summary Export — matches user's provided template
// (Payroll_Summary_July_2026_LAXREE GROUP OF COMPANIES.xlsx)
//
// When firm=ALL (default): generates ONE Excel file with one
// sheet per firm (LAPL, LRSL, SI, SDF) + a final "Summary" sheet.
// When firm=LAPL (or specific): generates ONE Excel with just
// that firm's sheet + a "Summary" sheet.
//
// Each firm sheet:
//   Row 1: COMPANY FULL NAME (Calibri 18 bold, gold on dark)
//   Row 2: "Payroll Register — <Month> <Year>" (white on deep blue)
//   Row 3: meta row (dark) — split into 3 sections
//   Row 4: 14 column headers (emerald on white)
//   Row 5+: per-employee data
//   Last row: TOTAL with SUM formulas (dark + gold border)
//
// Columns (A..N):
//   A: S.No
//   B: Employee Name
//   C: Monthly Salary
//   D: Working Hrs       (= daysInMonth × shiftHours — capacity)
//   E: Sl/Hr              (= monthlySalary / Working Hrs)
//   F: Present Days
//   G: Absent Days
//   H: Worked Hrs         (base hours, excludes OT — actual work)
//   I: Additional hrs     (OT hours)
//   J: Total Hrs          (Worked + Sunday + Paid Leave + OT)
//   K: Gross Salary       (Sl/Hr × Total Hrs)
//   L: SD Refund          (securityDeposit — shown as deduction)
//   M: Salary Advance     (advanceDeduction — shown as deduction)
//   N: Net Salary         (Gross + bonus + incentive + arrear
//                           − TDS − loan − other − SD − Advance)
// ════════════════════════════════════════════════════════════

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Firm → Full company name ──
const FIRM_NAMES: Record<string, string> = {
  LAPL: 'LAXREE AMENITIES PVT LTD',
  LRSL: 'LAXREE ROOFING SOLUTION',
  SI:   'SMARTH INTERNATIONAL',
  SDF:  'SANGRAH DECOR & FURNITURE',
};

const FIRM_ORDER = ['LAPL', 'LRSL', 'SI', 'SDF'];

// ── Theme colors ──
const GOLD       = 'D4A843';
const DARK       = '1A1A1A';
const WHITE      = 'FFFFFF';
const EMERALD    = '059669';
const DEEP_BLUE  = '1E3A5F';
const LIGHT_BG   = 'FFF8E7';   // cream — matches template row 5
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

// ── Compute enriched payroll data for a single payroll record ──
async function enrichPayroll(p: any) {
  const daysInMonth = new Date(p.year, p.month, 0).getDate();
  const emp = p.employee;
  const shiftHrs = emp?.shiftHours || 9;

  const cutoffDay = getEffectiveCutoffDay(p.year, p.month, daysInMonth, emp?.relievingDate);

  // Working Hrs = capacity for the month = daysInMonth × shiftHours
  const workingHrsCapacity = daysInMonth * shiftHrs;
  // Sl/Hr = monthlySalary / workingHrsCapacity
  const hourlyRate = Math.round((p.monthlySalary / workingHrsCapacity) * 100) / 100;

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

  const actualShiftHours = getActualShiftHours(emp?.shiftHours, emp?.shiftStart, emp?.shiftEnd);
  const correctedAttendance = effectiveAttendance.map(a => ({
    ...a,
    status: recomputeStatus(a, actualShiftHours, emp?.shiftStart, emp?.shiftEnd),
  }));

  const rawPresentDays = correctedAttendance.filter(a => ['present', 'late', 'early-out'].includes(a.status)).length;
  const halfDays = correctedAttendance.filter(a => a.status === 'half-day' || a.status === 'half_day').length;
  const presentDays = rawPresentDays;

  let totalBaseHours = 0;
  for (const a of correctedAttendance) {
    if (['present', 'late', 'early-out', 'half-day', 'half_day'].includes(a.status)) {
      const baseHrs = Math.max(0, (a.totalHours || 0) - (a.overtimeHours || 0));
      totalBaseHours += baseHrs;
    }
  }
  totalBaseHours = Math.round(totalBaseHours * 100) / 100;

  const otHours = Math.round(
    correctedAttendance
      .filter(a => ['present', 'late', 'half-day', 'half_day', 'early-out'].includes(a.status))
      .reduce((sum, a) => sum + (a.overtimeHours || 0), 0) * 100
  ) / 100;

  // Leaves — use OVERLAP query so leaves spanning month boundaries
  // (e.g., June 27 to July 1) are correctly included in both months.
  const leaves = await db.leave.findMany({
    where: { employeeId: p.employeeId, status: 'approved', startDate: { lt: endDate }, endDate: { gte: startDate } },
  });

  const holidayDateStrs = new Set(
    holidays.map(h => {
      const hd = new Date(h.date);
      return `${hd.getFullYear()}-${String(hd.getMonth() + 1).padStart(2, '0')}-${String(hd.getDate()).padStart(2, '0')}`;
    })
  );
  const presentDateStrs = new Set<string>();
  for (const a of correctedAttendance) {
    if (['present', 'late', 'early-out', 'half-day', 'half_day'].includes(a.status)) {
      const ad = new Date(a.date);
      presentDateStrs.add(`${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}`);
    }
  }

  let effectivePaidLeaves = 0;
  let effectiveUnpaidLeaves = 0;
  const cutoffDate = new Date(p.year, p.month - 1, cutoffDay, 23, 59, 59);
  for (const leave of leaves) {
    const isUnpaid = leave.type === 'unpaid' || leave.type === 'UL' || leave.type === 'LOP';
    let d = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const effectiveEnd = end > cutoffDate ? cutoffDate : end;
    while (d <= effectiveEnd) {
      // ═══ BUG FIX ═══
      // Only count leave days that fall WITHIN the current payroll month/year.
      // Previously, a leave spanning June 27 → July 1 would count June 27, 29, 30
      // as July paid leaves (wrong!). Now we skip any day outside the current month.
      if (d.getFullYear() === p.year && d.getMonth() + 1 === p.month) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const isSunday = d.getDay() === 0;
        const isHoliday = holidayDateStrs.has(dateStr);
        if (!isSunday && !isHoliday && !presentDateStrs.has(dateStr)) {
          if (isUnpaid) effectiveUnpaidLeaves++;
          else effectivePaidLeaves++;
        }
      }
      d.setDate(d.getDate() + 1);
    }
  }

  // ═══ COMPANY POLICY: NO PAID LEAVES ═══
  // All leaves are unpaid — they do NOT contribute to totalHrs or grossSalary.
  // Absent = any working day the employee did NOT show up, regardless of
  // whether an approved leave exists for that day. Leave days are still
  // counted (in `totalLeaveDays` for display) but do NOT reduce absent.
  // (Matches user expectation: Kamlesh absent=3 even though Jul 1 has leave.)
  const totalLeaveDays = effectivePaidLeaves + effectiveUnpaidLeaves;
  const absentDays = Math.max(0, totalWorkingDays - presentDays - halfDays);

  const sundayHrs = sundays * shiftHrs;
  const paidLeaveHrs = 0;  // ← NO PAID LEAVES per company policy
  const totalHrs = Math.round((totalBaseHours + sundayHrs + otHours + paidLeaveHrs) * 100) / 100;
  const grossSalary = Math.round(hourlyRate * totalHrs * 100) / 100;

  // Net salary (existing formula): gross + bonus + incentive + arrear - totalDeductions
  const netSalary = Math.round(
    (grossSalary + (p.bonus || 0) + (p.incentive || 0) + (p.arrear || 0) - (p.totalDeductions || 0)) * 100
  ) / 100;

  const firmCode = getFirmFromEmployeeId(p.employeeId) || emp?.firm || '';

  return {
    employeeId: p.employeeId,
    fullName: emp?.fullName || p.employeeId,
    firm: firmCode,
    monthlySalary: p.monthlySalary,
    workingHrsCapacity,    // D: daysInMonth × shiftHours
    hourlyRate,            // E: Sl/Hr
    presentDays,           // F
    absentDays,            // G
    workedHrs: Math.round((totalBaseHours + otHours) * 100) / 100,  // H: Worked Hrs INCLUDING OT (base + OT)
    additionalHrs: sundayHrs,   // I: Additional hrs = PAID Sunday hrs (sundays × shiftHrs)
    totalHrs,             // J: Total Hrs including Sunday Hrs (= workedHrs_incl_OT + sundayHrs)
    grossSalary,           // K
    sdRefund: p.securityDeposit || 0,    // L: SD Refund
    salaryAdvance: p.advanceDeduction || 0, // M: Salary Advance
    netSalary,             // N
    otAmount: Math.round(otHours * hourlyRate * 100) / 100,
    otHours,               // (kept for record — not shown in column I anymore)
    bonus: p.bonus || 0,
    deductions: p.totalDeductions || 0,
    status: p.status || 'generated',
  };
}

// ════════════════════════════════════════════════════════════
// Build ONE firm sheet (Payroll Register format)
// ════════════════════════════════════════════════════════════
function buildFirmSheet(
  firmCode: string,
  firmName: string,
  monthName: string,
  year: number,
  enriched: any[],
): XLSX.WorkSheet {
  const cols = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N'];

  // ── Build AOA ──
  const empProcessed = enriched.length;
  const totalNet = enriched.reduce((s, p) => s + p.netSalary, 0);

  const headerRows: any[][] = [
    // Row 1: Company full name
    [firmName, ...Array(13).fill('')],
    // Row 2: Payroll Register — Month Year
    [`Payroll Register — ${monthName} ${year}`, ...Array(13).fill('')],
    // Row 3: meta row (split: A3:B3 Generated, C3:F3 Total Employees, G3:N3 Total Net)
    [`Generated: ${new Date().toLocaleString('en-IN', { day: '2-digit', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}`, '', `Total Employees: ${empProcessed}`, '', '', '', `Total Net Payroll: ₹${totalNet.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, ...Array(7).fill('')],
    // Row 4: Column headers
    [
      'S.No', 'Employee Name', 'Monthly Salary', 'Working Hrs', 'Sl/Hr',
      'Present Days', 'Absent Days', 'Worked Hrs including OT', 'Additional hrs', 'Total Hrs including Sunday Hrs',
      'Gross Salary', 'SD Refund', 'Salary Advance', 'Net Salary',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(headerRows);

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

  // ── Apply styles to header rows ──
  // Row 1: Company name (gold on dark, all 14 cols)
  cols.forEach(c => { ss(ws, `${c}1`, styleCompanyHeader); });

  // Row 2: Report title (white on deep blue)
  cols.forEach(c => { ss(ws, `${c}2`, styleReportTitle); });

  // Row 3: Meta row (dark) — 3 sections
  ['A','B'].forEach(c => { ss(ws, `${c}3`, styleMetaLabel); });
  ['C','D','E','F'].forEach(c => { ss(ws, `${c}3`, styleMetaLabel); });
  ['G','H','I','J','K','L','M','N'].forEach(c => { ss(ws, `${c}3`, styleMetaLabel); });

  // Row 4: Column headers
  cols.forEach(c => { ss(ws, `${c}4`, styleColHeader); });

  // ── Data rows starting at row 5 ──
  enriched.forEach((p, idx) => {
    const row = idx + 5;
    const dataRow = [
      idx + 1,                                  // A: S.No
      p.fullName,                               // B: Employee Name
      Math.round(p.monthlySalary),              // C: Monthly Salary
      p.workingHrsCapacity,                     // D: Working Hrs (daysInMonth × shiftHours)
      p.hourlyRate,                             // E: Sl/Hr
      p.presentDays,                            // F: Present Days
      p.absentDays,                             // G: Absent Days
      displayDecimalAsColon(p.workedHrs),       // H: Worked Hrs (HH:MM)
      displayDecimalAsColon(p.additionalHrs),   // I: Additional hrs (HH:MM)
      displayDecimalAsColon(p.totalHrs),        // J: Total Hrs (HH:MM)
      Math.round(p.grossSalary),                // K: Gross Salary
      Math.round(p.sdRefund),                   // L: SD Refund
      Math.round(p.salaryAdvance),              // M: Salary Advance
      Math.round(p.netSalary),                  // N: Net Salary
    ];

    XLSX.utils.sheet_add_aoa(ws, [dataRow], { origin: `A${row}` });

    // Alternating row colors (cream / white — matches template)
    const bgColor = idx % 2 === 0 ? LIGHT_BG : WHITE;
    const styleDataRow = {
      font: { sz: 10, color: { rgb: '333333' }, name: 'Calibri' },
      fill: { fgColor: { rgb: bgColor } },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const },
      border: fullBorder('D0D0D0', 'thin'),
    };
    cols.forEach(c => { ss(ws, `${c}${row}`, styleDataRow); });

    // B: Employee name = left aligned
    ss(ws, `B${row}`, {
      ...styleDataRow,
      alignment: { horizontal: 'left' as const, vertical: 'center' as const },
    });

    // N: Net Salary = gold bold
    ss(ws, `N${row}`, {
      ...styleDataRow,
      font: { bold: true, color: { rgb: GOLD }, sz: 10, name: 'Calibri' },
    });
  });

  // ── TOTAL row ──
  const totalRow = enriched.length + 5;
  const totalMonthlySalary = enriched.reduce((s, p) => s + p.monthlySalary, 0);
  const totalPresentDays   = enriched.reduce((s, p) => s + p.presentDays, 0);
  const totalAbsentDays    = enriched.reduce((s, p) => s + p.absentDays, 0);
  const totalWorkedHrs     = enriched.reduce((s, p) => s + p.workedHrs, 0);
  const totalAdditionalHrs = enriched.reduce((s, p) => s + p.additionalHrs, 0);
  const totalHrsSum        = enriched.reduce((s, p) => s + p.totalHrs, 0);
  const totalGross         = enriched.reduce((s, p) => s + p.grossSalary, 0);
  const totalSDRefund      = enriched.reduce((s, p) => s + p.sdRefund, 0);
  const totalSalaryAdvance = enriched.reduce((s, p) => s + p.salaryAdvance, 0);
  const totalNetSum        = enriched.reduce((s, p) => s + p.netSalary, 0);

  // Use SUM formulas where possible (matches template style)
  const firstDataRow = 5;
  const lastDataRow = enriched.length + 4;
  XLSX.utils.sheet_add_aoa(ws, [[
    '',                                                  // A
    'TOTAL',                                             // B
    { f: `SUM(C${firstDataRow}:C${lastDataRow})` },      // C: Monthly Salary sum
    '',                                                  // D: Working Hrs (capacity, no sum)
    '',                                                  // E: Sl/Hr (rate, no sum)
    { f: `SUM(F${firstDataRow}:F${lastDataRow})` },      // F: Present Days sum
    { f: `SUM(G${firstDataRow}:G${lastDataRow})` },      // G: Absent Days sum
    displayDecimalAsColon(totalWorkedHrs),               // H: Worked Hrs sum
    displayDecimalAsColon(totalAdditionalHrs),           // I: Additional hrs sum
    displayDecimalAsColon(totalHrsSum),                  // J: Total Hrs sum
    { f: `SUM(K${firstDataRow}:K${lastDataRow})` },      // K: Gross Salary sum
    { f: `SUM(L${firstDataRow}:L${lastDataRow})` },      // L: SD Refund sum
    { f: `SUM(M${firstDataRow}:M${lastDataRow})` },      // M: Salary Advance sum
    { f: `SUM(N${firstDataRow}:N${lastDataRow})` },      // N: Net Salary sum
  ]], { origin: `A${totalRow}` });
  cols.forEach(c => { ss(ws, `${c}${totalRow}`, styleTotals); });

  // ── Merges ──
  if (!ws['!merges']) ws['!merges'] = [];
  ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }); // Row 1: A1:N1
  ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 13 } }); // Row 2: A2:N2
  ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 1 } });  // A3:B3 (Generated)
  ws['!merges'].push({ s: { r: 2, c: 2 }, e: { r: 2, c: 5 } });  // C3:F3 (Total Employees)
  ws['!merges'].push({ s: { r: 2, c: 6 }, e: { r: 2, c: 13 } }); // G3:N3 (Total Net)

  // ── Column widths ──
  ws['!cols'] = [
    { wch: 6 },   // A: S.No
    { wch: 28 },  // B: Employee Name
    { wch: 14 },  // C: Monthly Salary
    { wch: 11 },  // D: Working Hrs
    { wch: 10 },  // E: Sl/Hr
    { wch: 12 },  // F: Present Days
    { wch: 12 },  // G: Absent Days
    { wch: 11 },  // H: Worked Hrs
    { wch: 13 },  // I: Additional hrs
    { wch: 18 },  // J: Total Hrs including Sunday Hrs (wider for longer label)
    { wch: 14 },  // K: Gross Salary
    { wch: 11 },  // L: SD Refund
    { wch: 14 },  // M: Salary Advance
    { wch: 14 },  // N: Net Salary
  ];

  return ws;
}

// ════════════════════════════════════════════════════════════
// Build Summary sheet (aggregate across all firms)
// ════════════════════════════════════════════════════════════
function buildSummarySheet(
  monthName: string,
  year: number,
  allEnriched: any[],
): XLSX.WorkSheet {
  const totalGross    = allEnriched.reduce((s, p) => s + p.grossSalary, 0);
  const totalOTAmount = allEnriched.reduce((s, p) => s + p.otAmount, 0);
  const totalBonus    = allEnriched.reduce((s, p) => s + p.bonus, 0);
  const totalDeduct   = allEnriched.reduce((s, p) => s + p.deductions, 0);
  const totalNet      = allEnriched.reduce((s, p) => s + p.netSalary, 0);
  const totalOTHrs    = allEnriched.reduce((s, p) => s + p.additionalHrs, 0);
  const empProcessed  = allEnriched.length;
  const avgNet        = empProcessed > 0 ? totalNet / empProcessed : 0;

  const sumRows: any[][] = [
    [`Payroll Summary — ${monthName} ${year}`, ''],
    ['', ''],
    ['Category', 'Amount (₹)'],
    ['Total Gross Salary', Math.round(totalGross)],
    ['Total OT Amount', Math.round(totalOTAmount)],
    ['Total Bonus', Math.round(totalBonus)],
    ['Total Deductions', Math.round(totalDeduct)],
    ['Total Net Payroll', Math.round(totalNet)],
    ['', ''],
    ['Metric', 'Value'],
    ['Employees Processed', empProcessed],
    ['Average Net Salary', Math.round(avgNet)],
    ['Total OT Hours', formatOTHHMM(totalOTHrs)],
  ];
  const ws = XLSX.utils.aoa_to_sheet(sumRows);
  const cols2 = ['A','B'];

  // Row 1: Title
  cols2.forEach(c => {
    ss(ws, `${c}1`, {
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

  // Row 3 & Row 10: Section headers
  ['A3','B3','A10','B10'].forEach(ref => {
    ss(ws, ref, {
      font: { bold: true, color: { rgb: WHITE }, sz: 11, name: 'Calibri' },
      fill: { fgColor: { rgb: EMERALD } },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const },
      border: fullBorder(WHITE, 'thin'),
    });
  });

  const amountRowStyles: Record<number, { color: string; bg: string }> = {
    4: { color: CYAN,   bg: LIGHT_BLUE },
    5: { color: AMBER,  bg: LIGHT_AMBER },
    6: { color: PURPLE, bg: LIGHT_BG },
    7: { color: RED,    bg: LIGHT_RED },
    8: { color: GOLD,   bg: LIGHT_BG },
  };

  for (let r = 4; r <= 8; r++) {
    const style = amountRowStyles[r];
    ss(ws, `A${r}`, {
      font: { bold: true, color: { rgb: '333333' }, sz: 11, name: 'Calibri' },
      fill: { fgColor: { rgb: style.bg } },
      alignment: { horizontal: 'left' as const, vertical: 'center' as const },
      border: fullBorder('D0D0D0', 'thin'),
    });
    ss(ws, `B${r}`, {
      font: { bold: true, color: { rgb: style.color }, sz: 12, name: 'Calibri' },
      fill: { fgColor: { rgb: style.bg } },
      alignment: { horizontal: 'right' as const, vertical: 'center' as const },
      border: fullBorder('D0D0D0', 'thin'),
    });
  }

  const metricRowStyles: Record<number, { color: string; bg: string }> = {
    11: { color: EMERALD, bg: LIGHT_GREEN },
    12: { color: GOLD,    bg: LIGHT_BG },
    13: { color: AMBER,   bg: LIGHT_AMBER },
  };

  for (let r = 11; r <= 13; r++) {
    const style = metricRowStyles[r];
    ss(ws, `A${r}`, {
      font: { bold: true, color: { rgb: '333333' }, sz: 11, name: 'Calibri' },
      fill: { fgColor: { rgb: style.bg } },
      alignment: { horizontal: 'left' as const, vertical: 'center' as const },
      border: fullBorder('D0D0D0', 'thin'),
    });
    ss(ws, `B${r}`, {
      font: { bold: true, color: { rgb: style.color }, sz: 12, name: 'Calibri' },
      fill: { fgColor: { rgb: style.bg } },
      alignment: { horizontal: 'right' as const, vertical: 'center' as const },
      border: fullBorder('D0D0D0', 'thin'),
    });
  }

  if (!ws['!merges']) ws['!merges'] = [];
  ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }); // A1:B1

  ws['!cols'] = [{ wch: 28 }, { wch: 20 }];

  return ws;
}

// ════════════════════════════════════════════════════════════
// GET /api/payroll/summary-export?month=7&year=2026&firm=LAPL
//   firm=ALL (or empty) → 4 firm sheets + 1 Summary sheet
//   firm=LAPL           → 1 LAPL sheet + 1 Summary sheet
// ════════════════════════════════════════════════════════════
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year  = parseInt(searchParams.get('year')  || String(new Date().getFullYear()));
    const firm  = searchParams.get('firm') || '';

    const monthName = MONTHS[month - 1];

    // Determine which firms to process
    const firmsToProcess = firm && firm !== 'all'
      ? [firm.toUpperCase()]
      : [...FIRM_ORDER];

    // Fetch ALL payrolls for the month (we'll filter in memory per firm)
    const allPayrolls = await db.payroll.findMany({
      where: { month, year },
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

    // Enrich all payrolls once
    const allEnriched = await Promise.all(allPayrolls.map(enrichPayroll));

    // Build the workbook
    const wb = XLSX.utils.book_new();

    for (const firmCode of firmsToProcess) {
      const firmName = FIRM_NAMES[firmCode] || firmCode;
      // Filter enriched payrolls for this firm
      const firmEnriched = allEnriched.filter(p => p.firm === firmCode);

      if (firmEnriched.length === 0) continue; // skip empty firms

      // Sort by employee name for stable output
      firmEnriched.sort((a, b) => a.fullName.localeCompare(b.fullName));

      const ws = buildFirmSheet(firmCode, firmName, monthName, year, firmEnriched);
      // Sheet name (max 31 chars, Excel limit)
      const sheetName = firmCode.length <= 31 ? firmCode : firmCode.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    // ── Summary sheet at the end (across ALL firms shown) ──
    const summaryEnriched = allEnriched.filter(p =>
      firmsToProcess.includes(p.firm)
    );
    if (summaryEnriched.length > 0) {
      const wsSummary = buildSummarySheet(monthName, year, summaryEnriched);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    }

    if (wb.SheetNames.length === 0) {
      return NextResponse.json(
        { error: 'No payroll data found for the selected firm(s) and month' },
        { status: 400 },
      );
    }

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;

    // Filename: include firm code in filename if specific firm, else "ALL"
    const firmPart = firm && firm !== 'all' ? `_${firm.toUpperCase()}` : '_ALL';
    const filename = `Payroll_Summary_${monthName}_${year}${firmPart}.xlsx`;

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
