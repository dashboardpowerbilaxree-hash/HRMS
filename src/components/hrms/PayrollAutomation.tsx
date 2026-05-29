'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  IndianRupee, Zap, DollarSign, Users, Info,
  CalendarDays, Building2, Search, FileText, TrendingDown,
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
      if (filterFirm !== 'all') params.set('department', filterFirm);

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
  const salaryPreview = useMemo(() => {
    if (!selectedEmp) return null;
    const existing = payrolls.find((p) => p.employeeId === form.employeeId);
    if (!existing) return null;

    const gross = existing.grossSalary + form.bonus + form.incentive;
    const deductions = existing.totalDeductions + form.tdsDeduction + form.loanDeduction + form.advanceDeduction + form.securityDeposit;
    const net = gross + form.arrear - deductions;

    return { gross: Math.round(gross * 100) / 100, deductions: Math.round(deductions * 100) / 100, net: Math.round(net * 100) / 100, arrear: form.arrear };
  }, [selectedEmp, form, payrolls]);

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
      if (filterFirm !== 'all') body.department = filterFirm;
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
            Laxree Formula: Net = (Worked Hrs × Hourly Rate) + OT Amount + Arrear − Deductions
          </p>
        </div>
        <div className="flex gap-2">
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
                      ) : (
                        <AnimatedCounter value={card.value} />
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
                <Badge variant="outline" className="text-[9px] h-4 px-1.5">Hourly</Badge>
                <span>Gross = Total Worked Hrs × Hourly Rate + OT Amount</span>
              </p>
              <p className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] h-4 px-1.5">Net</Badge>
                <span>Net = Gross + Arrear − Total Deductions</span>
              </p>
              <p className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] h-4 px-1.5">Daily</Badge>
                <span>Net = (Daily Rate × Days Present) + Sunday Amt + PH Amt − Deductions</span>
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Salary/Hour = Monthly Salary ÷ (Shift Hours × Days in Month) &nbsp;|&nbsp; OT Rate = Hourly Rate × 1.5 &nbsp;|&nbsp; Deductions = TDS + Loan + Advance + Security Deposit
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
                          <FirmBadge firm={p.employee?.department || ''} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm whitespace-nowrap">
                          {(p.totalWorkedHrs || p.totalWorkHours || 0) > 0 ? `${(p.totalWorkedHrs || p.totalWorkHours).toFixed(1)}h` : '—'}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm font-mono whitespace-nowrap">
                          {(p.hourlyRate || p.salaryPerHour || 0) > 0 ? `₹${(p.hourlyRate || p.salaryPerHour).toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm whitespace-nowrap">
                          {(p.otHours || 0) > 0 ? (
                            <span className="text-cyan-600 dark:text-cyan-400 font-medium">{p.otHours}h</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm whitespace-nowrap">
                          {(p.otAmount || 0) > 0 ? (
                            <span className="text-cyan-600 dark:text-cyan-400">₹{p.otAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm whitespace-nowrap">
                          {(p.sundayHrs || 0) > 0 ? (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">{p.sundayHrs}h</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm whitespace-nowrap">
                          {(p.phHours || 0) > 0 ? (
                            <span className="text-purple-600 dark:text-purple-400 font-medium">{p.phHours}h</span>
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
                  {selectedEmp.salaryType === 'Hourly' && ` · Shift: ${selectedEmp.shiftHours}h`}
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
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Gross</p>
                    <p className="text-sm font-bold text-cyan-600 dark:text-cyan-400">₹{salaryPreview.gross.toLocaleString('en-IN')}</p>
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
              </div>
            )}

            <Button className="w-full gradient-laxree text-white" onClick={handleGenerateOne}>
              Generate Payroll
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
