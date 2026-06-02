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
  return ''; // fallback to existing department/firm
}

function FirmBadge({ f }: { f: string }) {
  return <span className={FIRM_BADGE_CLASS[f] || 'firm-badge-lapl'}>{f}</span>;
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
  const [employees, setEmployees] = useState<{ employeeId: string; fullName: string; department: string; firm: string; location: string; salaryType: string }[]>([]);
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

  // ── Helper: Download XLSX workbook reliably ──
  const downloadWorkbook = async (wb: any, filename: string) => {
    try {
      const XLSX = await import('xlsx-js-style');
      try {
        // Method 1: Direct writeFile (works in most browsers)
        XLSX.writeFile(wb, filename);
      } catch {
        // Method 2: Blob-based download fallback
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      }
    } catch (e2) {
      toast.error('Download failed. Please try again.');
      console.error('Excel download error:', e2);
    }
  };

  // ── Professional Excel Export (Beautiful & Colorful) ──
  const handleExportExcel = async () => {
    if (!slip?.payroll) return;
    const XLSX = await import('xlsx-js-style');
    const p = slip.payroll;
    const e = slip.employee;
    const fd = firmDetails;
    const baseSalary = p.baseSalary != null ? p.baseSalary : Math.round((p.monthlySalary - ((p.monthlySalary / (new Date(year, month, 0).getDate())) * p.absentDays)) * 100) / 100;
    const totalEarnings = p.grossSalary + (p.bonus || 0) + (p.incentive || 0) + (p.arrear || 0);
    const perDayRate = Math.round((p.monthlySalary / (new Date(year, month, 0).getDate())) * 100) / 100;

    const GOLD = 'D4A843'; const DARK = '1A1A1A'; const WHITE = 'FFFFFF';
    const EMERALD = '059669'; const RED = 'DC2626'; const LIGHT_BG = 'FFF8E7';
    const LIGHT_GREEN = 'ECFDF5'; const LIGHT_RED = 'FEF2F2';

    const hdr = { font: { bold: true, color: { rgb: GOLD }, sz: 14 }, fill: { fgColor: { rgb: DARK } }, alignment: { horizontal: 'center' as const } };
    const subhdr = (rgb: string = DARK) => ({ font: { bold: true, color: { rgb: WHITE }, sz: 11 }, fill: { fgColor: { rgb } }, alignment: { horizontal: 'center' as const } });
    const sectionTitle = { font: { bold: true, color: { rgb: GOLD }, sz: 10 }, fill: { fgColor: { rgb: '2D2D2D' } } };
    const label = { font: { sz: 10, color: { rgb: '666666' } } };
    const value = (bg?: string) => ({ font: { bold: true, sz: 10 }, fill: bg ? { fgColor: { rgb: bg } } : undefined });
    const netStyle = { font: { bold: true, color: { rgb: GOLD }, sz: 14 }, fill: { fgColor: { rgb: DARK } }, alignment: { horizontal: 'center' as const } };

    const wb = XLSX.utils.book_new();

    // ── Payslip Sheet ──
    const data: any[][] = [
      [firmFullName],
      ['SALARY SLIP'],
      [`Month: ${months[month - 1]} ${year}`, '', '', `Date: ${new Date().toLocaleDateString('en-IN')}`],
      [],
      ['Employee Details'],
      ['Employee Name', e.fullName, '', 'Employee Code', e.employeeId],
      ['Company', `${firmCode} - ${firmFullName}`, '', 'Location', e.location || 'N/A'],
      ['Designation', e.designation || 'N/A', '', 'Salary Type', (e.salaryType || 'hourly').charAt(0).toUpperCase() + (e.salaryType || 'hourly').slice(1)],
      [],
      ['Work Details'],
      ['Hourly Rate', (p.hourlyRate || 0).toFixed(2), '', 'Regular Hours', formatHours((p.totalWorkedHrs || 0) - (p.otHours || 0))],
      ['Sunday Hours', formatHours(p.sundayHrs || 0), '', 'PH Hours', formatHours(p.phHours || 0)],
      ['Total Worked Hrs', formatHours(p.totalWorkedHrs || 0), '', 'OT Hours', formatHours(p.otHours || 0)],
      ['Present Days', p.presentDays || 0, '', 'Absent Days', p.absentDays || 0],
      [],
      ['Earnings', '', '', 'Deductions', ''],
      ['Base Salary', baseSalary.toLocaleString('en-IN'), '', 'TDS', (p.tdsDeduction || 0).toLocaleString('en-IN')],
      ['OT Amount', (p.otAmount || 0).toLocaleString('en-IN'), '', 'Loan', (p.loanDeduction || 0).toLocaleString('en-IN')],
      ['Bonus', (p.bonus || 0).toLocaleString('en-IN'), '', 'Advance', (p.advanceDeduction || 0).toLocaleString('en-IN')],
      ['Incentive', (p.incentive || 0).toLocaleString('en-IN'), '', 'Security Deposit', (p.securityDeposit || 0).toLocaleString('en-IN')],
      ['Arrear', (p.arrear || 0).toLocaleString('en-IN'), '', 'Others', (p.otherDeductions || 0).toLocaleString('en-IN')],
      ['Total Earnings', totalEarnings.toLocaleString('en-IN'), '', 'Total Deductions', (p.totalDeductions || 0).toLocaleString('en-IN')],
      [],
      ['', '', '', 'NET SALARY', p.netSalary.toLocaleString('en-IN')],
      [],
      ['Formula: Base Salary = Monthly Salary − (Per Day Rate × Absent Days) | Per Day Rate = Monthly Salary ÷ Days in Month | OT = OT Hrs × Hourly Rate (1x)'],
      [`This is a computer-generated payslip by ${firmFullName}`],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Apply beautiful styling
    const cols5 = ['A','B','C','D','E'];
    // Row 1: Company name header
    cols5.forEach(c => { if (ws[`${c}1`]) ws[`${c}1`].s = hdr; });
    // Row 2: SALARY SLIP
    cols5.forEach(c => { if (ws[`${c}2`]) ws[`${c}2`].s = subhdr('2D2D2D'); });
    // Row 3: Month/Date info
    ['A','D'].forEach(c => { if (ws[`${c}3`]) ws[`${c}3`].s = { font: { italic: true, sz: 9, color: { rgb: 'CCCCCC' } }, fill: { fgColor: { rgb: '2D2D2D' } } }; });
    // Row 5: Employee Details section title
    ['A','D'].forEach(c => { if (ws[`${c}5`]) ws[`${c}5`].s = sectionTitle; });
    // Rows 6-8: Employee data
    for (const r of [6,7,8]) {
      if (ws[`A${r}`]) ws[`A${r}`].s = label;
      if (ws[`B${r}`]) ws[`B${r}`].s = value(LIGHT_BG);
      if (ws[`D${r}`]) ws[`D${r}`].s = label;
      if (ws[`E${r}`]) ws[`E${r}`].s = value(LIGHT_BG);
    }
    // Row 10: Work Details section title
    ['A','D'].forEach(c => { if (ws[`${c}10`]) ws[`${c}10`].s = sectionTitle; });
    // Rows 11-14: Work data
    for (const r of [11,12,13,14]) {
      if (ws[`A${r}`]) ws[`A${r}`].s = label;
      if (ws[`B${r}`]) ws[`B${r}`].s = value(LIGHT_BG);
      if (ws[`D${r}`]) ws[`D${r}`].s = label;
      if (ws[`E${r}`]) ws[`E${r}`].s = value(LIGHT_BG);
    }
    // Row 16: Earnings/Deductions header
    if (ws['A16']) ws['A16'].s = subhdr(EMERALD);
    if (ws['D16']) ws['D16'].s = subhdr(RED);
    if (ws['B16']) ws['B16'].s = subhdr(EMERALD);
    if (ws['E16']) ws['E16'].s = subhdr(RED);
    // Rows 17-21: Earnings/Deductions data
    for (const r of [17,18,19,20,21]) {
      const bg = (r - 17) % 2 === 0 ? LIGHT_GREEN : undefined;
      const bgR = (r - 17) % 2 === 0 ? LIGHT_RED : undefined;
      if (ws[`A${r}`]) ws[`A${r}`].s = { font: { sz: 10 } };
      if (ws[`B${r}`]) ws[`B${r}`].s = value(bg);
      if (ws[`D${r}`]) ws[`D${r}`].s = { font: { sz: 10 } };
      if (ws[`E${r}`]) ws[`E${r}`].s = value(bgR);
    }
    // Row 22: Totals
    if (ws['A22']) ws['A22'].s = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: LIGHT_GREEN } } };
    if (ws['B22']) ws['B22'].s = { font: { bold: true, sz: 11, color: { rgb: EMERALD } }, fill: { fgColor: { rgb: LIGHT_GREEN } } };
    if (ws['D22']) ws['D22'].s = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: LIGHT_RED } } };
    if (ws['E22']) ws['E22'].s = { font: { bold: true, sz: 11, color: { rgb: RED } }, fill: { fgColor: { rgb: LIGHT_RED } } };
    // Row 24: NET SALARY
    if (ws['D24']) ws['D24'].s = netStyle;
    if (ws['E24']) ws['E24'].s = { font: { bold: true, color: { rgb: GOLD }, sz: 16 }, fill: { fgColor: { rgb: DARK } }, alignment: { horizontal: 'center' as const } };
    // Rows 26-27: Footer
    cols5.forEach(c => { if (ws[`${c}26`]) ws[`${c}26`].s = { font: { italic: true, sz: 8, color: { rgb: '999999' } } }; });
    cols5.forEach(c => { if (ws[`${c}27`]) ws[`${c}27`].s = { font: { italic: true, sz: 8, color: { rgb: '999999' } } }; });

    ws['!cols'] = [
      { wch: 20 }, { wch: 25 }, { wch: 5 }, { wch: 20 }, { wch: 25 },
    ];
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
      { s: { r: 23, c: 3 }, e: { r: 23, c: 4 } },
      { s: { r: 25, c: 0 }, e: { r: 25, c: 4 } },
      { s: { r: 26, c: 0 }, e: { r: 26, c: 4 } },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Salary Slip');

    await downloadWorkbook(wb, `Payslip_${e.fullName}_${months[month - 1]}_${year}.xlsx`);
    toast.success('Payslip Excel downloaded successfully!');
  };

  // ── Print Handler (Professional format) ──
  const handlePrint = () => {
    if (!slip?.payroll || !slipRef.current) return;
    const p = slip.payroll;
    const e = slip.employee;
    const fd = firmDetails;
    const baseSalary = p.baseSalary != null ? p.baseSalary : Math.round((p.monthlySalary - ((p.monthlySalary / (new Date(year, month, 0).getDate())) * p.absentDays)) * 100) / 100;
    const totalEarnings = p.grossSalary + (p.bonus || 0) + (p.incentive || 0) + (p.arrear || 0);

    // Get the logo URL for the company
    const firmLogoUrl = FIRM_LOGOS[firmCode] || '/laxree-logo.png';
    // Build absolute URL for the logo in the print window
    const logoAbsUrl = `${window.location.origin}${firmLogoUrl}`;

    const printWin = window.open('', '_blank', 'width=800,height=1000');
    if (!printWin) return;
    printWin.document.write(`<!DOCTYPE html><html><head><title>Salary Slip - ${e.fullName}</title>
    <style>
      @page { size: A4; margin: 12mm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #222; background: #fff; }
      .payslip { max-width: 750px; margin: 0 auto; border: 2px solid #D4A843; border-radius: 8px; overflow: hidden; }
      .header { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: #D4A843; padding: 18px 24px; display: flex; align-items: center; gap: 16px; }
      .header .logo { width: 56px; height: 56px; background: #D4A843; border-radius: 10px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
      .header .logo img { width: 100%; height: 100%; object-fit: contain; border-radius: 8px; }
      .header h1 { font-size: 17px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 2px; }
      .header p { font-size: 11px; color: #aaa; }
      .divider { height: 3px; background: linear-gradient(90deg, #D4A843, #f0d78c, #D4A843); }
      .section { padding: 12px 24px; }
      .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #D4A843; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e8dcc8; }
      .emp-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 16px; }
      .emp-grid .item { font-size: 10px; padding: 3px 0; }
      .emp-grid .item .label { color: #888; font-size: 9px; display: block; }
      .emp-grid .item .value { font-weight: 600; font-size: 11px; }
      .work-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
      .work-box { background: #f8f5ef; border: 1px solid #e8dcc8; padding: 8px 10px; border-radius: 6px; text-align: center; }
      .work-box .label { font-size: 9px; color: #888; display: block; }
      .work-box .value { font-size: 14px; font-weight: 700; color: #1a1a1a; }
      .salary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
      .salary-col h3 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; padding-bottom: 4px; }
      .earnings h3 { color: #2e7d32; border-bottom: 2px solid #2e7d32; }
      .deductions h3 { color: #c62828; border-bottom: 2px solid #c62828; }
      .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 10px; border-bottom: 1px dotted #eee; }
      .row.total { font-weight: 700; border-top: 2px solid #333; border-bottom: none; padding-top: 6px; margin-top: 4px; font-size: 12px; }
      .net-bar { background: linear-gradient(135deg, #1a1a1a, #2d2d2d); padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; border-top: 3px solid #D4A843; }
      .net-bar .left { color: #aaa; font-size: 10px; }
      .net-bar .right { text-align: right; }
      .net-bar .right .label { font-size: 10px; color: #aaa; display: block; }
      .net-bar .right .value { font-size: 26px; font-weight: 800; color: #D4A843; }
      .footer { padding: 10px 24px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; }
      .signature { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; padding: 20px 24px 10px; }
      .signature .sig-line { border-top: 1px solid #999; padding-top: 4px; text-align: center; font-size: 9px; color: #888; }
    </style></head><body>
    <div class="payslip">
      <div class="header">
        <div class="logo"><img src="${logoAbsUrl}" alt="${firmCode}" /></div>
        <div>
          <h1>${firmFullName}</h1>
          <p>Salary Slip for the month of ${months[month - 1]} ${year}</p>
        </div>
      </div>
      <div class="divider"></div>
      <div class="section">
        <div class="section-title">Employee Information</div>
        <div class="emp-grid">
          <div class="item"><span class="label">Employee Name</span><span class="value">${e.fullName}</span></div>
          <div class="item"><span class="label">Employee Code</span><span class="value">${e.employeeId}</span></div>
          <div class="item"><span class="label">Company</span><span class="value">${firmCode} - ${firmFullName}</span></div>
          <div class="item"><span class="label">Location</span><span class="value">${e.location || 'N/A'}</span></div>
          <div class="item"><span class="label">Designation</span><span class="value">${e.designation || 'N/A'}</span></div>
          <div class="item"><span class="label">Salary Type</span><span class="value">${(e.salaryType || 'hourly').charAt(0).toUpperCase() + (e.salaryType || 'hourly').slice(1)}</span></div>
          ${fd ? `
          <div class="item"><span class="label">Address</span><span class="value">${fd.address || 'N/A'}</span></div>
          <div class="item"><span class="label">Phone</span><span class="value">${fd.contactPhone || 'N/A'}</span></div>
          <div class="item"><span class="label">Email</span><span class="value">${fd.contactEmail || 'N/A'}</span></div>
          ` : ''}
        </div>
      </div>
      <div class="section">
        <div class="section-title">Attendance & Work Summary</div>
        <div class="work-grid">
          <div class="work-box"><span class="label">Present Days</span><span class="value">${p.presentDays || 0}</span></div>
          <div class="work-box"><span class="label">Absent Days</span><span class="value" style="color:#c62828">${p.absentDays || 0}</span></div>
          <div class="work-box"><span class="label">Worked Hours</span><span class="value">${formatHours(p.totalWorkedHrs || 0)}h</span></div>
          <div class="work-box"><span class="label">OT Hours</span><span class="value" style="color:#00838f">${formatHours(p.otHours || 0)}h</span></div>
          <div class="work-box"><span class="label">Hourly Rate</span><span class="value">₹${(p.hourlyRate || 0).toFixed(2)}</span></div>
        </div>
      </div>
      <div class="section">
        <div class="salary-grid">
          <div class="salary-col earnings">
            <h3>Earnings</h3>
            <div class="row"><span>Base Salary</span><span>₹${baseSalary.toLocaleString('en-IN')}</span></div>
            <div class="row"><span>OT Amount (${formatHours(p.otHours || 0)}h @ ₹${(p.otRate || 0).toFixed(2)}/hr)</span><span>₹${(p.otAmount || 0).toLocaleString('en-IN')}</span></div>
            <div class="row"><span>Bonus</span><span>₹${(p.bonus || 0).toLocaleString('en-IN')}</span></div>
            <div class="row"><span>Incentive</span><span>₹${(p.incentive || 0).toLocaleString('en-IN')}</span></div>
            <div class="row"><span>Arrear</span><span>₹${(p.arrear || 0).toLocaleString('en-IN')}</span></div>
            <div class="row total"><span>Total Earnings</span><span>₹${totalEarnings.toLocaleString('en-IN')}</span></div>
          </div>
          <div class="salary-col deductions">
            <h3>Deductions</h3>
            <div class="row"><span>TDS</span><span>₹${(p.tdsDeduction || 0).toLocaleString('en-IN')}</span></div>
            <div class="row"><span>Loan</span><span>₹${(p.loanDeduction || 0).toLocaleString('en-IN')}</span></div>
            <div class="row"><span>Advance</span><span>₹${(p.advanceDeduction || 0).toLocaleString('en-IN')}</span></div>
            <div class="row"><span>Security Deposit</span><span>₹${(p.securityDeposit || 0).toLocaleString('en-IN')}</span></div>
            <div class="row"><span>Others</span><span>₹${(p.otherDeductions || 0).toLocaleString('en-IN')}</span></div>
            <div class="row total"><span>Total Deductions</span><span>₹${(p.totalDeductions || 0).toLocaleString('en-IN')}</span></div>
          </div>
        </div>
      </div>
      <div class="net-bar">
        <div class="left">Base Salary = Monthly Salary − (Per Day Rate × Absent Days) | Per Day Rate = Monthly ÷ Days in Month | OT = OT Hrs × Hourly Rate (1x)</div>
        <div class="right">
          <span class="label">NET SALARY</span>
          <span class="value">₹${p.netSalary.toLocaleString('en-IN')}</span>
        </div>
      </div>
      <div class="signature">
        <div class="sig-line">Employee Signature</div>
        <div class="sig-line">Authorized Signatory</div>
      </div>
      <div class="footer">
        This is a computer-generated payslip by ${firmFullName}. For queries contact HR at hr@laxree.com
      </div>
    </div>
    <script>window.onload=function(){window.print();}</script>
    </body></html>`);
    printWin.document.close();
  };

  const firm = (slip?.employee?.employeeId ? getFirmFromEmployeeId(slip.employee.employeeId) : '') || slip?.employee?.department || slip?.employee?.firm || '';

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
          <p className="text-sm text-muted-foreground">Auto-generated salary slips with Laxree formula calculations</p>
        </div>
      </motion.div>

      <div className="flex flex-wrap gap-3">
        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select Employee" /></SelectTrigger>
          <SelectContent>{employees.map(e => <SelectItem key={e.employeeId} value={e.employeeId}>{e.fullName} ({e.employeeId})</SelectItem>)}</SelectContent>
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass-card card-gold-hover border-0" ref={slipRef}>
            <CardHeader className="text-center pb-2">
              {/* Company Header with Firm Logo */}
              <div className="flex items-center justify-center gap-3 mb-2">
                {(() => {
                  const logoSrc = FIRM_LOGOS[firmCode];
                  return logoSrc ? (
                    <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-gold/30 bg-white p-1">
                      <Image src={logoSrc} alt={firmCode} width={48} height={48} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl gradient-laxree flex items-center justify-center overflow-hidden">
                      <Image src="/laxree-logo.png" alt="Laxree" width={40} height={40} className="rounded-lg" />
                    </div>
                  );
                })()}
                <div>
                  <CardTitle className="text-lg">{firmFullName}</CardTitle>
                  <p className="text-xs text-muted-foreground">Salary Slip - {months[month - 1]} {year}</p>
                </div>
              </div>

              {/* Company Details */}
              {firmDetails && (
                <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground flex-wrap">
                  {firmDetails.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {firmDetails.address}
                    </span>
                  )}
                  {firmDetails.contactPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {firmDetails.contactPhone}
                    </span>
                  )}
                  {firmDetails.contactEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {firmDetails.contactEmail}
                    </span>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Employee Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 text-sm">
                <div><span className="text-muted-foreground">Employee:</span> <span className="font-medium">{slip.employee.fullName}</span></div>
                <div><span className="text-muted-foreground">ID:</span> <span className="font-medium font-mono">{slip.employee.employeeId}</span></div>
                <div><span className="text-muted-foreground">Company:</span> <FirmBadge f={firm} /></div>
                <div><span className="text-muted-foreground">Location:</span> <span className="font-medium">{slip.employee.location}</span></div>
                <div><span className="text-muted-foreground">Designation:</span> <span className="font-medium">{slip.employee.designation}</span></div>
                <div><span className="text-muted-foreground">Salary Type:</span> <span className="font-medium capitalize">{slip.employee.salaryType}</span></div>
              </div>
              <Separator />

              {/* Work Summary Boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-2.5 rounded-lg bg-muted/30 text-center">
                  <p className="text-[10px] text-muted-foreground">Present Days</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{slip.payroll.presentDays || 0}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30 text-center">
                  <p className="text-[10px] text-muted-foreground">Absent Days</p>
                  <p className="text-sm font-bold text-red-500">{slip.payroll.absentDays || 0}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30 text-center">
                  <p className="text-[10px] text-muted-foreground">Hourly Rate</p>
                  <p className="text-sm font-bold">{(slip.payroll.hourlyRate || 0).toFixed(2)}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30 text-center">
                  <p className="text-[10px] text-muted-foreground">Worked Hrs</p>
                  <p className="text-sm font-bold">{formatHours(slip.payroll.totalWorkedHrs || 0)}h</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30 text-center">
                  <p className="text-[10px] text-muted-foreground">OT Hours</p>
                  <p className="text-sm font-bold text-cyan-600 dark:text-cyan-400">{formatHours(slip.payroll.otHours || 0)}h</p>
                </div>
              </div>
              <Separator />

              {/* Earnings & Deductions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-emerald-600 dark:text-emerald-400">Earnings</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Base Salary</span><span>₹{(() => { const bs = slip.payroll.baseSalary != null ? slip.payroll.baseSalary : Math.round((slip.payroll.monthlySalary - ((slip.payroll.monthlySalary / (new Date(year, month, 0).getDate())) * slip.payroll.absentDays)) * 100) / 100; return bs.toLocaleString('en-IN'); })()}</span></div>
                    <div className="flex justify-between"><span>OT Amount ({formatHours(slip.payroll.otHours || 0)}h)</span><span>₹{(slip.payroll.otAmount || 0).toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span>Bonus</span><span>₹{(slip.payroll.bonus || 0).toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span>Incentive</span><span>₹{(slip.payroll.incentive || 0).toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span>Arrear</span><span>₹{(slip.payroll.arrear || 0).toLocaleString('en-IN')}</span></div>
                    <Separator />
                    <div className="flex justify-between font-bold"><span>Total Earnings</span><span className="text-emerald-600 dark:text-emerald-400">₹{(slip.payroll.grossSalary + (slip.payroll.bonus || 0) + (slip.payroll.incentive || 0) + (slip.payroll.arrear || 0)).toLocaleString('en-IN')}</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-red-500">Deductions</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>TDS</span><span>₹{(slip.payroll.tdsDeduction || 0).toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span>Loan</span><span>₹{(slip.payroll.loanDeduction || 0).toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span>Advance</span><span>₹{(slip.payroll.advanceDeduction || 0).toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span>Security Deposit</span><span>₹{(slip.payroll.securityDeposit || 0).toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span>Others</span><span>₹{(slip.payroll.otherDeductions || 0).toLocaleString('en-IN')}</span></div>
                    <Separator />
                    <div className="flex justify-between font-bold"><span>Total Deductions</span><span className="text-red-500">₹{(slip.payroll.totalDeductions || 0).toLocaleString('en-IN')}</span></div>
                  </div>
                </div>
              </div>
              <Separator />

              {/* Net Salary - Prominent */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-gold/10 via-gold/5 to-gold/10 border border-gold/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Net Salary</p>
                    <p className="text-2xl font-bold text-gold">₹{slip.payroll.netSalary.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="text-right text-[10px] text-muted-foreground">
                    <p>Base Salary = Monthly Salary − (Per Day Rate × Absent Days) | Per Day Rate = Monthly ÷ Days in Month | OT = OT Hrs × Hourly Rate (1x)</p>
                    <p className="mt-1">{firmFullName}</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-[10px] text-muted-foreground pt-2 border-t border-dashed">
                This is a computer-generated payslip. For queries contact Laxree HR at <a href="mailto:hr@laxree.com" className="text-gold hover:underline">hr@laxree.com</a>
              </div>
            </CardContent>
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
