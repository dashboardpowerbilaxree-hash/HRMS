'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { FileText, Download, Printer, Building2, Mail, Phone, MapPin, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useHRMSStore } from '@/lib/store';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { toast } from 'sonner';

// ── Advance Section Component ──
function AdvanceSection({ employeeId, month, year, advanceDeduction }: { employeeId: string; month: number; year: number; advanceDeduction: number }) {
  const [advances, setAdvances] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/advances?employeeId=${employeeId}&month=${month}&year=${year}`)
      .then(res => res.json())
      .then(data => setAdvances(data))
      .catch(() => {});
  }, [employeeId, month, year]);

  if (advances.length === 0) return null;

  return (
    <div className="mx-5 mb-3 border border-amber-300/30 rounded-lg overflow-hidden">
      <div className="bg-amber-500/10 px-4 py-2 border-b border-amber-300/20">
        <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Advance Details</p>
      </div>
      <div className="px-4 py-2 space-y-1.5">
        {advances.map((adv: any, idx: number) => (
          <div key={adv.id} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">#{idx + 1}</span>
              <span>{adv.reason}</span>
              <span className="text-muted-foreground">({new Date(adv.date).toLocaleDateString('en-IN')})</span>
            </div>
            <span className="font-bold text-amber-600 dark:text-amber-400">₹{Number(adv.amount).toLocaleString('en-IN')}</span>
          </div>
        ))}
        <div className="flex items-center justify-between text-xs border-t border-amber-200/20 pt-1.5 mt-1.5">
          <span className="font-semibold">Total Advance Deducted</span>
          <span className="font-bold text-amber-700 dark:text-amber-400">₹{advanceDeduction.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
}

const FIRM_BADGE_CLASS: Record<string, string> = {
  LAPL: 'firm-badge-lapl',
  LRSL: 'firm-badge-lrsl',
  SI: 'firm-badge-si',
  SDF: 'firm-badge-sdf',
};

const FIRM_NAMES: Record<string, string> = {
  LAPL: 'LAXREE AMENITIES PVT LTD',
  LRSL: 'LAXREE ROOFING SOLUTION',
  SI: 'SMARTH INTERNATIONAL',
  SDF: 'SANGRAH DECOR & FURNITURE',
};

const FIRM_LOGOS: Record<string, string> = {
  LAPL: '/logos/lapl.jpg',
  LRSL: '/logos/lrsl.jpg',
  SI: '/logos/si.png',
  SDF: '/logos/sdf.png',
};

const FIRM_ADDRESSES: Record<string, string> = {
  LAPL: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001',
  LRSL: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001',
  SI: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001',
  SDF: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001',
};

const FIRM_PHONES: Record<string, string> = {
  LAPL: '+919251683663',
  LRSL: '+919251683663',
  SI: '+919251683663',
  SDF: '+919251683663',
};

const FIRM_EMAILS: Record<string, string> = {
  LAPL: 'hr@laxree.com',
  LRSL: 'hr@laxrereoofing.com',
  SI: 'hr@smarthinternational.com',
  SDF: 'hr@sangrahdecor.com',
};

// ── Convert decimal hours to HH.MM display format ──
function formatHours(decimal: number): string {
  if (!decimal || decimal === 0) return '0.00';
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  if (minutes >= 60) return `${hours + 1}.00`;
  return `${hours}.${String(minutes).padStart(2, '0')}`;
}

// ── Get firm code from employee ID prefix ──
function getFirmFromEmployeeId(employeeId: string): string {
  const id = employeeId.toUpperCase();
  if (id.startsWith('LAPL')) return 'LAPL';
  if (id.startsWith('LRSL')) return 'LRSL';
  if (id.startsWith('SI-') || id.startsWith('SI0')) return 'SI';
  if (id.startsWith('SDF')) return 'SDF';
  return '';
}

function FirmBadge({ f }: { f: string }) {
  return <span className={FIRM_BADGE_CLASS[f] || 'firm-badge-lapl'}>{f}</span>;
}

// ── Convert number to words (Indian format) ──
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = 'Rupees ' + convert(rupees);
  if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
  result += ' Only';
  return result;
}

interface FirmDetails {
  code: string;
  name: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  logo?: string;
}

export function SalarySlipGenerator() {
  const { selectedEmployeeId } = useHRMSStore();
  const [employeeId, setEmployeeId] = useState(selectedEmployeeId || '');
  const [employees, setEmployees] = useState<{ employeeId: string; fullName: string; department: string; firm: string; location: string; salaryType: string; mobile?: string; email?: string; address?: string }[]>([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [slip, setSlip] = useState<any>(null);
  const [firms, setFirms] = useState<FirmDetails[]>([]);
  const slipRef = useRef<HTMLDivElement>(null);

  const loadEmployees = useCallback(async () => {
    const data = await (await fetch('/api/employees')).json();
    setEmployees(data);
  }, []);

  const loadFirms = useCallback(async () => {
    try {
      const res = await fetch('/api/firms');
      if (res.ok) {
        const data = await res.json();
        setFirms(data);
      }
    } catch {}
  }, []);

  useEffect(() => { loadEmployees(); loadFirms(); }, [loadEmployees, loadFirms]);

  useEffect(() => {
    if (selectedEmployeeId) setEmployeeId(selectedEmployeeId);
  }, [selectedEmployeeId]);

  const loadSlip = useCallback(async () => {
    if (!employeeId) return;
    const [empRes, payRes] = await Promise.all([
      fetch(`/api/employees/${employeeId}`),
      fetch(`/api/payroll?employeeId=${employeeId}&month=${month}&year=${year}`),
    ]);
    const empData = await empRes.json();
    const payData = await payRes.json();
    setSlip({ employee: empData, payroll: payData[0] || null });
  }, [employeeId, month, year]);

  useEffect(() => { loadSlip(); }, [loadSlip]);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Get firm details for the employee
  const firmCode = (slip?.employee?.employeeId ? getFirmFromEmployeeId(slip.employee.employeeId) : '') || slip?.employee?.department || slip?.employee?.firm || '';
  const firmDetails = firms.find(f => f.code === firmCode);
  const firmFullName = FIRM_NAMES[firmCode] || firmDetails?.name || 'Laxree Group of Companies';
  const firmAddress = FIRM_ADDRESSES[firmCode] || firmDetails?.address || '';
  const firmPhone = FIRM_PHONES[firmCode] || firmDetails?.contactPhone || '+919251683663';
  const firmEmail = FIRM_EMAILS[firmCode] || firmDetails?.contactEmail || 'hr@laxree.com';
  const firmLogo = FIRM_LOGOS[firmCode] || '/laxree-logo.png';

  // ── Helper: Download XLSX workbook reliably (always uses blob approach) ──
  const downloadWorkbook = async (wb: any, filename: string) => {
    try {
      const XLSX = await import('xlsx-js-style');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      setTimeout(() => {
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 250);
      }, 50);
    } catch (e2) {
      toast.error('Download failed. Please try again.');
      console.error('Excel download error:', e2);
    }
  };

  // ── Professional Excel Export (Beautiful & Colorful — Matching Payslip Format) ──
  const handleExportExcel = async () => {
    if (!slip?.payroll) return;
    const XLSX = await import('xlsx-js-style');
    const p = slip.payroll;
    const e = slip.employee;
    const baseSalary = p.baseSalary != null ? p.baseSalary : Math.round((p.monthlySalary - ((p.monthlySalary / (new Date(year, month, 0).getDate())) * p.absentDays)) * 100) / 100;
    const perDayRate = Math.round((p.monthlySalary / (new Date(year, month, 0).getDate())) * 100) / 100;
    const totalEarnings = p.grossSalary + (p.bonus || 0) + (p.incentive || 0) + (p.arrear || 0);

    // Color constants
    const BLUE = '1E3A5F';
    const LIGHT_BLUE = 'DBEAFE';
    const WHITE = 'FFFFFF';
    const BLACK = '1A1A1A';
    const EMERALD = '059669';
    const RED = 'DC2626';
    const GOLD = 'D4A843';
    const TEAL = '0D9488';
    const LIGHT_GREEN = 'ECFDF5';
    const LIGHT_RED = 'FEF2F2';
    const LIGHT_GOLD = 'FFF8E7';

    const fullBorder = (color: string = 'B0B0B0', style: 'thin' | 'medium' = 'thin') => ({
      top: { style, color: { rgb: color } },
      bottom: { style, color: { rgb: color } },
      left: { style, color: { rgb: color } },
      right: { style, color: { rgb: color } },
    });

    const wb = XLSX.utils.book_new();

    // ── Payslip Sheet in the exact format user wants ──
    const data: any[][] = [
      // Row 1: Title
      ['SALARY SLIP FORMAT'],
      // Row 2: Company Information Header
      ['Salary Slip', '', '', '', 'COMPANY LOGO'],
      // Row 3: Company Info section header
      ['Company Information', '', '', '', ''],
      // Rows 4-7: Company details
      ['Company Name :', firmFullName, '', '', ''],
      ['Company Address :', firmAddress, '', '', ''],
      ['Company Phone no :', firmPhone, '', '', ''],
      ['Company Email Address :', firmEmail, '', '', ''],
      // Row 8: Employee Information header
      ['Employee Information', '', '', '', ''],
      // Rows 9-12: Employee details
      ['Employee Name :', e.fullName, '', '', ''],
      ['Employee Address :', e.address || e.location || 'N/A', '', '', ''],
      ['Employee Phone no :', e.mobile || 'N/A', '', '', ''],
      ['Employee Email ID :', e.email || 'N/A', '', '', ''],
      // Row 13: blank
      [],
      // Row 14: Earnings/Deductions header
      ['Earnings', 'Amount', '', 'Deductions', 'Amount'],
      // Rows 15-23: Earnings & Deductions rows
      ['Basic', baseSalary.toLocaleString('en-IN'), '', 'Provident Fund', '0'],
      ['HRA', '0', '', 'ESI', '0'],
      ['Special Allowance', '0', '', 'Professional Tax', '0'],
      ['Gross Salary', p.grossSalary.toLocaleString('en-IN'), '', 'Salary Advance', (p.advanceDeduction || 0).toLocaleString('en-IN')],
      ['Other Earnings', (p.arrear || 0).toLocaleString('en-IN'), '', 'TDS', (p.tdsDeduction || 0).toLocaleString('en-IN')],
      ['Incentives', (p.incentive || 0).toLocaleString('en-IN'), '', 'Loan', (p.loanDeduction || 0).toLocaleString('en-IN')],
      ['Bonus', (p.bonus || 0).toLocaleString('en-IN'), '', 'Security Deposit', (p.securityDeposit || 0).toLocaleString('en-IN')],
      ['Over Time Pay', (p.otAmount || 0).toLocaleString('en-IN'), '', 'Other Deduction', (p.otherDeductions || 0).toLocaleString('en-IN')],
      ['Total Earnings', totalEarnings.toLocaleString('en-IN'), '', 'Net Pay', p.netSalary.toLocaleString('en-IN')],
      // Row 24: blank
      [],
      // Row 25: In Words
      ['In Words :', numberToWords(p.netSalary), '', '', ''],
      // Row 26: blank
      [],
      // Row 27: Signature section
      ['Prepared By :', '', '', 'Received By :', ''],
      // Row 28: blank
      [],
      // Row 29: Footer
      [`This is a computer-generated payslip by ${firmFullName}`],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const cols5 = ['A','B','C','D','E'];

    // Row 1: Title
    cols5.forEach(c => { if (ws[`${c}1`]) ws[`${c}1`].s = { font: { bold: true, color: { rgb: BLACK }, sz: 18 }, alignment: { horizontal: 'center' as const }, border: fullBorder(BLACK, 'medium') }; });

    // Row 2: Salary Slip / Company Logo
    if (ws['A2']) ws['A2'].s = { font: { bold: true, color: { rgb: WHITE }, sz: 14 }, fill: { fgColor: { rgb: BLUE } }, alignment: { horizontal: 'center' as const }, border: fullBorder(BLUE, 'medium') };
    if (ws['B2']) ws['B2'].s = { font: { bold: true, color: { rgb: WHITE }, sz: 14 }, fill: { fgColor: { rgb: BLUE } }, border: fullBorder(BLUE, 'medium') };
    if (ws['D2']) ws['D2'].s = { font: { bold: true, color: { rgb: WHITE }, sz: 10 }, fill: { fgColor: { rgb: BLUE } }, alignment: { horizontal: 'center' as const }, border: fullBorder(BLUE, 'medium') };
    if (ws['E2']) ws['E2'].s = { font: { bold: true, color: { rgb: WHITE }, sz: 10 }, fill: { fgColor: { rgb: BLUE } }, alignment: { horizontal: 'center' as const }, border: fullBorder(BLUE, 'medium') };

    // Row 3: Company Information section header
    cols5.forEach(c => { if (ws[`${c}3`]) ws[`${c}3`].s = { font: { bold: true, color: { rgb: WHITE }, sz: 11 }, fill: { fgColor: { rgb: BLUE } }, border: fullBorder(BLUE) }; });

    // Rows 4-7: Company details (light blue background)
    for (const r of [4, 5, 6, 7]) {
      if (ws[`A${r}`]) ws[`A${r}`].s = { font: { bold: true, sz: 10, color: { rgb: BLACK } }, fill: { fgColor: { rgb: LIGHT_BLUE } }, border: fullBorder('90B8E0') };
      if (ws[`B${r}`]) ws[`B${r}`].s = { font: { sz: 10 }, fill: { fgColor: { rgb: LIGHT_BLUE } }, border: fullBorder('90B8E0') };
    }

    // Row 8: Employee Information header
    cols5.forEach(c => { if (ws[`${c}8`]) ws[`${c}8`].s = { font: { bold: true, color: { rgb: BLACK }, sz: 11 }, fill: { fgColor: { rgb: 'E8E8E8' } }, border: fullBorder('999999') }; });

    // Rows 9-12: Employee details (white background)
    for (const r of [9, 10, 11, 12]) {
      if (ws[`A${r}`]) ws[`A${r}`].s = { font: { bold: true, sz: 10, color: { rgb: BLACK } }, border: fullBorder('CCCCCC') };
      if (ws[`B${r}`]) ws[`B${r}`].s = { font: { sz: 10 }, border: fullBorder('CCCCCC') };
    }

    // Row 14: Earnings/Deductions header
    if (ws['A14']) ws['A14'].s = { font: { bold: true, color: { rgb: WHITE }, sz: 11 }, fill: { fgColor: { rgb: EMERALD } }, alignment: { horizontal: 'center' as const }, border: fullBorder(EMERALD, 'medium') };
    if (ws['B14']) ws['B14'].s = { font: { bold: true, color: { rgb: WHITE }, sz: 11 }, fill: { fgColor: { rgb: EMERALD } }, alignment: { horizontal: 'center' as const }, border: fullBorder(EMERALD, 'medium') };
    if (ws['D14']) ws['D14'].s = { font: { bold: true, color: { rgb: WHITE }, sz: 11 }, fill: { fgColor: { rgb: RED } }, alignment: { horizontal: 'center' as const }, border: fullBorder(RED, 'medium') };
    if (ws['E14']) ws['E14'].s = { font: { bold: true, color: { rgb: WHITE }, sz: 11 }, fill: { fgColor: { rgb: RED } }, alignment: { horizontal: 'center' as const }, border: fullBorder(RED, 'medium') };

    // Rows 15-23: Earnings/Deductions data (alternating colors)
    for (let i = 0; i < 9; i++) {
      const r = 15 + i;
      const isEven = i % 2 === 0;
      const earnBg = isEven ? LIGHT_GREEN : LIGHT_GOLD;
      const dedBg = isEven ? LIGHT_RED : 'FFF0F0';
      const isTotal = i === 8; // last row

      if (ws[`A${r}`]) ws[`A${r}`].s = { font: { sz: 10, bold: isTotal, color: { rgb: isTotal ? EMERALD : BLACK } }, fill: { fgColor: { rgb: earnBg } }, border: fullBorder(isTotal ? EMERALD : 'C0C0C0', isTotal ? 'medium' : 'thin') };
      if (ws[`B${r}`]) ws[`B${r}`].s = { font: { sz: 10, bold: isTotal, color: { rgb: isTotal ? EMERALD : BLACK } }, fill: { fgColor: { rgb: earnBg } }, alignment: { horizontal: 'right' as const }, border: fullBorder(isTotal ? EMERALD : 'C0C0C0', isTotal ? 'medium' : 'thin') };
      if (ws[`D${r}`]) ws[`D${r}`].s = { font: { sz: 10, bold: isTotal, color: { rgb: isTotal ? RED : BLACK } }, fill: { fgColor: { rgb: dedBg } }, border: fullBorder(isTotal ? RED : 'C0C0C0', isTotal ? 'medium' : 'thin') };
      if (ws[`E${r}`]) ws[`E${r}`].s = { font: { sz: 10, bold: isTotal, color: { rgb: isTotal ? RED : BLACK } }, fill: { fgColor: { rgb: dedBg } }, alignment: { horizontal: 'right' as const }, border: fullBorder(isTotal ? RED : 'C0C0C0', isTotal ? 'medium' : 'thin') };
    }

    // Row 25: In Words (blue bg)
    if (ws['A25']) ws['A25'].s = { font: { bold: true, sz: 10, color: { rgb: BLUE } }, fill: { fgColor: { rgb: LIGHT_BLUE } }, border: fullBorder(BLUE) };
    if (ws['B25']) ws['B25'].s = { font: { italic: true, sz: 10, color: { rgb: BLUE } }, fill: { fgColor: { rgb: LIGHT_BLUE } }, border: fullBorder(BLUE) };

    // Row 27: Signature section (blue bg)
    cols5.forEach(c => { if (ws[`${c}27`]) ws[`${c}27`].s = { font: { bold: true, sz: 10, color: { rgb: WHITE } }, fill: { fgColor: { rgb: BLUE } }, border: fullBorder(BLUE) }; });

    // Rows 29-30: Footer
    cols5.forEach(c => { if (ws[`${c}29`]) ws[`${c}29`].s = { font: { italic: true, sz: 8, color: { rgb: '888888' } } }; });
    cols5.forEach(c => { if (ws[`${c}30`]) ws[`${c}30`].s = { font: { italic: true, sz: 8, color: { rgb: '888888' } } }; });

    ws['!cols'] = [
      { wch: 22 }, { wch: 28 }, { wch: 4 }, { wch: 22 }, { wch: 28 },
    ];
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
      { s: { r: 1, c: 3 }, e: { r: 1, c: 4 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
      { s: { r: 3, c: 1 }, e: { r: 3, c: 4 } },
      { s: { r: 4, c: 1 }, e: { r: 4, c: 4 } },
      { s: { r: 5, c: 1 }, e: { r: 5, c: 4 } },
      { s: { r: 6, c: 1 }, e: { r: 6, c: 4 } },
      { s: { r: 7, c: 0 }, e: { r: 7, c: 4 } },
      { s: { r: 8, c: 1 }, e: { r: 8, c: 4 } },
      { s: { r: 9, c: 1 }, e: { r: 9, c: 4 } },
      { s: { r: 10, c: 1 }, e: { r: 10, c: 4 } },
      { s: { r: 11, c: 1 }, e: { r: 11, c: 4 } },
      { s: { r: 13, c: 2 }, e: { r: 13, c: 2 } },
      { s: { r: 24, c: 1 }, e: { r: 24, c: 4 } },
      { s: { r: 28, c: 0 }, e: { r: 28, c: 4 } },
      { s: { r: 29, c: 0 }, e: { r: 29, c: 4 } },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Salary Slip');

    // ── Sheet 2: Detailed Breakdown ──
    const detailData: any[][] = [
      [firmFullName],
      ['SALARY BREAKDOWN — ' + months[month - 1] + ' ' + year],
      [],
      ['Employee Details'],
      ['Name', e.fullName, '', 'Code', e.employeeId],
      ['Company', `${firmCode} - ${firmFullName}`, '', 'Location', e.location || 'N/A'],
      ['Designation', e.designation || 'N/A', '', 'Salary Type', (e.salaryType || 'hourly').charAt(0).toUpperCase() + (e.salaryType || 'hourly').slice(1)],
      [],
      ['Earnings & Deductions Summary'],
      ['Monthly Salary', p.monthlySalary.toLocaleString('en-IN'), '', 'Days in Month', new Date(year, month, 0).getDate()],
      ['Base Salary', baseSalary.toLocaleString('en-IN'), '', 'Present Days', p.presentDays || 0],
      ['Absent Days', (p.absentDays || 0).toString(), '', 'Gross Salary', p.grossSalary.toLocaleString('en-IN')],
      [],
      ['Hours Breakdown'],
      ['Total Worked Hrs', formatHours(p.totalWorkedHrs || 0), '', 'OT Hours', formatHours(p.otHours || 0)],
      ['Sunday Hours', formatHours(p.sundayHrs || 0), '', 'PH Hours', formatHours(p.phHours || 0)],
      ['OT Amount', (p.otAmount || 0).toLocaleString('en-IN'), '', '', ''],
    ];

    const ws2 = XLSX.utils.aoa_to_sheet(detailData);
    const cols = ['A','B','C','D','E'];
    // Style
    cols.forEach(c => { if (ws2[`${c}1`]) ws2[`${c}1`].s = { font: { bold: true, color: { rgb: GOLD }, sz: 14 }, fill: { fgColor: { rgb: BLACK } }, alignment: { horizontal: 'center' as const }, border: fullBorder(GOLD, 'medium') }; });
    cols.forEach(c => { if (ws2[`${c}2`]) ws2[`${c}2`].s = { font: { bold: true, color: { rgb: WHITE }, sz: 11 }, fill: { fgColor: { rgb: BLUE } }, alignment: { horizontal: 'center' as const }, border: fullBorder(BLUE) }; });
    ['A','D'].forEach(c => { if (ws2[`${c}4`]) ws2[`${c}4`].s = { font: { bold: true, color: { rgb: GOLD }, sz: 10 }, fill: { fgColor: { rgb: '2D2D2D' } } }; });
    for (const r of [5,6,7]) {
      if (ws2[`A${r}`]) ws2[`A${r}`].s = { font: { sz: 10, color: { rgb: '666666' } } };
      if (ws2[`B${r}`]) ws2[`B${r}`].s = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: LIGHT_GOLD } } };
      if (ws2[`D${r}`]) ws2[`D${r}`].s = { font: { sz: 10, color: { rgb: '666666' } } };
      if (ws2[`E${r}`]) ws2[`E${r}`].s = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: LIGHT_GOLD } } };
    }
    ['A','D'].forEach(c => { if (ws2[`${c}9`]) ws2[`${c}9`].s = { font: { bold: true, color: { rgb: GOLD }, sz: 10 }, fill: { fgColor: { rgb: '2D2D2D' } } }; });
    for (const r of [10,11,12,13]) {
      if (ws2[`A${r}`]) ws2[`A${r}`].s = { font: { sz: 10, color: { rgb: '666666' } } };
      if (ws2[`B${r}`]) ws2[`B${r}`].s = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: LIGHT_BLUE } } };
      if (ws2[`D${r}`]) ws2[`D${r}`].s = { font: { sz: 10, color: { rgb: '666666' } } };
      if (ws2[`E${r}`]) ws2[`E${r}`].s = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: LIGHT_BLUE } } };
    }
    ['A','D'].forEach(c => { if (ws2[`${c}15`]) ws2[`${c}15`].s = { font: { bold: true, color: { rgb: GOLD }, sz: 10 }, fill: { fgColor: { rgb: '2D2D2D' } } }; });
    for (const r of [16,17,18]) {
      if (ws2[`A${r}`]) ws2[`A${r}`].s = { font: { sz: 10, color: { rgb: '666666' } } };
      if (ws2[`B${r}`]) ws2[`B${r}`].s = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: LIGHT_GOLD } } };
      if (ws2[`D${r}`]) ws2[`D${r}`].s = { font: { sz: 10, color: { rgb: '666666' } } };
      if (ws2[`E${r}`]) ws2[`E${r}`].s = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: LIGHT_GOLD } } };
    }

    ws2['!cols'] = [{ wch: 32 }, { wch: 22 }, { wch: 4 }, { wch: 22 }, { wch: 22 }];
    ws2['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Breakdown');

    await downloadWorkbook(wb, `Payslip_${e.fullName}_${months[month - 1]}_${year}.xlsx`);
    toast.success('Payslip Excel downloaded successfully!');
  };

  // ── Print Handler (Professional Blue-White Format matching user's desired layout) ──
  const handlePrint = () => {
    if (!slip?.payroll || !slipRef.current) return;
    const p = slip.payroll;
    const e = slip.employee;
    const baseSalary = p.baseSalary != null ? p.baseSalary : Math.round((p.monthlySalary - ((p.monthlySalary / (new Date(year, month, 0).getDate())) * p.absentDays)) * 100) / 100;
    const totalEarnings = p.grossSalary + (p.bonus || 0) + (p.incentive || 0) + (p.arrear || 0);
    const perDayRate = Math.round((p.monthlySalary / (new Date(year, month, 0).getDate())) * 100) / 100;

    const logoAbsUrl = `${window.location.origin}${firmLogo}`;

    const printWin = window.open('', '_blank', 'width=800,height=1000');
    if (!printWin) return;
    printWin.document.write(`<!DOCTYPE html><html><head><title>Salary Slip - ${e.fullName}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&display=swap');
      @page { size: A4; margin: 10mm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Merriweather', 'Georgia', 'Liberation Serif', serif; font-size: 11px; color: #222; background: #fff; }
      .payslip { max-width: 750px; margin: 0 auto; border: 2px solid #1E3A5F; border-radius: 8px; overflow: hidden; }
      .title { text-align: center; font-size: 20px; font-weight: 800; padding: 10px; color: #1A1A1A; border-bottom: 2px solid #1E3A5F; }
      .company-header { background: #1E3A5F; color: white; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; }
      .company-header .left h2 { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
      .company-header .left p { font-size: 10px; color: #b0c4de; }
      .company-header .logo-box { width: 70px; height: 70px; background: white; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
      .company-header .logo-box img { width: 100%; height: 100%; object-fit: contain; }
      .section-header { background: #1E3A5F; color: white; padding: 6px 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
      .info-grid { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; padding: 10px 20px; background: #DBEAFE; }
      .info-grid .label { font-weight: 600; font-size: 10px; color: #1E3A5F; }
      .info-grid .value { font-size: 10px; }
      .emp-section { background: white; }
      .emp-section .info-grid { background: #f8f9fa; }
      .table-section { padding: 0; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #059669; color: white; font-size: 11px; font-weight: 700; padding: 8px 12px; text-align: left; }
      th.ded { background: #DC2626; }
      td { padding: 6px 12px; font-size: 10px; border-bottom: 1px solid #e5e7eb; }
      tr:nth-child(even) td { background: #ECFDF5; }
      tr:nth-child(even) td.ded-cell { background: #FEF2F2; }
      tr.total-row td { font-weight: 700; border-top: 2px solid #333; background: #f0fdf4 !important; font-size: 12px; }
      tr.total-row td.ded-cell { background: #fef2f2 !important; color: #DC2626; }
      tr.total-row td.earn-total { color: #059669; }
      .net-pay-row td { font-weight: 800; background: #FEF2F2 !important; color: #DC2626; font-size: 13px; border-top: 2px solid #DC2626; }
      .in-words { padding: 8px 20px; background: #DBEAFE; font-size: 10px; color: #1E3A5F; }
      .in-words .label { font-weight: 700; }
      .in-words .value { font-style: italic; }
      .signature-section { background: #1E3A5F; color: white; padding: 12px 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
      .sig-line { border-top: 1px solid white; padding-top: 4px; text-align: center; font-size: 9px; margin-top: 20px; }
      .footer { padding: 6px 20px; text-align: center; font-size: 8px; color: #999; border-top: 1px solid #eee; }
    </style></head><body>
    <div class="payslip">
      <div class="title">SALARY SLIP FORMAT</div>
      <div class="company-header">
        <div class="left">
          <h2>Salary Slip</h2>
          <p>Company Information</p>
        </div>
        <div class="logo-box"><img src="${logoAbsUrl}" alt="${firmCode}" /></div>
      </div>
      <div class="info-grid">
        <span class="label">Company Name :</span><span class="value">${firmFullName}</span>
        <span class="label">Company Address :</span><span class="value">${firmAddress}</span>
        <span class="label">Company Phone no :</span><span class="value">${firmPhone}</span>
        <span class="label">Company Email Address :</span><span class="value">${firmEmail}</span>
      </div>
      <div class="section-header">Employee Information</div>
      <div class="emp-section">
        <div class="info-grid">
          <span class="label">Employee Name :</span><span class="value">${e.fullName}</span>
          <span class="label">Employee Address :</span><span class="value">${e.address || e.location || 'N/A'}</span>
          <span class="label">Employee Phone no :</span><span class="value">${e.mobile || 'N/A'}</span>
          <span class="label">Employee Email ID :</span><span class="value">${e.email || 'N/A'}</span>
        </div>
      </div>
      <div class="table-section">
        <table>
          <tr><th>Earnings</th><th>Amount</th><th class="ded">Deductions</th><th class="ded">Amount</th></tr>
          <tr><td>Basic</td><td>₹${baseSalary.toLocaleString('en-IN')}</td><td class="ded-cell">Provident Fund</td><td class="ded-cell">₹0</td></tr>
          <tr><td>HRA</td><td>₹0</td><td class="ded-cell">ESI</td><td class="ded-cell">₹0</td></tr>
          <tr><td>Special Allowance</td><td>₹0</td><td class="ded-cell">Professional Tax</td><td class="ded-cell">₹0</td></tr>
          <tr><td>Gross Salary</td><td>₹${p.grossSalary.toLocaleString('en-IN')}</td><td class="ded-cell">Salary Advance</td><td class="ded-cell">₹${(p.advanceDeduction || 0).toLocaleString('en-IN')}</td></tr>
          <tr><td>Other Earnings</td><td>₹${(p.arrear || 0).toLocaleString('en-IN')}</td><td class="ded-cell">TDS</td><td class="ded-cell">₹${(p.tdsDeduction || 0).toLocaleString('en-IN')}</td></tr>
          <tr><td>Incentives</td><td>₹${(p.incentive || 0).toLocaleString('en-IN')}</td><td class="ded-cell">Loan</td><td class="ded-cell">₹${(p.loanDeduction || 0).toLocaleString('en-IN')}</td></tr>
          <tr><td>Bonus</td><td>₹${(p.bonus || 0).toLocaleString('en-IN')}</td><td class="ded-cell">Security Deposit</td><td class="ded-cell">₹${(p.securityDeposit || 0).toLocaleString('en-IN')}</td></tr>
          <tr><td>Over Time Pay</td><td>₹${(p.otAmount || 0).toLocaleString('en-IN')}</td><td class="ded-cell">Other Deduction</td><td class="ded-cell">₹${(p.otherDeductions || 0).toLocaleString('en-IN')}</td></tr>
          <tr class="total-row"><td class="earn-total">Total Earnings</td><td class="earn-total">₹${totalEarnings.toLocaleString('en-IN')}</td><td class="ded-cell net-pay-label">Net Pay</td><td class="ded-cell" style="font-size:14px;font-weight:800;color:#1E3A5F;">₹${p.netSalary.toLocaleString('en-IN')}</td></tr>
        </table>
      </div>
      <div class="in-words">
        <span class="label">In Words : </span><span class="value">${numberToWords(p.netSalary)}</span>
      </div>
      <div class="signature-section">
        <div class="sig-line">Prepared By</div>
        <div class="sig-line">Received By</div>
      </div>
      <div class="footer">
        This is a computer-generated payslip by ${firmFullName}. For queries contact HR at ${firmPhone}
      </div>
    </div>
    <script>window.onload=function(){window.print();}</script>
    </body></html>`);
    printWin.document.close();
  };

  const firm = (slip?.employee?.employeeId ? getFirmFromEmployeeId(slip.employee.employeeId) : '') || slip?.employee?.department || slip?.employee?.firm || '';
  const p = slip?.payroll;
  const e = slip?.employee;
  const baseSalaryCalc = p ? (p.baseSalary != null ? p.baseSalary : Math.round((p.monthlySalary - ((p.monthlySalary / (new Date(year, month, 0).getDate())) * p.absentDays)) * 100) / 100) : 0;
  const totalEarningsCalc = p ? p.grossSalary + (p.bonus || 0) + (p.incentive || 0) + (p.arrear || 0) : 0;

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-gold" />
            Salary Slip Generator
          </h2>
          <p className="text-sm text-muted-foreground">Professional payslips with company branding</p>
        </div>
      </motion.div>

      <div className="flex flex-wrap gap-3">
        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select Employee" /></SelectTrigger>
          <SelectContent>{employees.map(emp => <SelectItem key={emp.employeeId} value={emp.employeeId}>{emp.fullName} ({emp.employeeId})</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>{[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        {slip?.payroll && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} className="gap-1.5">
              <Printer className="w-4 h-4" /> Print Payslip
            </Button>
            <Button className="gradient-laxree text-white gap-1.5" onClick={handleExportExcel}>
              <FileSpreadsheet className="w-4 h-4" /> Export Excel
            </Button>
          </div>
        )}
      </div>

      {slip?.payroll ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-2 border-blue-900/30 dark:border-blue-500/20 overflow-hidden" ref={slipRef}>
            {/* ═══ SALARY SLIP FORMAT — Blue-White Professional ═══ */}
            <div className="bg-white dark:bg-card" style={{ fontFamily: "'Merriweather', 'Georgia', 'Liberation Serif', serif" }}>
              {/* Title */}
              <div className="text-center py-2 border-b-2 border-[#1E3A5F] dark:border-blue-500">
                <h2 className="text-xl font-extrabold text-[#1E3A5F] dark:text-blue-400 tracking-wide">SALARY SLIP FORMAT</h2>
              </div>

              {/* Company Header with Logo */}
              <div className="bg-[#1E3A5F] dark:bg-blue-900 px-5 py-3 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-base">Salary Slip</h3>
                  <p className="text-blue-200 text-xs">Company Information</p>
                </div>
                <div className="w-16 h-16 bg-white rounded-lg overflow-hidden flex items-center justify-center p-1">
                  <img src={firmLogo} alt={firmCode} className="w-full h-full object-contain" />
                </div>
              </div>

              {/* Company Info Grid */}
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-5 py-3 bg-blue-50 dark:bg-blue-950/30 text-sm">
                <span className="font-semibold text-[#1E3A5F] dark:text-blue-400">Company Name :</span>
                <span>{firmFullName}</span>
                <span className="font-semibold text-[#1E3A5F] dark:text-blue-400">Company Address :</span>
                <span>{firmAddress}</span>
                <span className="font-semibold text-[#1E3A5F] dark:text-blue-400">Company Phone no :</span>
                <span>{firmPhone}</span>
                <span className="font-semibold text-[#1E3A5F] dark:text-blue-400">Company Email Address :</span>
                <span>{firmEmail}</span>
              </div>

              {/* Employee Information Header */}
              <div className="bg-[#1E3A5F] dark:bg-blue-900 px-5 py-1.5">
                <h3 className="text-white font-bold text-xs uppercase tracking-wider">Employee Information</h3>
              </div>

              {/* Employee Info Grid */}
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-5 py-3 bg-gray-50 dark:bg-muted/20 text-sm">
                <span className="font-semibold text-[#1E3A5F] dark:text-blue-400">Employee Name :</span>
                <span>{e.fullName}</span>
                <span className="font-semibold text-[#1E3A5F] dark:text-blue-400">Employee Address :</span>
                <span>{e.address || e.location || 'N/A'}</span>
                <span className="font-semibold text-[#1E3A5F] dark:text-blue-400">Employee Phone no :</span>
                <span>{e.mobile || 'N/A'}</span>
                <span className="font-semibold text-[#1E3A5F] dark:text-blue-400">Employee Email ID :</span>
                <span>{e.email || 'N/A'}</span>
              </div>

              {/* Earnings & Deductions Table */}
              <div className="px-5 py-3">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="bg-emerald-600 text-white px-3 py-2 text-left font-bold">Earnings</th>
                      <th className="bg-emerald-600 text-white px-3 py-2 text-left font-bold">Amount</th>
                      <th className="bg-red-600 text-white px-3 py-2 text-left font-bold">Deductions</th>
                      <th className="bg-red-600 text-white px-3 py-2 text-left font-bold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { earn: 'Basic', earnVal: baseSalaryCalc, ded: 'Provident Fund', dedVal: 0 },
                      { earn: 'HRA', earnVal: 0, ded: 'ESI', dedVal: 0 },
                      { earn: 'Special Allowance', earnVal: 0, ded: 'Professional Tax', dedVal: 0 },
                      { earn: 'Gross Salary', earnVal: p.grossSalary, ded: 'Salary Advance', dedVal: p.advanceDeduction || 0 },
                      { earn: 'Other Earnings', earnVal: p.arrear || 0, ded: 'TDS', dedVal: p.tdsDeduction || 0 },
                      { earn: 'Incentives', earnVal: p.incentive || 0, ded: 'Loan', dedVal: p.loanDeduction || 0 },
                      { earn: 'Bonus', earnVal: p.bonus || 0, ded: 'Security Deposit', dedVal: p.securityDeposit || 0 },
                      { earn: 'Over Time Pay', earnVal: p.otAmount || 0, ded: 'Other Deduction', dedVal: p.otherDeductions || 0 },
                    ].map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}>
                        <td className={`px-3 py-1.5 border-b border-gray-200 ${idx % 2 === 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>{row.earn}</td>
                        <td className={`px-3 py-1.5 border-b border-gray-200 text-right ${idx % 2 === 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>₹{row.earnVal.toLocaleString('en-IN')}</td>
                        <td className={`px-3 py-1.5 border-b border-gray-200 ${idx % 2 === 0 ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>{row.ded}</td>
                        <td className={`px-3 py-1.5 border-b border-gray-200 text-right ${idx % 2 === 0 ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>₹{row.dedVal.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    {/* Total Earnings / Net Pay row */}
                    <tr className="border-t-2 border-gray-800 dark:border-gray-300">
                      <td className="px-3 py-2 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40">Total Earnings</td>
                      <td className="px-3 py-2 font-bold text-emerald-700 dark:text-emerald-400 text-right bg-emerald-100 dark:bg-emerald-950/40">₹{totalEarningsCalc.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2 font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/40">Net Pay</td>
                      <td className="px-3 py-2 font-extrabold text-[#1E3A5F] dark:text-blue-400 text-right bg-red-100 dark:bg-red-950/40 text-lg">₹{p.netSalary.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Advance Details */}
              {(p.advanceDeduction > 0) && (
                <AdvanceSection employeeId={e.employeeId} month={month} year={year} advanceDeduction={p.advanceDeduction} />
              )}

              {/* In Words */}
              <div className="mx-5 mb-3 px-4 py-2 bg-blue-50 dark:bg-blue-950/30 rounded text-sm">
                <span className="font-bold text-[#1E3A5F] dark:text-blue-400">In Words : </span>
                <span className="italic text-[#1E3A5F] dark:text-blue-300">{numberToWords(p.netSalary)}</span>
              </div>

              {/* Signature Section */}
              <div className="bg-[#1E3A5F] dark:bg-blue-900 px-5 py-4 grid grid-cols-2 gap-10">
                <div className="mt-8 pt-2 border-t border-white/50 text-center text-white text-xs">Prepared By</div>
                <div className="mt-8 pt-2 border-t border-white/50 text-center text-white text-xs">Received By</div>
              </div>

              {/* Footer */}
              <div className="text-center text-[9px] text-muted-foreground py-2 border-t border-dashed">
                This is a computer-generated payslip by {firmFullName}. For queries contact HR at {firmPhone}
              </div>
            </div>
          </Card>
        </motion.div>
      ) : (
        <Card className="glass-card card-gold-hover border-0">
          <CardContent className="p-8 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Select an employee and period to generate salary slip</p>
            {employeeId && <p className="text-sm mt-2">No payroll found for this period. Generate payroll first.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
