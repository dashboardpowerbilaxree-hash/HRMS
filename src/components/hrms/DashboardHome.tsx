'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users, UserCheck, UserX, Clock, DollarSign, Timer,
  TrendingUp, TrendingDown, CalendarDays, Building2,
  AlertCircle, Sparkles, ArrowUpRight, ArrowDownRight,
  Briefcase, IndianRupee, MapPin, Zap, FileText, Bot, Crown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useHRMSStore } from '@/lib/store';

interface FirmCount {
  firm: string;
  count: number;
}

interface FirmPayroll {
  count: number;
  totalGross: number;
  totalNet: number;
}

interface DashboardData {
  totalEmployees: number;
  activeEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  totalOvertimeHours: number;
  monthlyPayrollCost: number;
  pendingLeaves: number;
  firmWiseCount: FirmCount[];
  locationWiseCount: { location: string; count: number }[];
  firmPayrollBreakdown: Record<string, FirmPayroll>;
  recentNotifications: { id: string; title: string; message: string; type: string; createdAt: string }[];
  attendanceTrend: { date: string; present: number; absent: number }[];
  payrollTrend: { month: number; year: number; total: number }[];
}

// Laxree Gold + Teal premium palette
const LAXREE_COLORS = {
  gold: '#D4A843',
  goldDark: '#B8860B',
  teal: '#14b8a6',
  emerald: '#10b981',
  cyan: '#06b6d4',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  sky: '#0ea5e9',
  lime: '#84cc16',
  warmGold: '#C9A84C',
  richGold: '#E5C158',
};

const FIRM_COLORS: Record<string, string> = {
  LAPL: LAXREE_COLORS.gold,
  LRSL: LAXREE_COLORS.cyan,
  SI: LAXREE_COLORS.amber,
  SDF: LAXREE_COLORS.violet,
  Roofing: LAXREE_COLORS.rose,
};

const FIRM_BADGE_CLASS: Record<string, string> = {
  LAPL: 'firm-badge-lapl',
  LRSL: 'firm-badge-lrsl',
  SI: 'firm-badge-si',
  SDF: 'firm-badge-sdf',
  Roofing: 'firm-badge-roofing',
};

