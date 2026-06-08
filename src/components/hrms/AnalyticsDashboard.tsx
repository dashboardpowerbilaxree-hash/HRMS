'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Trophy, Clock, AlertTriangle, Zap, Calendar,
  Users, Target, ArrowUpRight, ArrowDownRight, Minus,
  BarChart3, Award, Timer, UserX
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHRMSStore } from '@/lib/store';
import { toast } from 'sonner';

// ── Color System ──
const COLORS = {
  gold: '#D4A849',
  teal: '#14B8A6',
  cyan: '#06B6D4',
  amber: '#F59E0B',
  rose: '#F43F5E',
  violet: '#8B5CF6',
  emerald: '#10B981',
  sky: '#0EA5E9',
  lime: '#84CC16',
  pink: '#EC4899',
};

const FIRM_COLORS: Record<string, string> = {
  LAPL: COLORS.gold,
  LRSL: COLORS.cyan,
  SI: COLORS.amber,
  SDF: COLORS.violet,
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── Types ──
interface EmployeePerf {
  employeeId: string;
  fullName: string;
  firm: string;
  location: string;
  designation: string;
  shiftHours: number;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  earlyOutDays: number;
  onTimeDays: number;
  overtimeDays: number;
  totalOvertimeHours: number;
  totalWorkHours: number;
  attendanceRate: number;
  punctualityRate: number;
  consistencyScore: number;
  avgWorkHours: number;
  weeklyData: { week: number; present: number; absent: number; late: number; onTime: number }[];
  variance?: number;
}

interface AnalyticsData {
  month: number;
  year: number;
  workingDays: number;
  totalEmployees: number;
  summary: {
    avgAttendanceRate: number;
    avgPunctualityRate: number;
    avgConsistencyScore: number;
    totalAbsenteeism: number;
  };
  topPerformers: EmployeePerf[];
  mostPunctual: EmployeePerf[];
  irregularEmployees: EmployeePerf[];
  inconsistentEmployees: EmployeePerf[];
  mostOvertime: EmployeePerf[];
  weeklyTrend: { week: string; weekNum: number; period: string; present: number; absent: number; late: number; onTime: number; halfDay: number }[];
  firmWisePerformance: { firm: string; employees: number; avgAttendance: number; avgPunctuality: number; avgConsistency: number }[];
  allEmployees: EmployeePerf[];
}

// ── Score Badge Component ──
function ScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'text-xs px-1.5 py-0.5', md: 'text-xs px-2 py-1', lg: 'text-sm px-3 py-1.5' };
  let bg = 'bg-emerald-500/20 text-emerald-400';
  if (score < 50) bg = 'bg-rose-500/20 text-rose-400';
  else if (score < 75) bg = 'bg-amber-500/20 text-amber-400';
  return <span className={`rounded-full font-bold ${sizeClasses[size]} ${bg}`}>{score.toFixed(0)}%</span>;
}

// ── Rank Badge ──
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-xs text-muted-foreground font-bold">#{rank}</span>;
}

