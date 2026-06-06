import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';
import { db } from '@/lib/db';

// ════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const FIRM_NAMES: Record<string, string> = {
  LAPL: 'LAXREE AMENITIES PVT LTD',
  LRSL: 'LAXREE ROOFING SOLUTION',
  SI:   'SMARTH INTERNATIONAL',
  SDF:  'SANGRAH DECOR & FURNITURE',
};

// ── Premium theme colors ──
const GOLD     = 'D4A843';
const DARK     = '1A1A1A';
const WHITE    = 'FFFFFF';
const EMERALD  = '059669';
const RED      = 'DC2626';
const AMBER    = 'D97706';
const CYAN     = '0891B2';
const PURPLE   = '7C3AED';
const SKY      = '0284C7';
const LIGHT_BG     = 'FFF8E7';
const LIGHT_GREEN  = 'ECFDF5';
const LIGHT_RED    = 'FEF2F2';
const LIGHT_AMBER  = 'FFFBEB';
const LIGHT_BLUE   = 'DBEAFE';
const DEEP_BLUE    = '1E3A5F';

// ── Helpers ──

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

function fullBorder(color: string = 'B0B0B0', style: 'thin' | 'medium' = 'thin') {
  return {
    top:    { style, color: { rgb: color } },
    bottom: { style, color: { rgb: color } },
    left:   { style, color: { rgb: color } },
    right:  { style, color: { rgb: color } },
  };
}

// Null-safe style helper — only sets .s when the cell already exists
const ss = (ws: XLSX.WorkSheet, cellRef: string, style: Partial<XLSX.Style>) => {
  if (ws[cellRef]) ws[cellRef]!.s = style;
};