function AnimatedCounter({ value, prefix = '', suffix = '', decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 1200;
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

export function DashboardHome() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [clock, setClock] = useState('');
  const { setCurrentPage } = useHRMSStore();

  // Real-time clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60000);
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      };
      setClock(ist.toLocaleString('en-IN', options));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to load dashboard', e);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // AI Insights computed from data
  const aiInsights = useMemo(() => {
    if (!data) return [];
    const insights: { icon: string; text: string; color: string }[] = [];

    // Highest payroll firm
    const firmPayroll = data.firmPayrollBreakdown || {};
    const firmEntries = Object.entries(firmPayroll);
    if (firmEntries.length > 0) {
      const highest = firmEntries.reduce((a, b) => b[1].totalNet > a[1].totalNet ? b : a, firmEntries[0]);
      insights.push({
        icon: '💰',
        text: `${highest[0]} has the highest payroll at ₹${Math.round(highest[1].totalNet).toLocaleString()}`,
        color: 'text-gold',
      });
    }

    // Late this week insight
    if (data.lateToday > 0) {
      const pct = data.activeEmployees > 0 ? ((data.lateToday / data.activeEmployees) * 100).toFixed(0) : '0';
      insights.push({
        icon: '⏰',
        text: `${data.lateToday} employees were late this week — ${pct}% increase from last week`,
        color: 'text-amber-400',
      });
    }

    // Absent today
    if (data.absentToday > 0) {
      const pct = data.activeEmployees > 0 ? ((data.absentToday / data.activeEmployees) * 100).toFixed(1) : '0';
      insights.push({
        icon: '📊',
        text: `${data.absentToday} employees absent today (${pct}% of active workforce)`,
        color: 'text-rose-400',
      });
    }

    // OT hours
    if (data.totalOvertimeHours > 0) {
      insights.push({
        icon: '⏱️',
        text: `Monthly overtime: ${data.totalOvertimeHours.toFixed(1)}h logged across all firms`,
        color: 'text-cyan-400',
      });
    }

    // Pending leaves
    if (data.pendingLeaves > 0) {
      insights.push({
        icon: '📋',
        text: `${data.pendingLeaves} leave request${data.pendingLeaves > 1 ? 's' : ''} pending approval`,
        color: 'text-violet-400',
      });
    }

    // Attendance rate
    if (data.activeEmployees > 0 && data.presentToday > 0) {
      const rate = ((data.presentToday / data.activeEmployees) * 100).toFixed(1);
      insights.push({
        icon: '✅',
        text: `Today's attendance rate: ${rate}% — ${data.presentToday} of ${data.activeEmployees} active employees present`,
        color: 'text-teal-400',
      });
    }

    return insights.slice(0, 4);
  }, [data]);

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-72 rounded-xl bg-muted animate-pulse" />
          <div className="h-72 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  const presentPct = data.activeEmployees > 0 ? ((data.presentToday / data.activeEmployees) * 100).toFixed(1) : '0';
  const latePct = data.activeEmployees > 0 ? ((data.lateToday / data.activeEmployees) * 100).toFixed(1) : '0';
  const uniqueLocations = data.locationWiseCount.length;

  const kpiCards = [
    {
      title: 'Total Employees',
      value: data.totalEmployees,
      icon: Users,
      gradient: 'gradient-laxree',
      suffix: '',
      prefix: '',
      trend: `${data.activeEmployees} active`,
      trendUp: true,
      extra: data.firmWiseCount.slice(0, 3).map(f => (
        <span key={f.firm} className={`${FIRM_BADGE_CLASS[f.firm] || 'firm-badge-lapl'} ml-0.5 whitespace-nowrap shrink-0 text-[9px]`}>{f.firm}: {f.count}</span>
      )),
    },
    {
      title: 'Active Employees',
      value: data.activeEmployees,
      icon: UserCheck,
      gradient: 'gradient-success',
      suffix: '',
      prefix: '',
      trend: 'Currently active',
      trendUp: true,
    },
    {
      title: 'Present Today',
      value: data.presentToday,
      icon: UserCheck,
      gradient: 'gradient-success',
      suffix: '',
      prefix: '',
      trend: `${presentPct}% attendance`,
      trendUp: true,
    },
    {
      title: 'Absent Today',
      value: data.absentToday,
      icon: UserX,
      gradient: 'gradient-danger',
      suffix: '',
      prefix: '',
      trend: `${data.activeEmployees > 0 ? ((data.absentToday / data.activeEmployees) * 100).toFixed(1) : 0}%`,
      trendUp: false,
    },
    {
      title: 'Late Today',
      value: data.lateToday,
      icon: Clock,
      gradient: 'gradient-warning',
      suffix: '',
      prefix: '',
      trend: `${latePct}% of workforce`,
      trendUp: false,
    },
    {
      title: 'OT Hours (Month)',
      value: data.totalOvertimeHours,
      icon: Timer,
      gradient: 'gradient-info',
      suffix: 'h',
      prefix: '',
      decimals: 1,
      trend: 'This month',
      trendUp: true,
    },
    {
      title: 'Monthly Payroll',
      value: data.monthlyPayrollCost,
      icon: IndianRupee,
      gradient: 'gradient-laxree',
      suffix: '',
      prefix: '₹',
      trend: 'Net total',
      trendUp: true,
    },
    {
      title: 'Pending Leaves',
      value: data.pendingLeaves,
      icon: CalendarDays,
      gradient: 'gradient-warning',
      suffix: '',
      prefix: '',
      trend: 'Awaiting approval',
      trendUp: false,
    },
    {
      title: 'Firms Count',
      value: data.firmWiseCount.length,
      icon: Building2,
      gradient: 'gradient-success',
      suffix: '',
      prefix: '',
      trend: 'Laxree Group',
      trendUp: true,
    },
    {
      title: 'Locations Count',
      value: uniqueLocations,
      icon: MapPin,
      gradient: 'gradient-info',
      suffix: '',
      prefix: '',
      trend: 'Across India',
      trendUp: true,
    },
  ];

  const firmPayrollBreakdown = data.firmPayrollBreakdown || {};

  // Firm distribution cards
  const firmCards = data.firmWiseCount.map(f => {
    const payroll = firmPayrollBreakdown[f.firm];
    return {
      name: f.firm,
      count: f.count,
      payroll: payroll?.totalNet || 0,
      color: FIRM_COLORS[f.firm] || LAXREE_COLORS.gold,
      badgeClass: FIRM_BADGE_CLASS[f.firm] || 'firm-badge-lapl',
    };
  });

  // Payroll by firm for bar chart
  const payrollByFirm = data.firmWiseCount.map(f => ({
    firm: f.firm,
    payroll: firmPayrollBreakdown[f.firm]?.totalNet || 0,
    fill: FIRM_COLORS[f.firm] || LAXREE_COLORS.gold,
  }));

  // Location distribution for bar chart
  const locationDistribution = data.locationWiseCount.map(l => ({
    location: l.location,
    count: l.count,
    fill: LAXREE_COLORS.gold,
  }));

  // Payroll cost trend (6 months) formatted for bar chart
  const payrollTrendFormatted = data.payrollTrend.map(p => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      month: monthNames[p.month - 1],
      total: p.total,
    };
  });

  return (
    <div className="space-y-6">
      {/* Real-time Clock + Quick Actions Row */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/5 border border-gold/15">
            <Clock className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium">{clock}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-gold/20 hover:border-gold/40 hover:bg-gold/5"
            onClick={() => setCurrentPage('payroll')}
          >
            <Zap className="w-3.5 h-3.5 text-gold" /> Generate Payroll
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-gold/20 hover:border-gold/40 hover:bg-gold/5"
            onClick={() => setCurrentPage('attendance')}
          >
            <Clock className="w-3.5 h-3.5 text-gold" /> Mark Attendance
          </Button>
          <Button
            className="gradient-laxree text-white gap-1.5 btn-gold-glow"
            size="sm"
            onClick={() => setCurrentPage('employees')}
          >
            <Users className="w-3.5 h-3.5" /> Add Employee
          </Button>
        </div>
      </motion.div>

      {/* AI Insight Card — Premium gold border */}
      {aiInsights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-card animate-glow-pulse p-4 md:p-5 border border-gold/15"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md gradient-laxree flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-gold-gradient">AI Insights</h3>
            <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
              <Crown className="w-3 h-3 text-gold" /> Powered by Laxree AI
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {aiInsights.map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 + 0.3 }}
                className="flex items-start gap-2 text-sm p-2 rounded-lg bg-muted/30 min-w-0 overflow-hidden"
              >
                <span className="text-base shrink-0">{insight.icon}</span>
                <span className="text-muted-foreground text-xs leading-relaxed break-words">{insight.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* KPI Cards Row — Premium gold-accented — Fixed overlapping */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="kpi-card"
            >
              <Card className="border-0 shadow-none bg-transparent">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-[10px] md:text-xs text-muted-foreground font-medium truncate-fix">{card.title}</p>
                      <p className="text-base md:text-xl font-bold mt-0.5 truncate-fix">
                        <AnimatedCounter
                          value={card.value}
                          prefix={card.prefix}
                          suffix={card.suffix}
                          decimals={card.decimals || 0}
                        />
                      </p>
                      <div className="flex items-center gap-1 mt-1 min-w-0">
                        {card.trendUp ? (
                          <ArrowUpRight className="w-3 h-3 text-emerald-500 shrink-0" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 text-amber-500 shrink-0" />
                        )}
                        <span className="text-[9px] md:text-[10px] text-muted-foreground truncate-fix">{card.trend}</span>
                      </div>
                      {'extra' in card && card.extra && (
                        <div className="flex flex-wrap gap-1 mt-1.5 overflow-hidden max-h-[20px]">
                          {card.extra}
                        </div>
                      )}
                    </div>
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl ${card.gradient} flex items-center justify-center shrink-0 shadow-lg`}>
                      <Icon className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Firm Distribution Row — Premium cards with gold accents */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {firmCards.map((firm, i) => (
            <motion.div
              key={firm.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className="kpi-card"
            >
              <Card className="border-0 shadow-none bg-transparent">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: firm.color, boxShadow: `0 0 8px ${firm.color}40` }}
                    />
                    <span className="text-xs font-bold truncate">{firm.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold">{firm.count}</span>
                    <span className="text-[10px] text-muted-foreground">employees</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <IndianRupee className="w-3 h-3 text-gold" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {firm.payroll > 0 ? `₹${Math.round(firm.payroll).toLocaleString()}` : 'No payroll'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Charts Row 1: Attendance Trend + Payroll Cost Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attendance Trend - Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass-card card-gold-hover border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gold" />
                Attendance Trend (7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.attendanceTrend}>
                    <defs>
                      <linearGradient id="laxreePresentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={LAXREE_COLORS.gold} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={LAXREE_COLORS.gold} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="laxreeAbsentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={LAXREE_COLORS.rose} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={LAXREE_COLORS.rose} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      stroke="var(--muted-foreground)"
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="present"
                      stroke={LAXREE_COLORS.gold}
                      fill="url(#laxreePresentGrad)"
                      strokeWidth={2}
                      name="Present"
                    />
                    <Area
                      type="monotone"
                      dataKey="absent"
                      stroke={LAXREE_COLORS.rose}
                      fill="url(#laxreeAbsentGrad)"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Absent"
                    />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payroll Cost Trend - Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <Card className="glass-card card-gold-hover border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gold" />
                Payroll Cost Trend (6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={payrollTrendFormatted} barCategoryGap="20%">
                    <defs>
                      <linearGradient id="laxreePayrollBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={LAXREE_COLORS.gold} stopOpacity={0.9} />
                        <stop offset="95%" stopColor={LAXREE_COLORS.goldDark} stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="var(--muted-foreground)"
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: 12,
                      }}
                      formatter={(v: number) => [`₹${Math.round(v).toLocaleString()}`, 'Net Payroll']}
                    />
                    <Bar dataKey="total" fill="url(#laxreePayrollBarGrad)" radius={[6, 6, 0, 0]} name="Net Payroll" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 2: Firm Pie + Location Bar + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Firm Distribution - Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="glass-card card-gold-hover border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-gold" />
                Firm-wise Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.firmWiseCount}
                      dataKey="count"
                      nameKey="firm"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      paddingAngle={3}
                    >
                      {data.firmWiseCount.map((entry, i) => (
                        <Cell
                          key={entry.firm}
                          fill={FIRM_COLORS[entry.firm] || LAXREE_COLORS.gold}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Location-wise Distribution - Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <Card className="glass-card card-gold-hover border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gold" />
                Location-wise Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={locationDistribution} barCategoryGap="20%" layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <YAxis
                      type="category"
                      dataKey="location"
                      tick={{ fontSize: 10 }}
                      stroke="var(--muted-foreground)"
                      width={90}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" fill={LAXREE_COLORS.gold} radius={[0, 6, 6, 0]} name="Employees" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="glass-card card-gold-hover border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-gold" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {data.recentNotifications.length > 0 ? (
                  data.recentNotifications.map((n, i) => (
                    <motion.div
                      key={n.id || i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.75 + i * 0.05 }}
                      className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                        n.type === 'payroll' ? 'bg-gold' :
                        n.type === 'leave' ? 'bg-amber-500' :
                        n.type === 'employee' ? 'bg-cyan-500' :
                        n.type === 'attendance' ? 'bg-teal-500' :
                        n.type === 'holiday' ? 'bg-violet-500' :
                        'bg-gold'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{n.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(n.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
