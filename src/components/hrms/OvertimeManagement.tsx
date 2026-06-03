'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Timer, IndianRupee, CalendarDays, Building2,
  Search, Clock, Sun, PartyPopper, Plus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ── Constants ──
const FIRM_BADGE_CLASS: Record<string, string> = {
  LAPL: 'firm-badge-lapl',
  LRSL: 'firm-badge-lrsl',
  SI: 'firm-badge-si',
  SDF: 'firm-badge-sdf',
  Roofing: 'firm-badge-roofing',
};

const FIRMS = ['LAPL', 'LRSL', 'SI', 'SDF', 'Roofing'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DEPT_COLORS = ['#D4A843', '#06b6d4', '#f59e0b', '#8b5cf6', '#f43f5e'];

// ── OT Record Type ──
interface OTRecord {
  id: string;
  employeeId: string;
  date: string;
  hours: number;
  rate: number;
  amount: number;
  isHoliday: boolean;
  isSunday: boolean;
  employee?: {
    fullName: string;
    employeeId: string;
    department: string;
    location: string;
    overtimeRate: number;
  };
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

// ── Firm Badge ──
function FirmBadge({ firm }: { firm: string }) {
  return <span className={`${FIRM_BADGE_CLASS[firm] || 'firm-badge-lapl'} whitespace-nowrap shrink-0`}>{firm}</span>;
}

// ── OT Type Badge ──
function OTTypeBadge({ isSunday, isHoliday }: { isSunday: boolean; isHoliday: boolean }) {
  if (isHoliday) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 bg-purple-500/15 border-purple-500/20 text-purple-600 dark:text-purple-400">
        <PartyPopper className="w-3 h-3 mr-1" /> Holiday
      </span>
    );
  }
  if (isSunday) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 bg-blue-500/15 border-blue-500/20 text-blue-600 dark:text-blue-400">
        <Sun className="w-3 h-3 mr-1" /> Sunday
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 bg-cyan-500/15 border-cyan-500/20 text-cyan-600 dark:text-cyan-400">
      <Clock className="w-3 h-3 mr-1" /> Regular
    </span>
  );
}