// ════════════════════════════════════════════════════════════
// GET /api/payroll/export?month=6&year=2025&firm=LAPL
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
      // Filter employees by firm code, then use their IDs
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
          },
        },
      },
      orderBy: { employeeId: 'asc' },
    });

    if (payrolls.length === 0) {
      return NextResponse.json({ error: 'No payroll records found for the given criteria.' }, { status: 404 });
    }

    const monthName = MONTHS[month - 1];

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
      font: { bold: true, color: { rgb: WHITE }, sz: 14, name: 'Calibri' },
      fill: { fgColor: { rgb: DEEP_BLUE } },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const },
      border: {
        top:    { style: 'thin' as const, color: { rgb: '4472C4' } },
        bottom: { style: 'thin' as const, color: { rgb: '4472C4' } },
        left:   { style: 'thin' as const, color: { rgb: '4472C4' } },
        right:  { style: 'thin' as const, color: { rgb: '4472C4' } },
      },
    };

    const styleSpacer = {
      fill: { fgColor: { rgb: LIGHT_BG } },
      border: { bottom: { style: 'medium' as const, color: { rgb: GOLD } } },
    };

    const styleInfoLabel = {
      font: { bold: true, color: { rgb: GOLD }, sz: 10, name: 'Calibri' },
      fill: { fgColor: { rgb: '2D2D2D' } },
      alignment: { horizontal: 'right' as const, vertical: 'center' as const },
      border: fullBorder('444444'),
    };

    const styleInfoValue = {
      font: { bold: true, color: { rgb: WHITE }, sz: 10, name: 'Calibri' },
      fill: { fgColor: { rgb: '2D2D2D' } },
      alignment: { horizontal: 'left' as const, vertical: 'center' as const },
      border: fullBorder('444444'),
    };

    const styleColHeader = {
      font: { bold: true, color: { rgb: WHITE }, sz: 9, name: 'Calibri' },
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
        left:   { style: 'thin' as const, color: { rgb: GOLD } },
        right:  { style: 'thin' as const, color: { rgb: GOLD } },
      },
    };

    const styleKpiLabel = {
      font: { bold: true, color: { rgb: WHITE }, sz: 9, name: 'Calibri' },
      fill: { fgColor: { rgb: DEEP_BLUE } },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const },
      border: fullBorder(WHITE, 'thin'),
    };

    // Column letters for 21 columns (A–U)
    const cols = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U'];

    // ═══════════════════════════════════════════════════
    // SHEET 1: Payroll Summary
    // ═══════════════════════════════════════════════════
    const headerRows: any[][] = [
      ['LAXREE GROUP OF COMPANIES', ...Array(20).fill('')],                            // Row 1
      [`PAYROLL SUMMARY — ${monthName} ${year}`, ...Array(20).fill('')],              // Row 2
      ['', ...Array(20).fill('')],                                                      // Row 3 spacer
      ['Employee Name:', '', 'Employee Code:', '', 'Firm:', '', 'Designation:', '',    // Row 4
       'Month:', `${monthName} ${year}`, ...Array(11).fill('')],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(headerRows);

    // ── Style Row 1: Company Name — gold on dark ──
    cols.forEach(c => { ss(ws1, `${c}1`, styleCompanyHeader); });

    // ── Style Row 2: Report Title — white on deep blue ──
    cols.forEach(c => { ss(ws1, `${c}2`, styleReportTitle); });

    // ── Style Row 3: Spacer with gold line ──
    cols.forEach(c => { ss(ws1, `${c}3`, styleSpacer); });

    // ── Style Row 4: Employee info labels/values ──
    ['A','D','G','J'].forEach(c => { ss(ws1, `${c}4`, styleInfoLabel); });
    ['B','E','H','K'].forEach(c => { ss(ws1, `${c}4`, styleInfoValue); });
    ['C','F','I','L','M','N','O','P','Q','R','S','T','U'].forEach(c => {
      ss(ws1, `${c}4`, { fill: { fgColor: { rgb: '2D2D2D' } }, border: fullBorder('444444') });
    });

    // ── Row 5: Column Headers ──
    const colHeaders = [
      'S.No', 'Employee Name', 'Employee Code', 'Firm', 'Designation',
      'Worked Hrs', 'Hourly Rate', 'OT Hrs', 'OT Amount',
      'Sunday Hrs', 'PH Hrs', 'Gross Salary', 'TDS', 'Loan',
      'Advance', 'Security Deposit', 'Other', 'Total Deductions',
      'Arrear', 'Net Salary', 'Status',
    ];
    XLSX.utils.sheet_add_aoa(ws1, [colHeaders], { origin: 'A5' });
    cols.forEach(c => { ss(ws1, `${c}5`, styleColHeader); });

    // ── Data rows ──
    payrolls.forEach((p, idx) => {
      const row = idx + 6;
      const firmCode = getFirmFromEmployeeId(p.employeeId) || p.employee?.department || '';
      const firmDisplay = firmCode ? (FIRM_NAMES[firmCode] || firmCode) : (p.employee?.firm || '');
      const status = p.status || 'generated';
      const dataRow = [
        idx + 1,
        p.employee?.fullName || p.employeeId,
        p.employeeId,
        firmDisplay,
        p.employee?.designation || '',
        (p.totalWorkedHrs || 0) > 0 ? parseFloat(formatHours(p.totalWorkedHrs || 0)) : 0,
        (p.hourlyRate || 0) > 0 ? parseFloat((p.hourlyRate).toFixed(2)) : 0,
        parseFloat(formatHours(p.otHours || 0)),
        p.otAmount || 0,
        parseFloat(formatHours(p.sundayHrs || 0)),
        parseFloat(formatHours(p.phHours || 0)),
        p.grossSalary,
        p.tdsDeduction || 0,
        p.loanDeduction || 0,
        p.advanceDeduction || 0,
        p.securityDeposit || 0,
        p.otherDeductions || 0,
        p.totalDeductions,
        p.arrear || 0,
        p.netSalary,
        status.charAt(0).toUpperCase() + status.slice(1),
      ];
      XLSX.utils.sheet_add_aoa(ws1, [dataRow], { origin: `A${row}` });

      // Alternating row colors
      const bgColor = idx % 2 === 0 ? LIGHT_BG : WHITE;
      const styleDataRow = {
        font: { sz: 9, color: { rgb: '333333' }, name: 'Calibri' },
        fill: { fgColor: { rgb: bgColor } },
        alignment: { horizontal: 'center' as const, vertical: 'center' as const },
        border: fullBorder('D0D0D0'),
      };
      cols.forEach(c => { ss(ws1, `${c}${row}`, styleDataRow); });

      // Status color coding
      const statusCol = 'U';
      if (status === 'paid') {
        ss(ws1, `${statusCol}${row}`, {
          ...styleDataRow,
          font: { bold: true, color: { rgb: EMERALD }, sz: 9, name: 'Calibri' },
          fill: { fgColor: { rgb: LIGHT_GREEN } },
        });
      } else if (status === 'approved') {
        ss(ws1, `${statusCol}${row}`, {
          ...styleDataRow,
          font: { bold: true, color: { rgb: SKY }, sz: 9, name: 'Calibri' },
          fill: { fgColor: { rgb: LIGHT_BLUE } },
        });
      } else {
        ss(ws1, `${statusCol}${row}`, {
          ...styleDataRow,
          font: { bold: true, color: { rgb: AMBER }, sz: 9, name: 'Calibri' },
          fill: { fgColor: { rgb: LIGHT_AMBER } },
        });
      }

      // Net salary in gold
      ss(ws1, `T${row}`, {
        ...styleDataRow,
        font: { bold: true, color: { rgb: GOLD }, sz: 9, name: 'Calibri' },
      });
    });

    // ── TOTALS row ──
    const totalRow = payrolls.length + 6;
    const totalG = payrolls.reduce((s, p) => s + p.grossSalary, 0);
    const totalD = payrolls.reduce((s, p) => s + p.totalDeductions, 0);
    const totalA = payrolls.reduce((s, p) => s + (p.arrear || 0), 0);
    const totalN = payrolls.reduce((s, p) => s + p.netSalary, 0);
    const totalOT = payrolls.reduce((s, p) => s + (p.otHours || 0), 0);

    XLSX.utils.sheet_add_aoa(ws1, [
      ['TOTAL', '', '', '', '', '', '', '', '', '', '', totalG, '', '', '', '', '', totalD, totalA, totalN, ''],
    ], { origin: `A${totalRow}` });
    cols.forEach(c => { ss(ws1, `${c}${totalRow}`, styleTotals); });

    // ── Merge cells for header rows ──
    if (!ws1['!merges']) ws1['!merges'] = [];
    ws1['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 20 } }); // Row 1
    ws1['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 20 } }); // Row 2

    // ── Column widths ──
    ws1['!cols'] = [
      { wch: 6 },   // S.No
      { wch: 22 },  // Employee Name
      { wch: 14 },  // Employee Code
      { wch: 8 },   // Firm
      { wch: 16 },  // Designation
      { wch: 11 },  // Worked Hrs
      { wch: 11 },  // Hourly Rate
      { wch: 9 },   // OT Hrs
      { wch: 11 },  // OT Amount
      { wch: 10 },  // Sunday Hrs
      { wch: 9 },   // PH Hrs
      { wch: 13 },  // Gross Salary
      { wch: 10 },  // TDS
      { wch: 10 },  // Loan
      { wch: 10 },  // Advance
      { wch: 14 },  // Security Deposit
      { wch: 10 },  // Other
      { wch: 14 },  // Total Deductions
      { wch: 10 },  // Arrear
      { wch: 13 },  // Net Salary
      { wch: 12 },  // Status
    ];

    // ═══════════════════════════════════════════════════
    // SHEET 2: Summary Dashboard
    // ═══════════════════════════════════════════════════
    const dashRows: any[][] = [
      ['LAXREE GROUP OF COMPANIES', '', '', '', '', ''],
      [`PAYROLL DASHBOARD — ${monthName} ${year}`, '', '', '', '', ''],
      ['', '', '', '', '', ''],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(dashRows);
    const cols6 = ['A','B','C','D','E','F'];

    // Row 1: Company name
    cols6.forEach(c => { ss(ws2, `${c}1`, styleCompanyHeader); });
    // Row 2: Title
    cols6.forEach(c => { ss(ws2, `${c}2`, styleReportTitle); });
    // Row 3: Spacer
    cols6.forEach(c => { ss(ws2, `${c}3`, styleSpacer); });

    // KPI Cards
    const kpis = [
      { label: 'Total Employees',  value: payrolls.length,                                                 color: EMERALD, bg: LIGHT_GREEN },
      { label: 'Total Gross',      value: `₹${totalG.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: CYAN,    bg: LIGHT_BLUE },
      { label: 'Total OT Hours',   value: `${formatHours(totalOT)}h`,                                      color: AMBER,   bg: LIGHT_AMBER },
      { label: 'Total Deductions', value: `₹${totalD.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: RED,     bg: LIGHT_RED },
      { label: 'Total Net Payroll',value: `₹${totalN.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: GOLD,    bg: LIGHT_BG },
      { label: 'Total Arrears',    value: `₹${totalA.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: PURPLE,  bg: LIGHT_BG },
    ];

    // Row 4: KPI Labels
    const kpiLabels = kpis.map(k => k.label);
    XLSX.utils.sheet_add_aoa(ws2, [kpiLabels], { origin: 'A4' });
    cols6.forEach(c => { ss(ws2, `${c}4`, styleKpiLabel); });

    // Row 5: KPI Values
    const kpiValues = kpis.map(k => k.value);
    XLSX.utils.sheet_add_aoa(ws2, [kpiValues], { origin: 'A5' });

    kpis.forEach((k, i) => {
      const col = cols6[i];
      ss(ws2, `${col}5`, {
        font: { bold: true, color: { rgb: k.color }, sz: 14, name: 'Calibri' },
        fill: { fgColor: { rgb: k.bg } },
        alignment: { horizontal: 'center' as const, vertical: 'center' as const },
        border: {
          top:    { style: 'thin' as const, color: { rgb: GOLD } },
          bottom: { style: 'medium' as const, color: { rgb: GOLD } },
          left:   { style: 'thin' as const, color: { rgb: GOLD } },
          right:  { style: 'thin' as const, color: { rgb: GOLD } },
        },
      });
    });

    // Merge headers
    if (!ws2['!merges']) ws2['!merges'] = [];
    ws2['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });
    ws2['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } });

    ws2['!cols'] = [
      { wch: 20 }, { wch: 20 }, { wch: 18 },
      { wch: 20 }, { wch: 20 }, { wch: 18 },
    ];

    // ═══════════════════════════════════════════════════
    // Build workbook & return
    // ═══════════════════════════════════════════════════
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Payroll Summary');
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary Dashboard');

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
    console.error('Payroll export error:', error);
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}
