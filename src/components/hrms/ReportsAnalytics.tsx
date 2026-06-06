'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  BarChart3, TrendingUp, Users, DollarSign, Clock, Building2, MapPin,
  CalendarDays, UserCheck, UserX, AlertTriangle, Timer, Activity,
  Cake, PartyPopper, Palmtree, ChevronRight, Search, X, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, RadialBarChart, RadialBar,
} from 'recharts';

const LAXREE_COLORS = {
  gold: '#D4A843',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  emerald: '#10b981',
  sky: '#0ea5e9',
  lime: '#84cc16',
  pink: '#ec4899',
};

const FIRM_COLORS: Record<string, string> = {
  LAPL: LAXREE_COLORS.gold,
  LRSL: LAXREE_COLORS.cyan,
  SI: LAXREE_COLORS.amber,
  SDF: LAXREE_COLORS.violet,
};

const FIRM_BADGE_CLASS: Record<string, string> = {
  LAPL: 'firm-badge-lapl',
  LRSL: 'firm-badge-lrsl',
  SI: 'firm-badge-si',
  SDF: 'firm-badge-sdf',
};

const STATUS_COLORS: Record<string, string> = {
  present: LAXREE_COLORS.emerald,
  absent: LAXREE_COLORS.rose,
  late: LAXREE_COLORS.amber,
  'early-out': LAXREE_COLORS.sky,
  'half-day': LAXREE_COLORS.orange || '#f97316',
  holiday: LAXREE_COLORS.violet,
  'weekly-off': LAXREE_COLORS.cyan,
};

function formatHours(decimal: number): string {
  if (!decimal || decimal === 0) return '0.00';
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  if (minutes >= 60) return `${hours + 1}.00`;
  return `${hours}.${String(minutes).padStart(2, '0')}`;
}