export function OvertimeManagement() {
  const [records, setRecords] = useState<OTRecord[]>([]);
  const [summary, setSummary] = useState({
    totalRecords: 0, totalHours: 0, totalAmount: 0, sundayOT: 0, holidayOT: 0,
  });
  const [employees, setEmployees] = useState<{ employeeId: string; fullName: string; department: string; overtimeRate: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: '', date: '', hours: 0, rate: 0 });
  const [employeeSearch, setEmployeeSearch] = useState('');

  // ── Filters ──
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [filterFirm, setFilterFirm] = useState('all');

  // ── Load data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('month', filterMonth);
      params.set('year', filterYear);
      if (filterFirm !== 'all') params.set('department', filterFirm);

      const [otRes, empRes] = await Promise.all([
        fetch(`/api/overtime?${params}`),
        fetch('/api/employees?status=Yes'),
      ]);
      const otData = await otRes.json();
      const empData = await empRes.json();

      setRecords(otData.records || otData);
      setSummary(otData.summary || {
        totalRecords: (otData.records || otData).length,
        totalHours: (otData.records || otData).reduce((s: number, r: any) => s + r.hours, 0),
        totalAmount: (otData.records || otData).reduce((s: number, r: any) => s + r.amount, 0),
        sundayOT: (otData.records || otData).filter((r: any) => r.isSunday).reduce((s: number, r: any) => s + r.hours, 0),
        holidayOT: (otData.records || otData).filter((r: any) => r.isHoliday).reduce((s: number, r: any) => s + r.hours, 0),
      });
      setEmployees(empData.map((e: any) => ({
        employeeId: e.employeeId,
        fullName: e.fullName,
        department: e.department,
        overtimeRate: e.overtimeRate,
      })));
    } catch {
      toast.error('Failed to load overtime data');
    }
    setLoading(false);
  }, [filterMonth, filterYear, filterFirm]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Department OT Chart Data ──
  const deptChartData = useMemo(() => {
    const deptOT: Record<string, { hours: number; amount: number }> = {};
    records.forEach((r) => {
      const dept = r.employee?.department || 'Unknown';
      if (!deptOT[dept]) deptOT[dept] = { hours: 0, amount: 0 };
      deptOT[dept].hours += r.hours;
      deptOT[dept].amount += r.amount;
    });
    return Object.entries(deptOT).map(([dept, data], idx) => ({
      department: dept,
      hours: Math.round(data.hours * 10) / 10,
      amount: Math.round(data.amount),
      color: DEPT_COLORS[idx % DEPT_COLORS.length],
    }));
  }, [records]);

  // ── Summary cards ──
  const departmentsWithOT = useMemo(() => {
    const depts = new Set(records.map((r) => r.employee?.department));
    return depts.size;
  }, [records]);

  const statCards = [
    {
      title: 'Total OT Hours',
      value: summary.totalHours,
      icon: Timer,
      gradient: 'gradient-info',
      color: 'text-cyan-500',
      decimals: 1,
      suffix: 'h',
    },
    {
      title: 'Total OT Cost',
      value: summary.totalAmount,
      icon: IndianRupee,
      gradient: 'gradient-success',
      color: 'text-gold',
      prefix: '₹',
      format: 'currency',
    },
    {
      title: 'Sunday OT Hours',
      value: summary.sundayOT,
      icon: Sun,
      gradient: 'gradient-warning',
      color: 'text-amber-500',
      decimals: 1,
      suffix: 'h',
    },
    {
      title: 'Departments with OT',
      value: departmentsWithOT,
      icon: Building2,
      gradient: 'gradient-danger',
      color: 'text-rose-500',
    },
  ];

  // ── Add OT submit ──
  const handleSubmit = async () => {
    if (!form.employeeId || !form.date || !form.hours) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      const res = await fetch('/api/overtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Overtime recorded successfully');
      setOpen(false);
      setForm({ employeeId: '', date: '', hours: 0, rate: 0 });
      setEmployeeSearch('');
      loadData();
    } catch {
      toast.error('Failed to record overtime');
    }
  };

  // ── Filtered employees for the dialog ──
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch) return employees;
    const q = employeeSearch.toLowerCase();
    return employees.filter((e) =>
      e.fullName.toLowerCase().includes(q) || e.employeeId.toLowerCase().includes(q)
    );
  }, [employees, employeeSearch]);

  // ── Selected employee for auto-rate ──
  const selectedEmp = useMemo(() => {
    return employees.find((e) => e.employeeId === form.employeeId);
  }, [employees, form.employeeId]);

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
            <Timer className="w-5 h-5 text-gold" />
            Overtime Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Track overtime hours, Sunday OT &amp; holiday OT across all firms
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={filterFirm} onValueChange={setFilterFirm}>
            <SelectTrigger className="w-32 h-9">
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
          <Button
            className="gradient-laxree text-white gap-1.5"
            size="sm"
            onClick={() => setOpen(true)}
          >
            <Plus className="w-4 h-4" /> Add Overtime
          </Button>
        </div>
      </motion.div>

      {/* ── Month/Year Selector ── */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card card-gold-hover p-3"
      >
        <div className="flex gap-3 flex-wrap">
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
                        <AnimatedCounter value={card.value} prefix={card.prefix || ''} decimals={0} />
                      ) : (
                        <AnimatedCounter
                          value={card.value}
                          suffix={card.suffix || ''}
                          decimals={card.decimals || 0}
                        />
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ── Department OT Chart ── */}
      {deptChartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card card-gold-hover border-0">
            <CardContent className="p-4">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gold" />
                Department-wise OT Cost
              </p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="department"
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'OT Cost']}
                    />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]} name="OT Cost">
                      {deptChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── OT Records Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="glass-card card-gold-hover border-0">
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[55vh]" style={{ WebkitOverflowScrolling: 'touch' }}>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Employee</TableHead>
                    <TableHead className="hidden md:table-cell">Firm</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead className="hidden sm:table-cell">Rate</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 bg-muted/50 rounded animate-pulse" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <Timer className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>No overtime records found for this period.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((r, idx) => (
                      <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <motion.div
                            className="flex items-center gap-2"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.02 }}
                          >
                            <div className="w-7 h-7 rounded-full gradient-laxree flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                              {r.employee?.fullName?.charAt(0) || '?'}
                            </div>
                            <div className="min-w-0 overflow-hidden">
                              <p className="text-sm font-medium truncate">{r.employee?.fullName || r.employeeId}</p>
                              <p className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">{r.employeeId}</p>
                            </div>
                          </motion.div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <FirmBadge firm={r.employee?.department || ''} />
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </TableCell>
                        <TableCell className="text-sm font-medium whitespace-nowrap">{r.hours}h</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm font-mono whitespace-nowrap">₹{r.rate}/hr</TableCell>
                        <TableCell className="text-sm font-bold text-gold whitespace-nowrap">
                          ₹{r.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell>
                          <OTTypeBadge isSunday={r.isSunday} isHoliday={r.isHoliday} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Add OT Dialog ── */}
      <Dialog open={open} onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setForm({ employeeId: '', date: '', hours: 0, rate: 0 });
          setEmployeeSearch('');
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-gold" />
              Add Overtime
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
                          onClick={() => {
                            setForm({ ...form, employeeId: e.employeeId, rate: e.overtimeRate });
                            setEmployeeSearch('');
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                            <FirmBadge firm={e.department} />
                            <span className="truncate">{e.fullName}</span>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground whitespace-nowrap shrink-0">{e.employeeId}</span>
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
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setForm({ ...form, employeeId: '', rate: 0 })}>
                      Change
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hours *</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.hours || ''}
                  onChange={(e) => setForm({ ...form, hours: Number(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Rate (₹/hr)</Label>
                <Input
                  type="number"
                  value={form.rate || ''}
                  onChange={(e) => setForm({ ...form, rate: Number(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Calculated Amount Preview */}
            {form.hours > 0 && form.rate > 0 && (
              <div className="p-3 rounded-lg bg-gold/5 border border-gold/10 text-center">
                <p className="text-xs text-muted-foreground">OT Amount</p>
                <p className="text-lg font-bold text-gold">
                  ₹{(form.hours * form.rate).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
            )}

            <Button className="w-full gradient-laxree text-white" onClick={handleSubmit}>
              Save Overtime
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
