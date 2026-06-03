'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  IndianRupee, Zap, DollarSign, Users, Info,
  CalendarDays, Building2, Search, FileText, TrendingDown, Clock,
  Download, Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHRMSStore } from '@/lib/store';
import { toast } from 'sonner';

// ── Constants ──
const FIRM_BADGE_CLASS: Record<string, string> = {
  LAPL: 'firm-badge-lapl',
  LRSL: 'firm-badge-lrsl',
  SI: 'firm-badge-si',
  SDF: 'firm-badge-sdf',
  Roofing: 'firm-badge-roofing',
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

const FIRMS = ['LAPL', 'LRSL', 'SI', 'SDF'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Payroll Record Type ──
interface PayrollRecord {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  monthlySalary: number;
  hourlyRate: number;
  totalWorkedHrs: number;
  otHours: number;
  otRate: number;
  otAmount: number;
  sundayHrs: number;
  phHours: number;
  totalHrs: number;
  presentDays: number;
  absentDays: number;
  holidayDays: number;
  grossSalary: number;
  tdsDeduction: number;
  loanDeduction: number;
  advanceDeduction: number;
  securityDeposit: number;
  otherDeductions: number;
  totalDeductions: number;
  arrear: number;
  netSalary: number;
  status: string;
  employee?: {
    fullName: string;
    employeeId: string;
    department: string;
    designation: string;
    location: string;
    salaryType: string;
  };
  // Compat fields
  baseSalary?: number;
  perDaySalary?: number;
  daysInMonth?: number;
  basicSalary: number;
  totalWorkHours: number;
  salaryPerHour: number;
  sundayDays: number;
  phDays: number;
  sundayAmount: number;
  phAmount: number;
  bonus: number;
  incentive: number;
  pfDeduction: number;
  esiDeduction: number;
}

// ── Animated Counter ──
function AnimatedCounter({ value, prefix = '', suffix = '', decimals = 0 }: {
  value: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 1000;
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  if (decimals > 0) {
    return <span>{prefix}{display.toFixed(decimals)}{suffix}</span>;
  }
  return <span>{prefix}{Math.round(display).toLocaleString('en-IN')}{suffix}</span>;
}

// ── Status Badge ──
function PayrollStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    generated: { bg: 'bg-cyan-500/15 border-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400', label: 'Generated' },
    approved: { bg: 'bg-emerald-500/15 border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', label: 'Approved' },
    paid: { bg: 'bg-green-500/15 border-green-500/20', text: 'text-green-600 dark:text-green-400', label: 'Paid' },
  };
  const s = config[status] || { bg: 'bg-muted border-border', text: 'text-muted-foreground', label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

// ── Firm Badge ──
function FirmBadge({ firm }: { firm: string }) {
  return <span className={`${FIRM_BADGE_CLASS[firm] || 'firm-badge-lapl'} whitespace-nowrap shrink-0`}>{firm}</span>;
}

export function PayrollAutomation() {
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<{ employeeId: string; fullName: string; department: string; salaryType: string; basicSalary: number; shiftHours: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ── Advance Form ──
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    employeeId: '',
    amount: '',
    reason: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [advanceSearch, setAdvanceSearch] = useState('');
  const [advances, setAdvances] = useState<any[]>([]);
  const [addingAdvance, setAddingAdvance] = useState(false);

  // ── Form for Generate One ──
  const [form, setForm] = useState({
    employeeId: '',
    bonus: 0,
    incentive: 0,
    tdsDeduction: 0,
    loanDeduction: 0,
    advanceDeduction: 0,
    securityDeposit: 0,
    arrear: 0,
  });
  const [employeeSearch, setEmployeeSearch] = useState('');

  // ── Filters ──
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [filterFirm, setFilterFirm] = useState('all');
  const [searchEmployee, setSearchEmployee] = useState('');

  const { setCurrentPage, setSelectedEmployeeId } = useHRMSStore();

  // ── Load data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('month', filterMonth);
      params.set('year', filterYear);
      if (filterFirm !== 'all') params.set('firm', filterFirm);

      const [payRes, empRes] = await Promise.all([
        fetch(`/api/payroll?${params}`),
        fetch('/api/employees?status=Yes'),
      ]);
      setPayrolls(await payRes.json());
      const empData = await empRes.json();
      setEmployees(empData.map((e: any) => ({
        employeeId: e.employeeId,
        fullName: e.fullName,
        department: e.department,
        salaryType: e.salaryType,
        basicSalary: e.basicSalary || e.monthlySalary,
        shiftHours: e.shiftHours,
      })));
    } catch {
      toast.error('Failed to load payroll data');
    }
    setLoading(false);
  }, [filterMonth, filterYear, filterFirm]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Summary calculations ──
  const totalGross = payrolls.reduce((s, p) => s + p.grossSalary, 0);
  const totalDeductions = payrolls.reduce((s, p) => s + p.totalDeductions, 0);
  const totalNet = payrolls.reduce((s, p) => s + p.netSalary, 0);
  const totalOTHours = payrolls.reduce((s, p) => s + (p.otHours || 0), 0);
  const totalArrears = payrolls.reduce((s, p) => s + (p.arrear || 0), 0);

  // ── Filtered records ──
  const filteredRecords = useMemo(() => {
    if (!searchEmployee) return payrolls;
    const q = searchEmployee.toLowerCase();
    return payrolls.filter((p) =>
      p.employee?.fullName?.toLowerCase().includes(q) ||
      p.employeeId.toLowerCase().includes(q)
    );
  }, [payrolls, searchEmployee]);

  // ── Selected employee preview ──
  const selectedEmp = useMemo(() => {
    return employees.find((e) => e.employeeId === form.employeeId);
  }, [employees, form.employeeId]);

  // ── Salary preview calculation ──
  // Uses baseSalary (= monthlySalary − perDaySalary × absentDays) as the starting point
  // Net = baseSalary + OT + Sunday + PH + bonus + incentive + arrear − totalDeductions
  const salaryPreview = useMemo(() => {
    if (!selectedEmp) return null;
    const existing = payrolls.find((p) => p.employeeId === form.employeeId);
    if (!existing) return null;

    // Base Salary from the payroll's computed field (monthlySalary − perDay × absentDays)
    const baseSalary = existing.baseSalary != null
      ? existing.baseSalary
      : Math.round((existing.monthlySalary - ((existing.monthlySalary / (existing.daysInMonth || new Date(parseInt(filterYear), parseInt(filterMonth), 0).getDate())) * existing.absentDays)) * 100) / 100;

    // Gross includes OT, Sunday, PH on top of baseSalary
    const grossSalary = existing.grossSalary;

    // Deductions: form values are the TOTAL deductions (not additions to existing)
    // The payroll API replaces deductions with form values
    const totalDeductions = Math.round((form.tdsDeduction + form.loanDeduction + form.advanceDeduction + form.securityDeposit) * 100) / 100;

    // Net = grossSalary + bonus + incentive + arrear − totalDeductions
    const net = Math.round((grossSalary + form.bonus + form.incentive + form.arrear - totalDeductions) * 100) / 100;

    return {
      baseSalary: Math.round(baseSalary * 100) / 100,
      grossSalary: Math.round(grossSalary * 100) / 100,
      bonus: form.bonus,
      incentive: form.incentive,
      arrear: form.arrear,
      deductions: totalDeductions,
      net,
    };
  }, [selectedEmp, form, payrolls, filterMonth, filterYear]);

  // ── Generate One ──
  const handleGenerateOne = async () => {
    if (!form.employeeId) { toast.error('Please select an employee'); return; }
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: form.employeeId,
          month: parseInt(filterMonth),
          year: parseInt(filterYear),
          bonus: form.bonus || 0,
          incentive: form.incentive || 0,
          tdsDeduction: form.tdsDeduction || 0,
          loanDeduction: form.loanDeduction || 0,
          advanceDeduction: form.advanceDeduction || 0,
          securityDeposit: form.securityDeposit || 0,
          arrear: form.arrear || 0,
        }),
      });
      if (!res.ok) throw new Error('Failed to generate payroll');
      toast.success('Payroll generated successfully');
      setOpen(false);
      setForm({ employeeId: '', bonus: 0, incentive: 0, tdsDeduction: 0, loanDeduction: 0, advanceDeduction: 0, securityDeposit: 0, arrear: 0 });
      setEmployeeSearch('');
      loadData();
    } catch {
      toast.error('Failed to generate payroll');
    }
  };

  // ── Generate All ──
  const handleGenerateAll = async () => {
    setGeneratingAll(true);
    try {
      const body: any = { month: parseInt(filterMonth), year: parseInt(filterYear) };
      if (filterFirm !== 'all') body.firm = filterFirm;
      const res = await fetch('/api/payroll/generate-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      toast.success(`Payroll generated for ${data.successCount || data.generated || 0} employees`);
      loadData();
    } catch {
      toast.error('Failed to generate payroll for all employees');
    }
    setGeneratingAll(false);
  };

  // ── Filtered employees for the dialog ──
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch) return employees;
    const q = employeeSearch.toLowerCase();
    return employees.filter((e) =>
      e.fullName.toLowerCase().includes(q) || e.employeeId.toLowerCase().includes(q)
    );
  }, [employees, employeeSearch]);

  // ── Export Payroll Sheet as Excel ──
  const handleExportSheet = async () => {
    if (filteredRecords.length === 0) {
      toast.error('No payroll records to export');
      return;
    }
    setExporting(true);
    try {
      const XLSX = await import('xlsx-js-style');
      const wb = XLSX.utils.book_new();

      const BLACK = '1A1A1A';
      const WHITE = 'FFFFFF';
      const GOLD = 'D4A843';
      const BLUE = '1E3A5F';
      const EMERALD = '059669';
      const RED = 'DC2626';
      const LIGHT_BG = 'FFF8E7';
      const LIGHT_GREEN = 'ECFDF5';
      const LIGHT_RED = 'FEF2F2';

      const fullBorder = (color: string = 'B0B0B0', style: 'thin' | 'medium' = 'thin') => ({
        top: { style, color: { rgb: color } },
        bottom: { style, color: { rgb: color } },
        left: { style, color: { rgb: color } },
        right: { style, color: { rgb: color } },
      });

      // ═══ SHEET 1: Payroll Register ═══
      const headerData: any[][] = [
        ['LAXREE GROUP OF COMPANIES'],
        [`Payroll Register — ${MONTHS[parseInt(filterMonth) - 1]} ${filterYear}`],
        [`Generated: ${new Date().toLocaleString('en-IN')}`, '', '', `Total Employees: ${filteredRecords.length}`, '', '', `Total Net Payroll: ₹${totalNet.toLocaleString('en-IN')}`],
        [],
      ];
      const ws = XLSX.utils.aoa_to_sheet(headerData);

      // Style header rows
      const allCols = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'];
      allCols.forEach(c => {
        if (ws[`${c}1`]) ws[`${c}1`].s = { font: { bold: true, color: { rgb: WHITE }, sz: 16 }, fill: { fgColor: { rgb: GOLD } }, alignment: { horizontal: 'center' as const }, border: fullBorder(GOLD, 'medium') };
        if (ws[`${c}2`]) ws[`${c}2`].s = { font: { bold: true, color: { rgb: WHITE }, sz: 12 }, fill: { fgColor: { rgb: '2D2D2D' } }, alignment: { horizontal: 'center' as const } };
      });
      ['A3','B3','C3','D3','E3','F3','G3'].forEach(c => {
        if (ws[`${c}3`]) ws[`${c}3`].s = { font: { sz: 9, color: { rgb: 'CCCCCC' } }, fill: { fgColor: { rgb: '2D2D2D' } } };
      });

      // Column headers
      const colHeaders = [
        'S.No', 'Employee Name', 'Emp Code', 'Firm', 'Monthly Salary',
        'Present Days', 'Absent Days', 'Worked Hrs', 'OT Hrs', 'OT Amount',
        'Gross Salary', 'Deductions', 'Arrear', 'Net Salary', 'Status',
      ];
      XLSX.utils.sheet_add_json(ws, [colHeaders.reduce((acc, h, i) => ({ ...acc, [allCols[i]]: h }), {})], { origin: 'A5' });

      // Style column headers
      allCols.forEach(c => {
        const cell = ws[`${c}5`];
        if (cell) cell.s = { font: { bold: true, color: { rgb: WHITE }, sz: 10 }, fill: { fgColor: { rgb: BLUE } }, alignment: { horizontal: 'center' as const }, border: fullBorder(BLUE, 'medium') };
      });

      // Data rows
      const dataRows = filteredRecords.map((p, idx) => ({
        'S.No': idx + 1,
        'Employee Name': p.employee?.fullName || p.employeeId,
        'Emp Code': p.employeeId,
        'Firm': getFirmFromEmployeeId(p.employeeId) || p.employee?.department || '',
        'Monthly Salary': p.monthlySalary,
        'Present Days': p.presentDays || 0,
        'Absent Days': p.absentDays || 0,
        'Worked Hrs': formatHours(p.totalWorkedHrs || p.totalWorkHours || 0),
        'OT Hrs': formatHours(p.otHours || 0),
        'OT Amount': p.otAmount || 0,
        'Gross Salary': p.grossSalary,
        'Deductions': p.totalDeductions,
        'Arrear': p.arrear || 0,
        'Net Salary': p.netSalary,
        'Status': p.status.charAt(0).toUpperCase() + p.status.slice(1),
      }));
      XLSX.utils.sheet_add_json(ws, dataRows, { origin: 'A6' });

      // Style data rows
      for (let i = 0; i < dataRows.length; i++) {
        const row = i + 6;
        const isEven = i % 2 === 0;
        allCols.forEach(c => {
          const cell = ws[`${c}${row}`];
          if (cell) {
            const bg = isEven ? LIGHT_BG : undefined;
            cell.s = { font: { sz: 10 }, fill: bg ? { fgColor: { rgb: bg } } : undefined, border: fullBorder('D0D0D0') };
            // Highlight net salary column
            if (c === 'N') {
              cell.s = { ...cell.s, font: { bold: true, sz: 10, color: { rgb: EMERALD } }, fill: { fgColor: { rgb: LIGHT_GREEN } }, border: fullBorder(EMERALD) };
            }
            // Highlight deductions column
            if (c === 'L') {
              cell.s = { ...cell.s, font: { sz: 10, color: { rgb: RED } }, fill: { fgColor: { rgb: LIGHT_RED } }, border: fullBorder('D0D0D0') };
            }
          }
        });
      }

      // Totals row
      const totalRow = filteredRecords.length + 6;
      const totalData: any = {
        'S.No': '', 'Employee Name': 'TOTAL', 'Emp Code': '', 'Firm': '',
        'Monthly Salary': payrolls.reduce((s, p) => s + p.monthlySalary, 0),
        'Present Days': '', 'Absent Days': '', 'Worked Hrs': '', 'OT Hrs': '',
        'OT Amount': payrolls.reduce((s, p) => s + (p.otAmount || 0), 0),
        'Gross Salary': totalGross,
        'Deductions': totalDeductions,
        'Arrear': totalArrears,
        'Net Salary': totalNet,
        'Status': '',
      };
      XLSX.utils.sheet_add_json(ws, [totalData], { origin: `A${totalRow}` });
      allCols.forEach(c => {
        const cell = ws[`${c}${totalRow}`];
        if (cell) {
          cell.s = { font: { bold: true, sz: 11, color: { rgb: WHITE } }, fill: { fgColor: { rgb: BLUE } }, border: fullBorder(BLUE, 'medium') };
        }
      });

      // Column widths
      ws['!cols'] = [
        { wch: 5 }, { wch: 22 }, { wch: 14 }, { wch: 8 }, { wch: 14 },
        { wch: 10 }, { wch: 10 }, { wch: 11 }, { wch: 9 }, { wch: 12 },
        { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 10 },
      ];
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Payroll Register');

      // ═══ SHEET 2: Summary ═══
      const summaryData: any[][] = [
        ['Payroll Summary'],
        [],
        ['Category', 'Amount (₹)'],
        ['Total Gross Salary', totalGross],
        ['Total OT Amount', payrolls.reduce((s, p) => s + (p.otAmount || 0), 0)],
        ['Total Arrears', totalArrears],
        ['Total Deductions', totalDeductions],
        ['Total Net Payroll', totalNet],
        [],
        ['Metric', 'Value'],
        ['Employees Processed', filteredRecords.length],
        ['Average Net Salary', filteredRecords.length > 0 ? Math.round(totalNet / filteredRecords.length) : 0],
        ['Total OT Hours', formatHours(totalOTHours)],
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
      ['A1','B1'].forEach(c => { if (ws2[c]) ws2[c].s = { font: { bold: true, color: { rgb: WHITE }, sz: 14 }, fill: { fgColor: { rgb: GOLD } }, alignment: { horizontal: 'center' as const }, border: fullBorder(GOLD, 'medium') }; });
      ['A3','B3'].forEach(c => { if (ws2[c]) ws2[c].s = { font: { bold: true, color: { rgb: WHITE }, sz: 10 }, fill: { fgColor: { rgb: BLUE } }, border: fullBorder(BLUE) }; });
      ['A10','B10'].forEach(c => { if (ws2[c]) ws2[c].s = { font: { bold: true, color: { rgb: WHITE }, sz: 10 }, fill: { fgColor: { rgb: EMERALD } }, border: fullBorder(EMERALD) }; });
      for (const r of [4,5,6,7,8]) {
        if (ws2[`A${r}`]) ws2[`A${r}`].s = { font: { sz: 10, color: { rgb: '666666' } }, border: fullBorder('D0D0D0') };
        if (ws2[`B${r}`]) ws2[`B${r}`].s = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: LIGHT_BG } }, border: fullBorder('D0D0D0') };
      }
      for (const r of [11,12,13]) {
        if (ws2[`A${r}`]) ws2[`A${r}`].s = { font: { sz: 10, color: { rgb: '666666' } }, border: fullBorder('D0D0D0') };
        if (ws2[`B${r}`]) ws2[`B${r}`].s = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: LIGHT_GREEN } }, border: fullBorder('D0D0D0') };
      }
      ws2['!cols'] = [{ wch: 22 }, { wch: 18 }];
      ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

      // Download
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payroll_${MONTHS[parseInt(filterMonth) - 1]}_${filterYear}.xlsx`;
      a.style.display = 'none';
      document.body.appendChild(a);
      setTimeout(() => {
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 250);
      }, 50);

      toast.success('Payroll Excel downloaded successfully!');
    } catch (err) {
      console.error('Payroll export error:', err);
      toast.error('Export failed. Please try again.');
    }
    setExporting(false);
  };

  // ── Load advances ──
  const loadAdvances = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('month', filterMonth);
      params.set('year', filterYear);
      const res = await fetch(`/api/advances?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAdvances(data);
      }
    } catch {}
  }, [filterMonth, filterYear]);

  useEffect(() => { loadAdvances(); }, [loadAdvances]);

  // ── Add Advance ──
  const handleAddAdvance = async () => {
    if (!advanceForm.employeeId || !advanceForm.amount || !advanceForm.reason) {
      toast.error('Please fill employee, amount, and reason');
      return;
    }
    setAddingAdvance(true);
    try {
      const res = await fetch('/api/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: advanceForm.employeeId,
          amount: advanceForm.amount,
          reason: advanceForm.reason,
          date: advanceForm.date,
          month: parseInt(filterMonth),
          year: parseInt(filterYear),
        }),
      });
      if (!res.ok) throw new Error('Failed to add advance');
      toast.success('Advance added successfully! It will reflect in payroll.');
      setAdvanceOpen(false);
      setAdvanceForm({ employeeId: '', amount: '', reason: '', date: new Date().toISOString().split('T')[0] });
      setAdvanceSearch('');
      loadAdvances();
      loadData();
    } catch {
      toast.error('Failed to add advance');
    }
    setAddingAdvance(false);
  };

  // ── Delete Advance ──
  const handleDeleteAdvance = async (id: string) => {
    try {
      const res = await fetch(`/api/advances/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast.success('Advance deleted');
      loadAdvances();
      loadData();
    } catch {
      toast.error('Failed to delete advance');
    }
  };

  // ── Selected advance employee ──
  const selectedAdvEmp = useMemo(() => {
    return employees.find((e) => e.employeeId === advanceForm.employeeId);
  }, [employees, advanceForm.employeeId]);

  // ── Filtered employees for advance dialog ──
  const filteredAdvEmployees = useMemo(() => {
    if (!advanceSearch) return employees;
    const q = advanceSearch.toLowerCase();
    return employees.filter((e) =>
      e.fullName.toLowerCase().includes(q) || e.employeeId.toLowerCase().includes(q)
    );
  }, [employees, advanceSearch]);

  // ── Summary cards ──
  const statCards = [
    {
      title: 'Total Gross Salary',
      value: totalGross,
      icon: IndianRupee,
      gradient: 'gradient-info',
      color: 'text-cyan-500',
      prefix: '₹',
      format: 'currency',
    },
    {
      title: 'Total OT Hours',
      value: totalOTHours,
      icon: Clock,
      gradient: 'gradient-warning',
      color: 'text-cyan-500',
      isHours: true,
    },
    {
      title: 'Total Deductions',
      value: totalDeductions,
      icon: TrendingDown,
      gradient: 'gradient-danger',
      color: 'text-red-500',
      prefix: '₹',
      format: 'currency',
    },
    {
      title: 'Net Payroll',
      value: totalNet,
      icon: DollarSign,
      gradient: 'gradient-success',
      color: 'text-gold',
      prefix: '₹',
      format: 'currency',
    },
    {
      title: 'Employees Processed',
      value: payrolls.length,
      icon: Users,
      gradient: 'gradient-warning',
      color: 'text-amber-500',
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-gold" />
            Payroll Automation
          </h2>
          <p className="text-sm text-muted-foreground">
            Per Day = Monthly Salary ÷ Days in Month (31/30/28) | OT at normal hourly rate (1x)
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setOpen(true)}
          >
            <DollarSign className="w-4 h-4" /> Generate One
          </Button>
          <Button
            className="gradient-laxree text-white gap-1.5"
            size="sm"
            onClick={handleGenerateAll}
            disabled={generatingAll}
          >
            <Zap className="w-4 h-4" /> {generatingAll ? 'Generating...' : 'Generate All'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExportSheet}
            disabled={exporting || filteredRecords.length === 0}
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Exporting...' : 'Export Sheet'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
            onClick={() => setAdvanceOpen(true)}
          >
            <IndianRupee className="w-4 h-4" /> Add Advance
          </Button>
        </div>
      </motion.div>

      {/* ── Month/Year Selector + Firm Filter ── */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-3"
      >
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-full sm:w-36 h-9">
              <CalendarDays className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-full sm:w-24 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterFirm} onValueChange={setFilterFirm}>
            <SelectTrigger className="w-full sm:w-36 h-9">
              <Building2 className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Firms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Firms</SelectItem>
              {FIRMS.map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9"
              placeholder="Search employee..."
              value={searchEmployee}
              onChange={(e) => setSearchEmployee(e.target.value)}
            />
          </div>
        </div>
      </motion.div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="kpi-card"
            >
              <Card className="border-0 shadow-none bg-transparent">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${card.gradient} flex items-center justify-center shrink-0 shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium truncate">{card.title}</p>
                    <p className="text-xl font-bold">
                      {card.format === 'currency' ? (
                        <AnimatedCounter value={card.value} prefix="₹" decimals={0} />
                      ) : card.isHours ? (
                        <span>{formatHours(card.value)}h</span>
                      ) : (
                        <AnimatedCounter value={card.value} suffix={'suffix' in card ? (card as any).suffix : ''} decimals={'decimals' in card ? (card as any).decimals : 0} />
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ── Salary Breakdown Info Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
            <Info className="w-4.5 h-4.5 text-gold" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">Laxree Payroll Formula</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] h-4 px-1.5">Rate</Badge>
                <span>Per Day Rate = Monthly Salary ÷ Days in Month (31, 30, or 28)</span>
              </p>
              <p className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] h-4 px-1.5">Hourly</Badge>
                <span>Hourly Rate = Per Day Rate ÷ Shift Hours</span>
              </p>
              <p className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] h-4 px-1.5">Base</Badge>
                <span>Base Salary = Monthly Salary − (Per Day Rate × Absent Days)</span>
              </p>
              <p className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] h-4 px-1.5">OT</Badge>
                <span>OT Amount = OT Hours × Hourly Rate (1x normal rate, NOT 1.5x)</span>
              </p>
              <p className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] h-4 px-1.5">Gross</Badge>
                <span>Gross = Base Salary + OT Amount</span>
              </p>
              <p className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] h-4 px-1.5">Net</Badge>
                <span>Net = Gross + Bonus + Incentive + Arrear − Total Deductions</span>
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Full attendance = Full monthly salary + OT &nbsp;|&nbsp; Sundays are paid automatically
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Payroll Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="glass-card card-gold-hover border-0">
          <CardContent className="p-0">
            <ScrollArea className="max-h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Employee</TableHead>
                    <TableHead className="hidden md:table-cell">Firm</TableHead>
                    <TableHead className="hidden lg:table-cell">Worked Hrs</TableHead>
                    <TableHead className="hidden xl:table-cell">Hourly Rate</TableHead>
                    <TableHead className="hidden lg:table-cell">OT Hrs</TableHead>
                    <TableHead className="hidden sm:table-cell">OT Amount</TableHead>
                    <TableHead className="hidden lg:table-cell">Sunday Hrs</TableHead>
                    <TableHead className="hidden lg:table-cell">PH Hrs</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead className="hidden md:table-cell">Deductions</TableHead>
                    <TableHead className="hidden xl:table-cell">Arrear</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 13 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 bg-muted/50 rounded animate-pulse" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>No payroll records for this period.</p>
                        <p className="text-xs mt-1">Click &quot;Generate All&quot; to create payroll records.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((p, idx) => (
                      <TableRow
                        key={p.id}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedEmployeeId(p.employeeId);
                          setCurrentPage('salary-slip');
                        }}
                      >
                        <TableCell>
                          <motion.div
                            className="flex items-center gap-2"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.02 }}
                          >
                            <div className="w-7 h-7 rounded-full gradient-laxree flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                              {p.employee?.fullName?.charAt(0) || '?'}
                            </div>
                            <div className="min-w-0 overflow-hidden">
                              <p className="text-sm font-medium truncate">{p.employee?.fullName || p.employeeId}</p>
                              <p className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">{p.employeeId}</p>
                            </div>
                          </motion.div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <FirmBadge firm={getFirmFromEmployeeId(p.employeeId) || p.employee?.department || ''} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm whitespace-nowrap">
                          {(p.totalWorkedHrs || p.totalWorkHours || 0) > 0 ? `${formatHours(p.totalWorkedHrs || p.totalWorkHours || 0)}h` : '—'}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm font-mono whitespace-nowrap">
                          {(p.hourlyRate || p.salaryPerHour || 0) > 0 ? `₹${(p.hourlyRate || p.salaryPerHour).toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm whitespace-nowrap">
                          {(p.otHours || 0) > 0 ? (
                            <span className="text-cyan-600 dark:text-cyan-400 font-medium">{formatHours(p.otHours)}h</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm whitespace-nowrap">
                          {(p.otAmount || 0) > 0 ? (
                            <span className="text-cyan-600 dark:text-cyan-400">₹{p.otAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm whitespace-nowrap">
                          {(p.sundayHrs || 0) > 0 ? (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">{formatHours(p.sundayHrs)}h</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm whitespace-nowrap">
                          {(p.phHours || 0) > 0 ? (
                            <span className="text-purple-600 dark:text-purple-400 font-medium">{formatHours(p.phHours)}h</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          ₹{p.grossSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-red-500 whitespace-nowrap">
                          ₹{p.totalDeductions.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm whitespace-nowrap">
                          {(p.arrear || 0) > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400">₹{p.arrear.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-sm font-bold text-gold whitespace-nowrap">
                          ₹{p.netSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell>
                          <PayrollStatusBadge status={p.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Generate One Dialog ── */}
      <Dialog open={open} onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setForm({ employeeId: '', bonus: 0, incentive: 0, tdsDeduction: 0, loanDeduction: 0, advanceDeduction: 0, securityDeposit: 0, arrear: 0 });
          setEmployeeSearch('');
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gold" />
              Generate Payroll
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Employee Search */}
            <div>
              <Label>Employee *</Label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search employee..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                  />
                </div>
                {!form.employeeId ? (
                  <div className="max-h-40 border rounded-lg overflow-y-auto">
                    <div className="p-1">
                      {filteredEmployees.slice(0, 20).map((e) => (
                        <button
                          key={e.employeeId}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/80 text-sm flex items-center justify-between transition-colors gap-2"
                          onClick={() => { setForm({ ...form, employeeId: e.employeeId }); setEmployeeSearch(''); }}
                        >
                          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                            <FirmBadge firm={e.department} />
                            <span className="truncate">{e.fullName}</span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono whitespace-nowrap shrink-0">{e.employeeId}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                      <FirmBadge firm={selectedEmp?.department || ''} />
                      <span className="text-sm font-medium truncate">{selectedEmp?.fullName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{form.employeeId}</span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setForm({ ...form, employeeId: '' })}>
                        Change
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Salary info for selected employee */}
            {selectedEmp && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gold/5 border border-gold/10 text-xs">
                <Info className="w-3.5 h-3.5 text-gold shrink-0" />
                <span>
                  <strong>{selectedEmp.salaryType}</strong> worker &middot; Monthly: ₹{selectedEmp.basicSalary.toLocaleString('en-IN')}
                  {selectedEmp.salaryType === 'Hourly' && ` · Shift: ${formatHours(selectedEmp.shiftHours)}h`}
                </span>
              </div>
            )}

            {/* Earnings & Deductions */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Bonus (₹)</Label>
                <Input
                  type="number"
                  value={form.bonus || ''}
                  onChange={(e) => setForm({ ...form, bonus: Number(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs">Incentive (₹)</Label>
                <Input
                  type="number"
                  value={form.incentive || ''}
                  onChange={(e) => setForm({ ...form, incentive: Number(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs">Arrear (₹)</Label>
                <Input
                  type="number"
                  value={form.arrear || ''}
                  onChange={(e) => setForm({ ...form, arrear: Number(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs">TDS (₹)</Label>
                <Input
                  type="number"
                  value={form.tdsDeduction || ''}
                  onChange={(e) => setForm({ ...form, tdsDeduction: Number(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs">Loan (₹)</Label>
                <Input
                  type="number"
                  value={form.loanDeduction || ''}
                  onChange={(e) => setForm({ ...form, loanDeduction: Number(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs">Advance (₹)</Label>
                <Input
                  type="number"
                  value={form.advanceDeduction || ''}
                  onChange={(e) => setForm({ ...form, advanceDeduction: Number(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs">Security Deposit (₹)</Label>
                <Input
                  type="number"
                  value={form.securityDeposit || ''}
                  onChange={(e) => setForm({ ...form, securityDeposit: Number(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Salary Preview */}
            {salaryPreview && (
              <div className="p-3 rounded-lg bg-muted/50 border space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">Calculated Salary Preview</p>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Base Salary</p>
                    <p className="text-sm font-bold text-cyan-600 dark:text-cyan-400">₹{salaryPreview.baseSalary.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Gross</p>
                    <p className="text-sm font-bold text-cyan-600 dark:text-cyan-400">₹{salaryPreview.grossSalary.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Bonus</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{salaryPreview.bonus.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Incentive</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{salaryPreview.incentive.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Arrear</p>
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">₹{salaryPreview.arrear.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Deductions</p>
                    <p className="text-sm font-bold text-red-500">₹{salaryPreview.deductions.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Net Salary</p>
                    <p className="text-sm font-bold text-gold">₹{salaryPreview.net.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground text-center">Base = Monthly − (PerDay × Absent) | PerDay = Monthly ÷ Days in Month | OT = OT Hrs × Hourly Rate (1x) | Net = Gross + Bonus + Incentive + Arrear − Deductions</p>
              </div>
            )}

            <Button className="w-full gradient-laxree text-white" onClick={handleGenerateOne}>
              Generate Payroll
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Advance Dialog ── */}
      <Dialog open={advanceOpen} onOpenChange={(v) => {
        setAdvanceOpen(v);
        if (!v) {
          setAdvanceForm({ employeeId: '', amount: '', reason: '', date: new Date().toISOString().split('T')[0] });
          setAdvanceSearch('');
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-amber-500" />
              Add Advance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Employee Search */}
            <div>
              <Label>Select Employee *</Label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search employee..."
                    value={advanceSearch}
                    onChange={(e) => setAdvanceSearch(e.target.value)}
                  />
                </div>
                {!advanceForm.employeeId ? (
                  <div className="max-h-40 border rounded-lg overflow-y-auto">
                    <div className="p-1">
                      {filteredAdvEmployees.slice(0, 20).map((e) => (
                        <button
                          key={e.employeeId}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/80 text-sm flex items-center justify-between transition-colors gap-2"
                          onClick={() => { setAdvanceForm({ ...advanceForm, employeeId: e.employeeId }); setAdvanceSearch(''); }}
                        >
                          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                            <FirmBadge firm={e.department} />
                            <span className="truncate">{e.fullName}</span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono whitespace-nowrap shrink-0">{e.employeeId}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                      <FirmBadge firm={selectedAdvEmp?.department || ''} />
                      <span className="text-sm font-medium truncate">{selectedAdvEmp?.fullName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{advanceForm.employeeId}</span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setAdvanceForm({ ...advanceForm, employeeId: '' })}>
                        Change
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Amount */}
            <div>
              <Label>Advance Amount (₹) *</Label>
              <Input
                type="number"
                value={advanceForm.amount}
                onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                placeholder="Enter amount"
              />
            </div>

            {/* Reason */}
            <div>
              <Label>Reason *</Label>
              <Input
                value={advanceForm.reason}
                onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                placeholder="Reason for advance"
              />
            </div>

            {/* Date */}
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={advanceForm.date}
                onChange={(e) => setAdvanceForm({ ...advanceForm, date: e.target.value })}
              />
            </div>

            <Button
              className="w-full gradient-laxree text-white"
              onClick={handleAddAdvance}
              disabled={addingAdvance}
            >
              {addingAdvance ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {addingAdvance ? 'Adding...' : 'Add Advance'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Advances List ── */}
      {advances.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-card border-0">
            <CardContent className="p-0">
              <div className="px-4 py-3 border-b border-amber-500/10 bg-amber-500/5">
                <h3 className="text-sm font-bold flex items-center gap-2 text-amber-600">
                  <IndianRupee className="w-4 h-4" />
                  Advances Taken — {MONTHS[parseInt(filterMonth) - 1]} {filterYear}
                </h3>
              </div>
              <ScrollArea className="max-h-[30vh]">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Employee</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {advances.map((adv: any) => (
                      <TableRow key={adv.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full gradient-laxree flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                              {adv.employee?.fullName?.charAt(0) || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{adv.employee?.fullName || adv.employeeId}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{adv.employeeId}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-bold text-amber-600 whitespace-nowrap">
                          ₹{Number(adv.amount).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {adv.reason}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(adv.date).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10"
                            onClick={() => handleDeleteAdvance(adv.id)}
                          >
                            ×
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