const FIRMS = ['LAPL', 'LRSL', 'SI', 'SDF'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Animated Counter ──
function AnimatedCounter({ value, prefix = '', suffix = '', decimals = 0 }: {
  value: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 800;
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

  if (decimals > 0) return <span>{prefix}{display.toFixed(decimals)}{suffix}</span>;
  return <span>{prefix}{Math.round(display).toLocaleString('en-IN')}{suffix}</span>;
}

export function ReportsAnalytics() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selectedFirm, setSelectedFirm] = useState('all');

  // ── Data states ──
  const [attReport, setAttReport] = useState<any>(null);
  const [payReport, setPayReport] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [eventsData, setEventsData] = useState<any>(null);

  // ── Attendance tab filters ──
  const [attEmployeeSearch, setAttEmployeeSearch] = useState('');
  const [attStatusFilter, setAttStatusFilter] = useState('all');
  const [attDate, setAttDate] = useState(() => {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

  // ── Day detail dialog ──
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [dayDetailType, setDayDetailType] = useState('');
  const [dayDetailRecords, setDayDetailRecords] = useState<any[]>([]);

  // ── Load data ──
  const loadData = useCallback(async () => {
    try {
      const [aRes, pRes, dRes, anRes, evRes] = await Promise.all([
        fetch(`/api/reports/attendance?month=${month}&year=${year}`),
        fetch(`/api/reports/payroll?month=${month}&year=${year}`),
        fetch('/api/dashboard'),
        fetch(`/api/reports/analytics?month=${month}&year=${year}`),
        fetch('/api/reports/events'),
      ]);
      setAttReport(await aRes.json());
      setPayReport(await pRes.json());
      setDashboardData(await dRes.json());
      if (anRes.ok) setAnalyticsData(await anRes.json());
      if (evRes.ok) setEventsData(await evRes.json());
    } catch (err) {
      console.error('Failed to load report data:', err);
    }
  }, [month, year]);

  useEffect(() => { loadData(); }, [loadData]);

  const FirmBadge = ({ firm }: { firm: string }) => (
    <span className={`${FIRM_BADGE_CLASS[firm] || 'firm-badge-lapl'} whitespace-nowrap shrink-0`}>{firm}</span>
  );

  // ── Filtered payroll ──
  const filteredPayrolls = selectedFirm !== 'all' && payReport?.payrolls
    ? payReport.payrolls.filter((p: any) => p.employee?.department === selectedFirm)
    : payReport?.payrolls || [];

  // ── Filtered attendance records ──
  const filteredAttRecords = useMemo(() => {
    if (!attReport?.records) return [];
    let records = attReport.records;
    if (attStatusFilter !== 'all') {
      records = records.filter((r: any) => {
        if (attStatusFilter === 'late') return r.lateEntry;
        if (attStatusFilter === 'early-out') return r.earlyOut;
        if (attStatusFilter === 'absent') return r.status === 'absent';
        if (attStatusFilter === 'present') return ['present', 'late', 'early-out'].includes(r.status);
        if (attStatusFilter === 'half-day') return r.halfDay;
        return true;
      });
    }
    if (attEmployeeSearch) {
      const q = attEmployeeSearch.toLowerCase();
      records = records.filter((r: any) =>
        r.employee?.fullName?.toLowerCase().includes(q) || r.employeeId?.toLowerCase().includes(q)
      );
    }
    return records;
  }, [attReport, attStatusFilter, attEmployeeSearch]);

  // ── Day summary click handler ──
  const handleDaySummaryClick = (type: string) => {
    if (!attReport?.records) return;
    let records: any[] = [];
    if (type === 'present') records = attReport.records.filter((r: any) => ['present', 'late', 'early-out'].includes(r.status));
    else if (type === 'absent') records = attReport.records.filter((r: any) => r.status === 'absent');
    else if (type === 'late') records = attReport.records.filter((r: any) => r.lateEntry);
    else if (type === 'early-out') records = attReport.records.filter((r: any) => r.earlyOut);
    else if (type === 'on-time') records = attReport.records.filter((r: any) => !r.lateEntry && ['present', 'early-out'].includes(r.status));

    setDayDetailType(type);
    setDayDetailRecords(records);
    setDayDetailOpen(true);
  };

  const firmPayrollData = dashboardData?.firmWiseCount?.map((f: any) => ({
    firm: f.firm,
    employees: f.count,
    payroll: dashboardData?.firmPayrollBreakdown?.[f.firm]?.totalNet || 0,
    fill: FIRM_COLORS[f.firm] || LAXREE_COLORS.gold,
  })) || [];

  // ── Gender pie data ──
  const genderPieData = analyticsData?.genderRatio ? [
    { name: 'Male', value: analyticsData.genderRatio.male || 0, fill: LAXREE_COLORS.cyan },
    { name: 'Female', value: analyticsData.genderRatio.female || 0, fill: LAXREE_COLORS.rose },
    { name: 'Other', value: analyticsData.genderRatio.other || 0, fill: LAXREE_COLORS.violet },
  ].filter(d => d.value > 0) : [];

  // ── On-time vs Late pie data ──
  const onTimePieData = analyticsData?.attendanceAnalytics ? [
    { name: 'On Time', value: parseFloat((analyticsData.attendanceAnalytics.onTimeArrivalPct || 0).toFixed(1)), fill: LAXREE_COLORS.emerald },
    { name: 'Late', value: parseFloat((analyticsData.attendanceAnalytics.lateArrivalPct || 0).toFixed(1)), fill: LAXREE_COLORS.amber },
  ] : [];

  // ── Employment type chart data ──
  const empTypeData = analyticsData?.employmentTypeBreakdown || [];

  // ── Shift distribution chart data ──
  const shiftData = analyticsData?.shiftDistribution || [];

  // ── Weekly trend data ──
  const weeklyTrendData = analyticsData?.weeklyTrend || [];

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
            <BarChart3 className="w-5 h-5 text-gold" />
            Reports & Analytics
          </h2>
          <p className="text-sm text-muted-foreground">Professional HR analytics & insights for Laxree Group</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS_SHORT.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </motion.div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="firm-wise">Firm-wise</TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════
            OVERVIEW TAB
        ════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* KPI Summary */}
          {dashboardData && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { title: 'Total Employees', value: dashboardData.totalEmployees, icon: Users, color: 'text-gold', gradient: 'gradient-laxree' },
                { title: 'Present Today', value: dashboardData.presentToday, icon: UserCheck, color: 'text-teal-500', gradient: 'gradient-success' },
                { title: 'Monthly Payroll', value: `₹${dashboardData.monthlyPayrollCost?.toLocaleString('en-IN') || 0}`, icon: DollarSign, color: 'text-violet-500', gradient: 'gradient-info' },
                { title: 'Pending Leaves', value: dashboardData.pendingLeaves, icon: TrendingUp, color: 'text-amber-500', gradient: 'gradient-warning' },
              ].map((c, i) => (
                <motion.div key={c.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="glass-card card-gold-hover border-0">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${c.gradient} flex items-center justify-center shrink-0 shadow-lg`}>
                        <c.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-xs text-muted-foreground truncate">{c.title}</p>
                        <p className="text-lg font-bold">{c.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Quick Day Summary Cards - clickable */}
          {analyticsData?.dailySummary && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="glass-card border-gold/20 border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-gold" />
                    Today&apos;s Snapshot — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {[
                      { label: 'Present', value: analyticsData.dailySummary.present, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10', type: 'present' },
                      { label: 'Absent', value: analyticsData.dailySummary.absent, icon: UserX, color: 'text-red-500', bg: 'bg-red-500/10', type: 'absent' },
                      { label: 'Late', value: analyticsData.dailySummary.late, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', type: 'late' },
                      { label: 'Early Out', value: analyticsData.dailySummary.earlyOut, icon: Clock, color: 'text-sky-500', bg: 'bg-sky-500/10', type: 'early-out' },
                      { label: 'On Time', value: analyticsData.dailySummary.onTime, icon: UserCheck, color: 'text-teal-500', bg: 'bg-teal-500/10', type: 'on-time' },
                      { label: 'Half Day', value: analyticsData.dailySummary.halfDay, icon: Timer, color: 'text-orange-500', bg: 'bg-orange-500/10', type: 'half-day' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`cursor-pointer rounded-xl p-3 ${item.bg} border border-transparent hover:border-gold/30 transition-all duration-200 hover:shadow-md`}
                        onClick={() => handleDaySummaryClick(item.type)}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                          <span className="text-[10px] font-medium text-muted-foreground">{item.label}</span>
                          <ChevronRight className="w-3 h-3 text-muted-foreground/50 ml-auto" />
                        </div>
                        <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Click any card to see employee details</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {dashboardData?.attendanceTrend && (
              <Card className="glass-card card-gold-hover border-0">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Attendance Trend (7 Days)</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dashboardData.attendanceTrend}>
                        <defs>
                          <linearGradient id="attPresentGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={LAXREE_COLORS.gold} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={LAXREE_COLORS.gold} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickFormatter={(v) => v.slice(5)} />
                        <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                        <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                        <Area type="monotone" dataKey="present" stroke={LAXREE_COLORS.gold} fill="url(#attPresentGrad)" name="Present" />
                        <Area type="monotone" dataKey="absent" stroke={LAXREE_COLORS.rose} fill="transparent" strokeDasharray="5 5" name="Absent" />
                        <Legend />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {dashboardData?.firmWiseCount && (
              <Card className="glass-card card-gold-hover border-0">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Firm Distribution</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={dashboardData.firmWiseCount} dataKey="count" nameKey="firm" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2}>
                          {dashboardData.firmWiseCount.map((entry: any, i: number) => (
                            <Cell key={i} fill={FIRM_COLORS[entry.firm] || LAXREE_COLORS.gold} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ════════════════════════════════════════════
            ATTENDANCE TAB (Enhanced with dropdowns)
        ════════════════════════════════════════════ */}
        <TabsContent value="attendance" className="mt-4">
          {attReport && (
            <div className="space-y-4">
              {/* ── Filter Row ── */}
              <Card className="glass-card border-0">
                <CardContent className="p-3">
                  <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                    {/* Employee Search */}
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        className="pl-9 h-9"
                        placeholder="Search employee..."
                        value={attEmployeeSearch}
                        onChange={(e) => setAttEmployeeSearch(e.target.value)}
                      />
                    </div>
                    {/* Month Filter */}
                    <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
                      <SelectTrigger className="w-36 h-9">
                        <CalendarDays className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS_FULL.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {/* Status Filter */}
                    <Select value={attStatusFilter} onValueChange={setAttStatusFilter}>
                      <SelectTrigger className="w-40 h-9">
                        <Activity className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="late">Late Coming</SelectItem>
                        <SelectItem value="early-out">Early Out</SelectItem>
                        <SelectItem value="half-day">Half Day</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Firm Filter */}
                    <Select value={selectedFirm} onValueChange={setSelectedFirm}>
                      <SelectTrigger className="w-32 h-9">
                        <Building2 className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="All Firms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Firms</SelectItem>
                        {FIRMS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {attStatusFilter !== 'all' && (
                      <Badge variant="outline" className="h-9 px-3 flex items-center gap-1.5 cursor-pointer" onClick={() => setAttStatusFilter('all')}>
                        {attStatusFilter === 'late' ? 'Late Coming' : attStatusFilter === 'early-out' ? 'Early Out' : attStatusFilter.charAt(0).toUpperCase() + attStatusFilter.slice(1)}
                        <X className="w-3 h-3" />
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ── Summary Cards (clickable) ── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { title: 'Present', value: attReport.summary?.present || 0, color: 'text-emerald-500', gradient: 'gradient-success', type: 'present' },
                  { title: 'Absent', value: attReport.summary?.absent || 0, color: 'text-red-500', gradient: 'gradient-danger', type: 'absent' },
                  { title: 'Late Coming', value: attReport.summary?.late || 0, color: 'text-amber-500', gradient: 'gradient-warning', type: 'late' },
                  { title: 'Early Out', value: attReport.summary?.earlyOuts || 0, color: 'text-sky-500', gradient: 'gradient-rose', type: 'early-out' },
                  { title: 'Half Day', value: attReport.summary?.halfDay || 0, color: 'text-orange-500', gradient: 'gradient-info', type: 'half-day' },
                  { title: 'OT Hours', value: (attReport.summary?.totalOvertimeHours || 0).toFixed(2), color: 'text-cyan-500', gradient: 'gradient-laxree', type: '' },
                ].map((c, i) => (
                  <motion.div
                    key={c.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`cursor-pointer ${c.type ? 'hover:shadow-lg hover:border-gold/30' : ''} transition-all duration-200`}
                    onClick={() => c.type && handleDaySummaryClick(c.type)}
                  >
                    <Card className="glass-card card-gold-hover border-0">
                      <CardContent className="p-3 text-center min-w-0">
                        <p className="text-[10px] text-muted-foreground truncate">{c.title}</p>
                        <p className={`text-xl font-bold ${c.color}`}>
                          {c.title === 'OT Hours' ? `${c.value}h` : c.value}
                        </p>
                        {c.type && <ChevronRight className="w-3 h-3 text-muted-foreground/50 mx-auto mt-0.5" />}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* ── Attendance Table ── */}
              <Card className="glass-card card-gold-hover border-0">
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[50vh]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Firm</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Check Out</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>OT</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAttRecords.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                              <p>No records found for selected filters</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAttRecords.slice(0, 100).map((r: any) => (
                            <TableRow key={r.id} className="hover:bg-muted/30">
                              <TableCell className="text-sm">
                                <div>
                                  <p className="font-medium truncate max-w-[150px]">{r.employee?.fullName || r.employeeId}</p>
                                  <p className="text-[10px] text-muted-foreground">{r.employeeId}</p>
                                </div>
                              </TableCell>
                              <TableCell><FirmBadge firm={r.employee?.department || ''} /></TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{new Date(r.date).toLocaleDateString('en-IN')}</TableCell>
                              <TableCell className="text-sm font-mono">{r.checkIn || '-'}</TableCell>
                              <TableCell className="text-sm font-mono">{r.checkOut || '-'}</TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                                  r.status === 'present' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20' :
                                  r.status === 'absent' ? 'bg-red-500/15 text-red-600 border-red-500/20' :
                                  r.status === 'late' ? 'bg-amber-500/15 text-amber-600 border-amber-500/20' :
                                  r.status === 'early-out' ? 'bg-sky-500/15 text-sky-600 border-sky-500/20' :
                                  r.status === 'half-day' ? 'bg-orange-500/15 text-orange-600 border-orange-500/20' :
                                  r.status === 'holiday' ? 'bg-purple-500/15 text-purple-600 border-purple-500/20' :
                                  'bg-muted text-muted-foreground border-border'
                                }`}>
                                  {r.status === 'late' ? 'Late Coming' : r.status === 'early-out' ? 'Early Out' : r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{formatHours(r.totalHours)}h</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{r.overtimeHours > 0 ? `${formatHours(r.overtimeHours)}h` : '-'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ════════════════════════════════════════════
            ANALYTICS TAB (Professional HR Analytics)
        ════════════════════════════════════════════ */}
        <TabsContent value="analytics" className="mt-4 space-y-4">
          {analyticsData ? (
            <>
              {/* ── Row 1: Key Metrics ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { title: 'Avg Check-In', value: analyticsData.attendanceAnalytics?.avgCheckInTime || 'N/A', icon: Clock, color: 'text-emerald-500', gradient: 'gradient-success', suffix: '' },
                  { title: 'Avg Check-Out', value: analyticsData.attendanceAnalytics?.avgCheckOutTime || 'N/A', icon: Clock, color: 'text-sky-500', gradient: 'gradient-info', suffix: '' },
                  { title: 'On-Time Arrival', value: analyticsData.attendanceAnalytics?.onTimeArrivalPct?.toFixed(1) || '0', icon: UserCheck, color: 'text-teal-500', gradient: 'gradient-success', suffix: '%' },
                  { title: 'Attendance Rate', value: analyticsData.attendanceAnalytics?.attendanceRate?.toFixed(1) || '0', icon: Activity, color: 'text-gold', gradient: 'gradient-laxree', suffix: '%' },
                ].map((c, i) => (
                  <motion.div key={c.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="glass-card card-gold-hover border-0">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${c.gradient} flex items-center justify-center shrink-0 shadow-lg`}>
                          <c.icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground font-medium">{c.title}</p>
                          <p className={`text-xl font-bold ${c.color}`}>
                            {c.value}{c.suffix}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* ── Row 2: More Metrics ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { title: 'Late Arrival %', value: (analyticsData.attendanceAnalytics?.lateArrivalPct || 0).toFixed(1), icon: AlertTriangle, color: 'text-amber-500', isNegative: true },
                  { title: 'Early Out %', value: (analyticsData.attendanceAnalytics?.earlyOutPct || 0).toFixed(1), icon: ArrowDownRight, color: 'text-sky-500', isNegative: true },
                  { title: 'Avg Work Hours', value: (analyticsData.attendanceAnalytics?.avgWorkHours || 0).toFixed(2), icon: Timer, color: 'text-cyan-500', isNegative: false },
                  { title: 'Absenteeism Rate', value: (analyticsData.attendanceAnalytics?.absenteeismRate || 0).toFixed(1), icon: UserX, color: 'text-red-500', isNegative: true },
                ].map((c, i) => (
                  <motion.div key={c.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i + 4) * 0.05 }}>
                    <Card className="glass-card card-gold-hover border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] text-muted-foreground font-medium">{c.title}</p>
                          <c.icon className={`w-4 h-4 ${c.color}`} />
                        </div>
                        <div className="flex items-end gap-1">
                          <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                          <span className="text-xs text-muted-foreground mb-0.5">%</span>
                          {c.isNegative ? (
                            <ArrowDownRight className={`w-4 h-4 ${c.color} mb-0.5`} />
                          ) : (
                            <ArrowUpRight className={`w-4 h-4 ${c.color} mb-0.5`} />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* ── Row 3: Charts ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Gender Ratio Pie */}
                <Card className="glass-card card-gold-hover border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-gold" />
                      Gender Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={genderPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={45}
                            paddingAngle={3}
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {genderPieData.map((entry: any, i: number) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-6 mt-2">
                      {genderPieData.map((d: any) => (
                        <div key={d.name} className="text-center">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                            <span className="text-xs text-muted-foreground">{d.name}</span>
                          </div>
                          <p className="text-sm font-bold">{d.value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* On-Time vs Late Pie */}
                <Card className="glass-card card-gold-hover border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-gold" />
                      On-Time vs Late Arrival
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={onTimePieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={45}
                            paddingAngle={3}
                            label={({ name, value }) => `${value}%`}
                          >
                            {onTimePieData.map((entry: any, i: number) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ── Row 4: Weekly Trend + Firm Analytics ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Weekly Attendance Trend */}
                <Card className="glass-card card-gold-hover border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gold" />
                      Weekly Attendance Trend — {MONTHS_FULL[month - 1]} {year}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyTrendData} barCategoryGap="20%">
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                          <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                          <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                          <Bar dataKey="present" fill={LAXREE_COLORS.emerald} radius={[4, 4, 0, 0]} name="Present" />
                          <Bar dataKey="absent" fill={LAXREE_COLORS.rose} radius={[4, 4, 0, 0]} name="Absent" />
                          <Bar dataKey="late" fill={LAXREE_COLORS.amber} radius={[4, 4, 0, 0]} name="Late" />
                          <Bar dataKey="earlyOut" fill={LAXREE_COLORS.sky} radius={[4, 4, 0, 0]} name="Early Out" />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Firm-wise Attendance */}
                <Card className="glass-card card-gold-hover border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gold" />
                      Firm-wise Attendance Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.firmAnalytics || []} barCategoryGap="25%">
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="firm" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                          <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                          <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} formatter={(v: number) => `${v.toFixed(1)}%`} />
                          <Bar dataKey="attendanceRate" radius={[6, 6, 0, 0]} name="Attendance Rate">
                            {(analyticsData.firmAnalytics || []).map((entry: any, i: number) => (
                              <Cell key={i} fill={FIRM_COLORS[entry.firm] || LAXREE_COLORS.gold} />
                            ))}
                          </Bar>
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ── Row 5: Employment Type + Shift Distribution ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Employment Type */}
                <Card className="glass-card card-gold-hover border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-gold" />
                      Employment Type Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={empTypeData}
                            dataKey="count"
                            nameKey="type"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            innerRadius={40}
                            paddingAngle={3}
                          >
                            {empTypeData.map((_: any, i: number) => (
                              <Cell key={i} fill={[LAXREE_COLORS.gold, LAXREE_COLORS.cyan, LAXREE_COLORS.emerald, LAXREE_COLORS.violet][i % 4]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Shift Distribution */}
                <Card className="glass-card card-gold-hover border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gold" />
                      Shift Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={shiftData} barCategoryGap="25%">
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="shift" tick={{ fontSize: 9 }} stroke="var(--muted-foreground)" />
                          <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                          <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                          <Bar dataKey="count" fill={LAXREE_COLORS.gold} radius={[6, 6, 0, 0]} name="Employees" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ── Row 6: Avg Shift Hours Radial ── */}
              <Card className="glass-card card-gold-hover border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Timer className="w-4 h-4 text-gold" />
                    Average Shift & Work Hours Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-xs text-muted-foreground mb-1">Avg Shift Hours</p>
                      <p className="text-2xl font-bold text-emerald-500">{(analyticsData.attendanceAnalytics?.avgShiftHours || 0).toFixed(2)}h</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Scheduled</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                      <p className="text-xs text-muted-foreground mb-1">Avg Work Hours</p>
                      <p className="text-2xl font-bold text-cyan-500">{(analyticsData.attendanceAnalytics?.avgWorkHours || 0).toFixed(2)}h</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Actual</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs text-muted-foreground mb-1">Avg Check-In</p>
                      <p className="text-2xl font-bold text-amber-500">{analyticsData.attendanceAnalytics?.avgCheckInTime || 'N/A'}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Arrival Time</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
                      <p className="text-xs text-muted-foreground mb-1">Avg Check-Out</p>
                      <p className="text-2xl font-bold text-sky-500">{analyticsData.attendanceAnalytics?.avgCheckOutTime || 'N/A'}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Departure Time</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="glass-card border-0">
              <CardContent className="p-12 text-center text-muted-foreground">
                <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Loading analytics data...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ════════════════════════════════════════════
            EVENTS TAB (Birthdays, Anniversaries, Holidays)
        ════════════════════════════════════════════ */}
        <TabsContent value="events" className="mt-4 space-y-4">
          {eventsData ? (
            <>
              {/* ── Upcoming Birthdays ── */}
              <Card className="glass-card card-gold-hover border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Cake className="w-4 h-4 text-pink-500" />
                    Upcoming Birthdays
                    <Badge variant="outline" className="text-[9px] h-4 ml-1">{eventsData.upcomingBirthdays?.length || 0} upcoming</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {eventsData.upcomingBirthdays?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {eventsData.upcomingBirthdays.map((b: any, i: number) => (
                        <motion.div
                          key={b.employeeId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 hover:shadow-md transition-shadow"
                        >
                          <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center shrink-0">
                            <Cake className="w-5 h-5 text-pink-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{b.fullName}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">{b.firm}</span>
                              {b.designation && <span className="text-[10px] text-muted-foreground">· {b.designation}</span>}
                            </div>
                            <p className="text-xs text-pink-500 font-medium">
                              {new Date(b.birthday).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {b.daysAway === 0 ? 'Today!' : `${b.daysAway} days away`}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">No upcoming birthdays in the next 30 days</p>
                  )}
                </CardContent>
              </Card>

              {/* ── Work Anniversaries ── */}
              <Card className="glass-card card-gold-hover border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PartyPopper className="w-4 h-4 text-amber-500" />
                    Work Anniversaries
                    <Badge variant="outline" className="text-[9px] h-4 ml-1">{eventsData.upcomingAnniversaries?.length || 0} upcoming</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {eventsData.upcomingAnniversaries?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {eventsData.upcomingAnniversaries.map((a: any, i: number) => (
                        <motion.div
                          key={a.employeeId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-gold/10 border border-amber-500/20 hover:shadow-md transition-shadow"
                        >
                          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                            <PartyPopper className="w-5 h-5 text-amber-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{a.fullName}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">{a.firm}</span>
                              {a.designation && <span className="text-[10px] text-muted-foreground">· {a.designation}</span>}
                            </div>
                            <p className="text-xs text-amber-500 font-medium">
                              {a.yearsCompleted} year{a.yearsCompleted !== 1 ? 's' : ''} · {new Date(a.anniversary).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              {a.daysAway === 0 ? ' — Today!' : ` · ${a.daysAway} days away`}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">No upcoming work anniversaries in the next 30 days</p>
                  )}
                </CardContent>
              </Card>

              {/* ── Upcoming Holidays ── */}
              <Card className="glass-card card-gold-hover border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Palmtree className="w-4 h-4 text-emerald-500" />
                    Upcoming Holidays
                    <Badge variant="outline" className="text-[9px] h-4 ml-1">{eventsData.upcomingHolidays?.length || 0} upcoming</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {eventsData.upcomingHolidays?.length > 0 ? (
                    <div className="space-y-2">
                      {eventsData.upcomingHolidays.map((h: any, i: number) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 hover:shadow-md transition-shadow"
                        >
                          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <Palmtree className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{h.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                              <Badge variant="outline" className="text-[9px] h-4">{h.type}</Badge>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-emerald-500">{h.daysAway === 0 ? 'Today!' : `${h.daysAway} days`}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">No upcoming holidays in the next 60 days</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="glass-card border-0">
              <CardContent className="p-12 text-center text-muted-foreground">
                <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Loading events data...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ════════════════════════════════════════════
            PAYROLL TAB
        ════════════════════════════════════════════ */}
        <TabsContent value="payroll" className="mt-4">
          {payReport && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Select value={selectedFirm} onValueChange={setSelectedFirm}>
                  <SelectTrigger className="w-36 h-9">
                    <Building2 className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="All Firms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Firms</SelectItem>
                    {FIRMS.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { title: 'Gross Total', value: `₹${(payReport.totals?.totalGross || 0).toLocaleString('en-IN')}`, color: 'text-cyan-500' },
                  { title: 'Deductions', value: `₹${(payReport.totals?.totalDeductions || 0).toLocaleString('en-IN')}`, color: 'text-red-500' },
                  { title: 'Net Total', value: `₹${(payReport.totals?.totalNet || 0).toLocaleString('en-IN')}`, color: 'text-gold' },
                ].map((c, i) => (
                  <Card key={c.title} className="glass-card card-gold-hover border-0">
                    <CardContent className="p-3 text-center min-w-0"><p className="text-xs text-muted-foreground truncate">{c.title}</p><p className={`text-xl font-bold ${c.color}`}>{c.value}</p></CardContent>
                  </Card>
                ))}
              </div>

              {payReport.deptBreakdown && Object.keys(payReport.deptBreakdown).length > 0 && (
                <Card className="glass-card card-gold-hover border-0">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Firm-wise Payroll Breakdown</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={Object.entries(payReport.deptBreakdown).map(([dept, data]: [string, any]) => ({ department: dept, net: data.totalNet, fill: FIRM_COLORS[dept] || LAXREE_COLORS.gold }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="department" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                          <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                          <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                          <Bar dataKey="net" radius={[4, 4, 0, 0]} name="Net Payroll">
                            {Object.entries(payReport.deptBreakdown).map(([dept], i) => (
                              <Cell key={i} fill={FIRM_COLORS[dept] || LAXREE_COLORS.gold} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="glass-card card-gold-hover border-0">
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[40vh]">
                    <Table>
                      <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Firm</TableHead><TableHead>Gross</TableHead><TableHead>Deductions</TableHead><TableHead>Net</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {filteredPayrolls.map((p: any) => (
                          <TableRow key={p.id} className="hover:bg-muted/30">
                            <TableCell className="text-sm truncate max-w-[150px]">{p.employee?.fullName || p.employeeId}</TableCell>
                            <TableCell><FirmBadge firm={p.employee?.department || ''} /></TableCell>
                            <TableCell className="text-sm whitespace-nowrap">₹{p.grossSalary.toLocaleString('en-IN')}</TableCell>
                            <TableCell className="text-sm text-red-500 whitespace-nowrap">₹{p.totalDeductions.toLocaleString('en-IN')}</TableCell>
                            <TableCell className="text-sm font-bold text-gold whitespace-nowrap">₹{p.netSalary.toLocaleString('en-IN')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ════════════════════════════════════════════
            FIRM-WISE TAB
        ════════════════════════════════════════════ */}
        <TabsContent value="firm-wise" className="mt-4 space-y-4">
          {dashboardData && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {dashboardData.firmWiseCount?.map((f: any, i: number) => (
                  <motion.div key={f.firm} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="glass-card card-gold-hover border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: FIRM_COLORS[f.firm] || LAXREE_COLORS.gold }} />
                          <FirmBadge firm={f.firm} />
                        </div>
                        <div className="text-2xl font-bold">{f.count}</div>
                        <p className="text-xs text-muted-foreground">employees</p>
                        <div className="mt-2 text-sm font-medium">
                          Payroll: ₹{(dashboardData.firmPayrollBreakdown?.[f.firm]?.totalNet || 0).toLocaleString('en-IN')}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <Card className="glass-card card-gold-hover border-0">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-gold" /> Firm-wise Employee & Payroll Distribution</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={firmPayrollData} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="firm" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                        <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                        <Bar yAxisId="left" dataKey="employees" fill={LAXREE_COLORS.gold} radius={[4, 4, 0, 0]} name="Employees" />
                        <Bar yAxisId="right" dataKey="payroll" radius={[4, 4, 0, 0]} name="Payroll (₹)">
                          {firmPayrollData.map((entry: any, i: number) => (<Cell key={i} fill={entry.fill} />))}
                        </Bar>
                        <Legend />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ════════════════════════════════════════════
          DAY DETAIL DIALOG
      ════════════════════════════════════════════ */}
      <Dialog open={dayDetailOpen} onOpenChange={setDayDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dayDetailType === 'present' && <UserCheck className="w-5 h-5 text-emerald-500" />}
              {dayDetailType === 'absent' && <UserX className="w-5 h-5 text-red-500" />}
              {dayDetailType === 'late' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
              {dayDetailType === 'early-out' && <Clock className="w-5 h-5 text-sky-500" />}
              {dayDetailType === 'on-time' && <UserCheck className="w-5 h-5 text-teal-500" />}
              {dayDetailType === 'late' ? 'Late Coming' : dayDetailType === 'early-out' ? 'Early Out' : dayDetailType === 'on-time' ? 'On Time' : dayDetailType.charAt(0).toUpperCase() + dayDetailType.slice(1)} Employees
              <Badge variant="outline" className="text-[10px] ml-1">{dayDetailRecords.length}</Badge>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {dayDetailRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No employees found</p>
            ) : (
              <div className="space-y-2">
                {dayDetailRecords.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-full gradient-laxree flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {r.employee?.fullName?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.employee?.fullName || r.employeeId}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{r.employeeId}</span>
                        {r.employee?.department && <FirmBadge firm={r.employee.department} />}
                        {r.employee?.designation && <span className="text-[10px] text-muted-foreground">· {r.employee.designation}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {r.checkIn && <p className="text-xs font-mono text-muted-foreground">In: {r.checkIn}</p>}
                      {r.checkOut && <p className="text-xs font-mono text-muted-foreground">Out: {r.checkOut}</p>}
                      {!r.checkIn && !r.checkOut && <p className="text-xs text-red-500">No record</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