// ── Progress Bar ──
function ProgressBar({ value, max = 100, color = COLORS.gold }: { value: number; max?: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

export function AnalyticsDashboard() {
  const { selectedFirm } = useHRMSStore();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: String(month), year: String(year) });
      if (selectedFirm && selectedFirm !== '__all__') params.set('firm', selectedFirm);
      const res = await fetch(`/api/analytics/performance?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error('Failed to load analytics');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }, [month, year, selectedFirm]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading Analytics...</span>
        </div>
      </div>
    );
  }

  const { summary, workingDays } = data;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-gold" />
            Attendance Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track performance, punctuality & consistency — {MONTHS[month - 1]} {year} ({workingDays} working days)
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg Attendance', value: `${summary.avgAttendanceRate}%`, icon: Users, color: COLORS.emerald, sub: `${data.totalEmployees} employees` },
          { label: 'Avg Punctuality', value: `${summary.avgPunctualityRate}%`, icon: Target, color: COLORS.teal, sub: 'On-time arrival' },
          { label: 'Consistency Score', value: `${summary.avgConsistencyScore}%`, icon: Zap, color: COLORS.gold, sub: 'Attendance × Punctuality' },
          { label: 'Total Absenteeism', value: `${summary.totalAbsenteeism}`, icon: AlertTriangle, color: COLORS.rose, sub: 'Absence instances' },
        ].map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="glass-card card-gold-hover border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${kpi.color}20` }}>
                    <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                  </div>
                </div>
                <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="top-performers">Top Performers</TabsTrigger>
          <TabsTrigger value="punctuality">Punctuality</TabsTrigger>
          <TabsTrigger value="irregular">Irregular</TabsTrigger>
          <TabsTrigger value="inconsistent">Inconsistency</TabsTrigger>
          <TabsTrigger value="overtime">Overtime</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Trend Chart */}
            <Card className="glass-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-gold" />
                  Weekly Attendance Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="week" tick={{ fill: '#888', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(212,168,73,0.3)', borderRadius: 8 }} />
                    <Bar dataKey="onTime" name="On Time" stackId="a" fill={COLORS.emerald} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="late" name="Late" stackId="a" fill={COLORS.amber} />
                    <Bar dataKey="absent" name="Absent" stackId="a" fill={COLORS.rose} radius={[4, 4, 0, 0]} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Firm-wise Performance */}
            <Card className="glass-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Award className="w-4 h-4 text-gold" />
                  Firm-wise Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.firmWisePerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={data.firmWisePerformance}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="firm" tick={{ fill: '#aaa', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#888', fontSize: 10 }} />
                      <Radar name="Attendance" dataKey="avgAttendance" stroke={COLORS.emerald} fill={COLORS.emerald} fillOpacity={0.2} />
                      <Radar name="Punctuality" dataKey="avgPunctuality" stroke={COLORS.teal} fill={COLORS.teal} fillOpacity={0.2} />
                      <Radar name="Consistency" dataKey="avgConsistency" stroke={COLORS.gold} fill={COLORS.gold} fillOpacity={0.2} />
                      <Legend />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(212,168,73,0.3)', borderRadius: 8 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">No firm data available</div>
                )}
              </CardContent>
            </Card>

            {/* Top 5 Performers Quick View */}
            <Card className="glass-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-gold" />
                  Top 5 Performers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.topPerformers.slice(0, 5).map((emp, i) => (
                  <div key={emp.employeeId} className="flex items-center gap-3">
                    <RankBadge rank={i + 1} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{emp.fullName}</span>
                        <ScoreBadge score={emp.consistencyScore} />
                      </div>
                      <ProgressBar value={emp.consistencyScore} color={COLORS.gold} />
                      <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>Attendance: {emp.attendanceRate}%</span>
                        <span>Punctual: {emp.punctualityRate}%</span>
                        <span className="text-muted-foreground/60">{emp.firm}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Attendance vs Punctuality Distribution */}
            <Card className="glass-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-gold" />
                  Employee Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const excellent = data.allEmployees.filter(e => e.consistencyScore >= 80).length;
                  const good = data.allEmployees.filter(e => e.consistencyScore >= 60 && e.consistencyScore < 80).length;
                  const average = data.allEmployees.filter(e => e.consistencyScore >= 40 && e.consistencyScore < 60).length;
                  const poor = data.allEmployees.filter(e => e.consistencyScore < 40).length;
                  const pieData = [
                    { name: 'Excellent (80+)', value: excellent, color: COLORS.emerald },
                    { name: 'Good (60-79)', value: good, color: COLORS.teal },
                    { name: 'Average (40-59)', value: average, color: COLORS.amber },
                    { name: 'Poor (<40)', value: poor, color: COLORS.rose },
                  ].filter(d => d.value > 0);
                  return pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(212,168,73,0.3)', borderRadius: 8 }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">No data available</div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Top Performers Tab ── */}
        <TabsContent value="top-performers" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers Chart */}
            <Card className="glass-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-gold" />
                  Top 10 — Consistency Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.topPerformers.map(e => ({ name: e.fullName.split(' ')[0], score: e.consistencyScore, attendance: e.attendanceRate, punctuality: e.punctualityRate }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: '#888', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#ccc', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(212,168,73,0.3)', borderRadius: 8 }} />
                    <Bar dataKey="score" name="Consistency" fill={COLORS.gold} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="attendance" name="Attendance" fill={COLORS.emerald} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="punctuality" name="Punctuality" fill={COLORS.teal} radius={[0, 4, 4, 0]} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Performers List */}
            <Card className="glass-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Award className="w-4 h-4 text-gold" />
                  Top Performers — Detailed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                {data.topPerformers.map((emp, i) => (
                  <motion.div key={emp.employeeId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                  >
                    <RankBadge rank={i + 1} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold">{emp.fullName}</span>
                          <span className="text-xs text-muted-foreground ml-2">{emp.employeeId}</span>
                        </div>
                        <ScoreBadge score={emp.consistencyScore} />
                      </div>
                      <ProgressBar value={emp.consistencyScore} color={COLORS.gold} />
                      <div className="flex gap-4 mt-1.5 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><ArrowUpRight className="w-3 h-3 text-emerald-400" />Present: {emp.presentDays}/{emp.totalDays}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-teal-400" />On-time: {emp.onTimeDays}</span>
                        <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-400" />Late: {emp.lateDays}</span>
                        <span>{emp.firm}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Punctuality Tab ── */}
        <TabsContent value="punctuality" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Punctuality Chart */}
            <Card className="glass-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal" />
                  Most Punctual Employees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.mostPunctual.map(e => ({ name: e.fullName.split(' ')[0], onTime: e.punctualityRate, late: 100 - e.punctualityRate }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#888', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(212,168,73,0.3)', borderRadius: 8 }} />
                    <Bar dataKey="onTime" name="On Time %" stackId="a" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="late" name="Late %" stackId="a" fill={COLORS.rose} radius={[4, 4, 0, 0]} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Punctual List */}
            <Card className="glass-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Timer className="w-4 h-4 text-teal" />
                  Punctuality Rankings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                {data.mostPunctual.map((emp, i) => (
                  <div key={emp.employeeId} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                    <RankBadge rank={i + 1} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold">{emp.fullName}</span>
                          <span className="text-xs text-muted-foreground ml-2">{emp.employeeId}</span>
                        </div>
                        <ScoreBadge score={emp.punctualityRate} />
                      </div>
                      <ProgressBar value={emp.punctualityRate} color={COLORS.teal} />
                      <div className="flex gap-4 mt-1.5 text-[10px] text-muted-foreground">
                        <span className="text-emerald-400">On-time: {emp.onTimeDays} days</span>
                        <span className="text-amber-400">Late: {emp.lateDays} days</span>
                        <span>Present: {emp.presentDays}/{emp.totalDays}</span>
                        <span>{emp.firm}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Irregular / Absentees Tab ── */}
        <TabsContent value="irregular" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Absenteeism Chart */}
            <Card className="glass-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <UserX className="w-4 h-4 text-rose" />
                  Most Absent Employees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.irregularEmployees.map(e => ({ name: e.fullName.split(' ')[0], absent: e.absentDays, present: e.presentDays }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" tick={{ fill: '#888', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#ccc', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(212,168,73,0.3)', borderRadius: 8 }} />
                    <Bar dataKey="present" name="Present" stackId="a" fill={COLORS.emerald} />
                    <Bar dataKey="absent" name="Absent" stackId="a" fill={COLORS.rose} radius={[0, 4, 4, 0]} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Irregular List */}
            <Card className="glass-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose" />
                  Irregular Attendance — Detailed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                {data.irregularEmployees.map((emp, i) => (
                  <div key={emp.employeeId} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                    <div className="flex flex-col items-center w-8">
                      <span className="text-rose-400 text-lg font-bold">{emp.absentDays}</span>
                      <span className="text-[9px] text-muted-foreground">absent</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold">{emp.fullName}</span>
                          <span className="text-xs text-muted-foreground ml-2">{emp.employeeId}</span>
                        </div>
                        <ScoreBadge score={emp.attendanceRate} />
                      </div>
                      <ProgressBar value={emp.attendanceRate} color={COLORS.rose} />
                      <div className="flex gap-4 mt-1.5 text-[10px] text-muted-foreground">
                        <span className="text-emerald-400">Present: {emp.presentDays}</span>
                        <span className="text-rose-400">Absent: {emp.absentDays}</span>
                        <span className="text-amber-400">Late: {emp.lateDays}</span>
                        <span>Rate: {emp.attendanceRate}%</span>
                        <span>{emp.firm}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Inconsistency Tab ── */}
        <TabsContent value="inconsistent" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Variance Chart */}
            <Card className="glass-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber" />
                  Attendance Inconsistency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.inconsistentEmployees.map(e => ({ name: e.fullName.split(' ')[0], variance: e.variance || 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#888', fontSize: 11 }} label={{ value: 'Variance', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(212,168,73,0.3)', borderRadius: 8 }} />
                    <Bar dataKey="variance" name="Weekly Variance" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Inconsistent List with Weekly Trend */}
            <Card className="glass-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber" />
                  Inconsistent Employees — Weekly Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
                {data.inconsistentEmployees.map((emp, i) => (
                  <div key={emp.employeeId} className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm font-semibold">{emp.fullName}</span>
                        <span className="text-xs text-muted-foreground ml-2">{emp.employeeId} · {emp.firm}</span>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 font-bold">Variance: {emp.variance}</span>
                    </div>
                    {/* Mini weekly trend */}
                    {emp.weeklyData.length > 1 && (
                      <div className="mt-2">
                        <ResponsiveContainer width="100%" height={60}>
                          <AreaChart data={emp.weeklyData.map(w => ({ week: `W${w.week}`, days: w.present }))}>
                            <XAxis dataKey="week" tick={{ fill: '#888', fontSize: 9 }} axisLine={false} tickLine={false} />
                            <Area type="monotone" dataKey="days" stroke={COLORS.amber} fill={`${COLORS.amber}30`} strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                        <div className="flex gap-3 text-[9px] text-muted-foreground mt-1">
                          {emp.weeklyData.map(w => (
                            <span key={w.week}>W{w.week}: {w.present}P / {w.absent}A</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Overtime Tab ── */}
        <TabsContent value="overtime" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overtime Chart */}
            <Card className="glass-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-violet" />
                  Most Overtime Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.mostOvertime.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data.mostOvertime.map(e => ({ name: e.fullName.split(' ')[0], otHours: e.totalOvertimeHours, otDays: e.overtimeDays }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" tick={{ fill: '#888', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#ccc', fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(212,168,73,0.3)', borderRadius: 8 }} />
                      <Bar dataKey="otHours" name="OT Hours" fill={COLORS.violet} radius={[0, 4, 4, 0]} />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[350px] text-sm text-muted-foreground">No overtime data this month</div>
                )}
              </CardContent>
            </Card>

            {/* Overtime List */}
            <Card className="glass-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-violet" />
                  Overtime Rankings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                {data.mostOvertime.length > 0 ? data.mostOvertime.map((emp, i) => (
                  <div key={emp.employeeId} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                    <RankBadge rank={i + 1} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold">{emp.fullName}</span>
                          <span className="text-xs text-muted-foreground ml-2">{emp.employeeId}</span>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-violet-500/20 text-violet-400 font-bold">{emp.totalOvertimeHours}h OT</span>
                      </div>
                      <div className="flex gap-4 mt-1.5 text-[10px] text-muted-foreground">
                        <span>OT Days: {emp.overtimeDays}</span>
                        <span>Avg Hours: {emp.avgWorkHours}h</span>
                        <span>Present: {emp.presentDays}/{emp.totalDays}</span>
                        <span>{emp.firm}</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-sm text-muted-foreground text-center py-8">No overtime data this month</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
