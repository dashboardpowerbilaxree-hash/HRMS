'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Clock, CheckCircle, XCircle, AlertTriangle, Timer,
  CalendarDays, Search, Building2, Info, MapPin,
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

// ── Firm badge class map ──
const FIRM_BADGE_CLASS: Record<string, string> = {
  LAPL: 'firm-badge-lapl',
  LRSL: 'firm-badge-lrsl',
  SI: 'firm-badge-si',
  SDF: 'firm-badge-sdf',
  Roofing: 'firm-badge-roofing',
};

const FIRMS = ['LAPL', 'LRSL', 'SI', 'SDF'];
const LOCATIONS = ['Ajmer', 'Gurgaon', 'Palra Warehouse', 'Jaipur', 'Roofing Factory'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Attendance Record Type ──
interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  totalHours: number;
  status: string;
  lateEntry: boolean;
  halfDay: boolean;
  overtimeHours: number;
  isSunday: boolean;
  isPH: boolean;
  sundayHours: number;
  phHours: number;
  employee?: {
    fullName: string;
    employeeId: string;
    department: string;
    designation: string;
    location: string;
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
  return <span>{prefix}{Math.round(display).toLocaleString()}{suffix}</span>;
}

// ── Status badge with colors ──
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    present: { bg: 'bg-emerald-500/15 border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', label: 'Present' },
    late: { bg: 'bg-yellow-500/15 border-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400', label: 'Late' },
    absent: { bg: 'bg-red-500/15 border-red-500/20', text: 'text-red-600 dark:text-red-400', label: 'Absent' },
    'half-day': { bg: 'bg-orange-500/15 border-orange-500/20', text: 'text-orange-600 dark:text-orange-400', label: 'Half-Day' },
    holiday: { bg: 'bg-purple-500/15 border-purple-500/20', text: 'text-purple-600 dark:text-purple-400', label: 'Holiday' },
    'weekly-off': { bg: 'bg-blue-500/15 border-blue-500/20', text: 'text-blue-600 dark:text-blue-400', label: 'Weekly Off' },
  };
  const s = config[status] || { bg: 'bg-muted border-border', text: 'text-muted-foreground', label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

// ── Firm badge ──
function FirmBadge({ firm }: { firm: string }) {
  return <span className={FIRM_BADGE_CLASS[firm] || 'firm-badge-lapl'}>{firm}</span>;
}

export function AttendanceTracker() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState({
    present: 0, absent: 0, late: 0, halfDay: 0, ot: 0,
  });
  const [employees, setEmployees] = useState<{ employeeId: string; fullName: string; department: string; location: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: '', date: '', checkIn: '', checkOut: '' });
  const [employeeSearch, setEmployeeSearch] = useState('');

  // ── Filters ──
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [filterFirm, setFilterFirm] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [searchEmployee, setSearchEmployee] = useState('');

  // ── Load data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('month', filterMonth);
      params.set('year', filterYear);
      if (filterFirm !== 'all') params.set('department', filterFirm);
      if (filterLocation !== 'all') params.set('location', filterLocation);

      const [attRes, empRes] = await Promise.all([
        fetch(`/api/attendance?${params}`),
        fetch('/api/employees?status=Yes'),
      ]);
      const attData = await attRes.json();
      const empData = await empRes.json();

      const recs: AttendanceRecord[] = attData.records || attData;
      setRecords(recs);
      setEmployees(empData.map((e: any) => ({
        employeeId: e.employeeId,
        fullName: e.fullName,
        department: e.department,
        location: e.location,
      })));

      const summ = attData.summary || {};
      setSummary({
        present: summ.present || recs.filter((a: any) => ['present', 'late'].includes(a.status)).length,
        absent: summ.absent || recs.filter((a: any) => a.status === 'absent').length,
        late: summ.late || recs.filter((a: any) => a.lateEntry).length,
        halfDay: summ.halfDay || recs.filter((a: any) => a.halfDay).length,
        ot: Math.round((summ.totalOvertimeHours || recs.reduce((s: number, a: any) => s + a.overtimeHours, 0)) * 10) / 10,
      });
    } catch {
      toast.error('Failed to load attendance data');
    }
    setLoading(false);
  }, [filterMonth, filterYear, filterFirm, filterLocation]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Filtered records by employee search ──
  const filteredRecords = useMemo(() => {
    if (!searchEmployee) return records;
    const q = searchEmployee.toLowerCase();
    return records.filter((r) =>
      r.employee?.fullName?.toLowerCase().includes(q) ||
      r.employeeId.toLowerCase().includes(q)
    );
  }, [records, searchEmployee]);

  // ── Mark attendance submit ──
  const handleSubmit = async () => {
    if (!form.employeeId || !form.date) {
      toast.error('Please select employee and date');
      return;
    }
    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      toast.success('Attendance recorded successfully');
      setOpen(false);
      setForm({ employeeId: '', date: '', checkIn: '', checkOut: '' });
      setEmployeeSearch('');
      loadData();
    } catch {
      toast.error('Failed to record attendance');
    }
  };

  // ── Summary cards config ──
  const statCards = [
    {
      title: 'Present Today',
      value: summary.present,
      icon: CheckCircle,
      gradient: 'gradient-success',
      color: 'text-emerald-500',
    },
    {
      title: 'Absent Today',
      value: summary.absent,
      icon: XCircle,
      gradient: 'gradient-danger',
      color: 'text-red-500',
    },
    {
      title: 'Late Today',
      value: summary.late,
      icon: AlertTriangle,
      gradient: 'gradient-warning',
      color: 'text-yellow-500',
    },
    {
      title: 'OT Hours (Monthly)',
      value: summary.ot,
      icon: Timer,
      gradient: 'gradient-info',
      color: 'text-cyan-500',
      decimals: 1,
      suffix: 'h',
    },
  ];

  // ── Filtered employees for the dialog searchable list ──
  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (employeeSearch) {
      const q = employeeSearch.toLowerCase();
      list = list.filter((e) =>
        e.fullName.toLowerCase().includes(q) || e.employeeId.toLowerCase().includes(q)
      );
    }
    return list;
  }, [employees, employeeSearch]);

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
            <Clock className="w-5 h-5 text-primary" />
            Attendance Tracker
          </h2>
          <p className="text-sm text-muted-foreground">
            Auto-calculated working hours, overtime & deductions
          </p>
        </div>
        <Button
          className="gradient-laxree text-white gap-1.5"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <Clock className="w-4 h-4" /> Mark Attendance
        </Button>
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
                    <p className="text-xs text-muted-foreground font-medium">{card.title}</p>
                    <p className="text-xl font-bold">
                      <AnimatedCounter
                        value={card.value}
                        suffix={card.suffix || ''}
                        decimals={card.decimals || 0}
                      />
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ── Filter Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-3"
      >
        <div className="flex flex-col sm:flex-row gap-3">
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
          <Select value={filterLocation} onValueChange={setFilterLocation}>
            <SelectTrigger className="w-full sm:w-40 h-9">
              <MapPin className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {LOCATIONS.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
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

      {/* ── Attendance Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="glass-card border-0">
          <CardContent className="p-0">
            <ScrollArea className="max-h-[55vh]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Employee</TableHead>
                    <TableHead className="hidden md:table-cell">Firm</TableHead>
                    <TableHead className="hidden lg:table-cell">Location</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Check-In</TableHead>
                    <TableHead className="hidden sm:table-cell">Check-Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">OT</TableHead>
                    <TableHead className="hidden lg:table-cell">Sunday</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 10 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 bg-muted/50 rounded animate-pulse" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                        No attendance records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.slice(0, 200).map((rec) => (
                      <TableRow key={rec.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full gradient-laxree flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                              {rec.employee?.fullName?.charAt(0) || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{rec.employee?.fullName || rec.employeeId}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{rec.employeeId}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <FirmBadge firm={rec.employee?.department || ''} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {rec.employee?.location || '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </TableCell>
                        <TableCell className="text-sm font-mono">{rec.checkIn || '—'}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm font-mono">{rec.checkOut || '—'}</TableCell>
                        <TableCell className="text-sm font-medium">{rec.totalHours > 0 ? `${rec.totalHours}h` : '—'}</TableCell>
                        <TableCell><StatusBadge status={rec.status} /></TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {rec.overtimeHours > 0 ? (
                            <span className="text-cyan-600 dark:text-cyan-400 font-medium">{rec.overtimeHours}h</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {rec.isSunday ? (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              {rec.sundayHours > 0 ? `${rec.sundayHours}h` : '✓'}
                            </span>
                          ) : '—'}
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

      {/* ── Mark Attendance Dialog ── */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm({ employeeId: '', date: '', checkIn: '', checkOut: '' }); setEmployeeSearch(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Mark Attendance
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
                  <ScrollArea className="max-h-40 border rounded-lg">
                    <div className="p-1">
                      {filteredEmployees.slice(0, 20).map((e) => (
                        <button
                          key={e.employeeId}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/80 text-sm flex items-center justify-between transition-colors"
                          onClick={() => { setForm({ ...form, employeeId: e.employeeId }); setEmployeeSearch(''); }}
                        >
                          <div className="flex items-center gap-2">
                            <FirmBadge firm={e.department} />
                            <span>{e.fullName}</span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">{e.employeeId}</span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {employees.find((e) => e.employeeId === form.employeeId)?.fullName}
                      </span>
                      <FirmBadge firm={employees.find((e) => e.employeeId === form.employeeId)?.department || ''} />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setForm({ ...form, employeeId: '' })}
                    >
                      Change
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Check-In Time</Label>
                <Input type="time" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} />
              </div>
              <div>
                <Label>Check-Out Time</Label>
                <Input type="time" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} />
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                System auto-calculates working hours, late entry detection, overtime, Sunday hours, and public holiday tracking.
              </p>
            </div>

            <Button className="w-full gradient-laxree text-white" onClick={handleSubmit}>
              Save Attendance
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
