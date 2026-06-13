'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, Trophy, AlertTriangle, CheckCircle, Shield, Star,
  Clock, Users, TrendingUp, ChevronDown, ChevronUp, Award,
  ShieldCheck, ShieldAlert, ShieldX, Info, ArrowLeft
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useHRMSStore } from '@/lib/store';
import { toast } from 'sonner';

const COLORS = {
  gold: '#D4A849', teal: '#14B8A6', cyan: '#06B6D4', amber: '#F59E0B',
  rose: '#F43F5E', violet: '#8B5CF6', emerald: '#10B981', sky: '#0EA5E9',
};

const RATING_COLORS: Record<number, string> = {
  5: COLORS.emerald, 4: COLORS.teal, 3: COLORS.amber, 2: COLORS.rose, 1: '#EF4444',
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface Scorecard {
  employeeId: string; fullName: string; firm: string; location: string; designation: string;
  shiftStart: string; shiftEnd: string; workingDays: number; presentDays: number;
  absentDays: number; onTimeDays: number; lateDays: number; halfDays: number;
  earlyOutDays: number; uninformedLeaveDays: number; overtimeDays: number;
  totalOvertimeHours: number; totalWorkHours: number; sundayWorkingDays: number;
  attendanceRate: number; punctualityRate: number; disciplineRating: number;
  overallRating: number; isExcellenceEligible: boolean;
  lateInstances: { date: string; checkIn: string; minutesLate: number }[];
  earlyOutInstances: { date: string; checkOut: string }[];
  alerts: { type: 'danger' | 'warning' | 'success' | 'info'; message: string }[];
  insights: string[];
}

interface ScorecardData {
  month: number; year: number; workingDays: number; totalWorkingDays: number; isLiveMonth: boolean; dataUptoDay: number; officialTime: string; graceMinutes: number;
  summary: { totalEmployees: number; avgRating: number; perfectAttendance: number; atRisk: number; excellenceEligible: number };
  deptCompliance: { firm: string; employees: number; punctualityCompliance: number; attendanceCompliance: number; avgRating: number }[];
  scorecards: Scorecard[];
}

// ── Rating Stars ──
function RatingStars({ rating, size = 20 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={i <= rating ? 'fill-current' : ''} style={{ color: i <= rating ? RATING_COLORS[rating] : '#333' }} />
      ))}
    </div>
  );
}

// ── Rating Badge ──
function RatingBadge({ rating }: { rating: number }) {
  const colors: Record<number, string> = {
    5: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    4: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    3: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    2: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    1: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  const labels: Record<number, string> = { 5: 'Excellent', 4: 'Good', 3: 'Average', 2: 'Poor', 1: 'Critical' };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${colors[rating] || colors[3]}`}>
      {rating}/5 — {labels[rating]}
    </span>
  );
}

// ── Alert Icon ──
function AlertIcon({ type }: { type: string }) {
  if (type === 'danger') return <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />;
  if (type === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
  if (type === 'success') return <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />;
  return <Info className="w-4 h-4 text-sky-400 shrink-0" />;
}

export function ScorecardDashboard() {
  const { selectedFirm } = useHRMSStore();
  const [data, setData] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [searchName, setSearchName] = useState('');
  const [grace, setGrace] = useState('15');
  const [firmFilter, setFirmFilter] = useState('__all__');
  const [locationFilter, setLocationFilter] = useState('__all__');
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Always fetch ALL employees — selectedEmpId is used only locally for UI display
      const params = new URLSearchParams({ month: String(month), year: String(year), grace });
      if (firmFilter && firmFilter !== '__all__') params.set('firm', firmFilter);
      else if (selectedFirm && selectedFirm !== '__all__') params.set('firm', selectedFirm);
      if (locationFilter && locationFilter !== '__all__') params.set('location', locationFilter);
      const res = await fetch(`/api/scorecard?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error('Failed to load scorecard');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }, [month, year, selectedFirm, firmFilter, locationFilter, grace]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Extract unique firms and locations from scorecard data for dropdowns
  const uniqueFirms = [...new Set(data?.scorecards.map(sc => sc.firm).filter(Boolean))].sort();
  const uniqueLocations = [...new Set(data?.scorecards.map(sc => sc.location).filter(Boolean))].sort();

  // Filter by search name
  const filteredScorecards = data?.scorecards.filter(sc =>
    !searchName || sc.fullName.toLowerCase().includes(searchName.toLowerCase()) || sc.employeeId.toLowerCase().includes(searchName.toLowerCase())
  ) || [];

  const selectedEmp = selectedEmpId ? filteredScorecards.find(sc => sc.employeeId === selectedEmpId) : null;

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading Scorecard...</span>
        </div>
      </div>
    );
  }

  const { summary, workingDays, totalWorkingDays, isLiveMonth, dataUptoDay, officialTime, graceMinutes } = data;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-gold" />
              Attendance Scorecard
            </h1>
            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>Official: <span className="text-gold font-bold">{officialTime} AM</span></span>
              <span className="text-white/20">|</span>
              <span>Grace: <span className="text-gold font-bold">{graceMinutes} min</span></span>
              <span className="text-white/20">|</span>
              <span>Late After: <span className="text-rose-400 font-bold">{(() => { const [h,m] = officialTime.split(':').map(Number); const totalMin = h*60+m+graceMinutes; const rh = Math.floor(totalMin/60); const rm = totalMin%60; return `${String(rh).padStart(2,'0')}:${String(rm).padStart(2,'0')} AM`; })()}</span></span>
              <span className="text-white/20">|</span>
              <span>{MONTHS[month - 1]} {year}</span>
              {isLiveMonth && (
                <>
                  <span className="text-white/20">|</span>
                  <span className="text-emerald-400 font-bold">LIVE</span>
                  <span>{workingDays}/{totalWorkingDays} working days</span>
                  <span className="text-muted-foreground">(data upto {dataUptoDay}th)</span>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Filter Row */}
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[80px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={firmFilter} onValueChange={setFirmFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="All Firms" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Firms</SelectItem>
              {uniqueFirms.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="All Locations" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Locations</SelectItem>
              {uniqueLocations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={grace} onValueChange={setGrace}>
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No grace</SelectItem>
              <SelectItem value="5">5 min grace</SelectItem>
              <SelectItem value="10">10 min grace</SelectItem>
              <SelectItem value="15">15 min (Default)</SelectItem>
              <SelectItem value="30">30 min grace</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Employees', value: summary.totalEmployees, icon: Users, color: COLORS.sky },
          { label: 'Avg Rating', value: `${summary.avgRating}/5`, icon: Star, color: COLORS.gold },
          { label: 'Perfect Score (5/5)', value: summary.perfectAttendance, icon: ShieldCheck, color: COLORS.emerald },
          { label: 'At Risk (≤2)', value: summary.atRisk, icon: ShieldAlert, color: COLORS.rose },
          { label: 'Excellence Eligible', value: summary.excellenceEligible, icon: Trophy, color: COLORS.violet },
        ].map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="glass-card card-gold-hover border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{kpi.label}</span>
                  <div className="p-1 rounded-lg" style={{ backgroundColor: `${kpi.color}20` }}>
                    <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                  </div>
                </div>
                <p className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Employee List */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="glass-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-gold" />
                Select Employee
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input placeholder="Search by name or code..." value={searchName} onChange={(e) => setSearchName(e.target.value)} className="mb-3" />
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {filteredScorecards.map(sc => (
                  <div
                    key={sc.employeeId}
                    onClick={() => { setSelectedEmpId(sc.employeeId); setExpandedEmp(sc.employeeId); }}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-150 ${selectedEmpId === sc.employeeId ? 'bg-gold/10 border border-gold/30 ring-1 ring-gold/20' : 'hover:bg-white/5 border border-transparent'}`}
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold" style={{ backgroundColor: `${RATING_COLORS[sc.overallRating]}20`, color: RATING_COLORS[sc.overallRating] }}>
                      {sc.overallRating}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{sc.fullName}</p>
                      <p className="text-[10px] text-muted-foreground">{sc.employeeId} · {sc.firm}</p>
                    </div>
                    {sc.isExcellenceEligible && <Trophy className="w-3.5 h-3.5 text-violet-400" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Rating Distribution */}
          <Card className="glass-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-gold" />
                Rating Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const dist = [5, 4, 3, 2, 1].map(r => ({ rating: r, count: filteredScorecards.filter(s => s.overallRating === r).length, color: RATING_COLORS[r] })).filter(d => d.count > 0);
                return dist.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={dist} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="count" nameKey="rating">
                        {dist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(212,168,73,0.3)', borderRadius: 8, fontSize: 12 }} />
                      <Legend formatter={(v) => `Rating ${v}/5 (${dist.find(d => String(d.rating) === String(v))?.count || 0})`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="text-center text-sm text-muted-foreground py-8">No data</div>;
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Right: Employee Detail */}
        <div className="lg:col-span-2 space-y-4">
          {selectedEmp ? (
            <>
              {/* Back to All button */}
              <button
                onClick={() => setSelectedEmpId('')}
                className="flex items-center gap-2 text-sm text-gold hover:text-gold/80 transition-colors mb-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to All Employees
              </button>
              {/* Employee Scorecard Header */}
              <Card className="glass-card border-0 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold">{selectedEmp.fullName}</h2>
                      <p className="text-xs text-muted-foreground">{selectedEmp.employeeId} · {selectedEmp.firm} · {selectedEmp.designation || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">Shift: {selectedEmp.shiftStart} - {selectedEmp.shiftEnd}</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-black" style={{ color: RATING_COLORS[selectedEmp.overallRating] }}>
                        {selectedEmp.overallRating}/5
                      </div>
                      <RatingStars rating={selectedEmp.overallRating} size={16} />
                      {selectedEmp.isExcellenceEligible && (
                        <div className="mt-2 px-2 py-1 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-bold border border-violet-500/30 flex items-center gap-1">
                          <Trophy className="w-3 h-3" /> Attendance Champion
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Score Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: 'Present Days', value: selectedEmp.presentDays, max: workingDays, color: COLORS.emerald },
                      { label: 'On Time', value: selectedEmp.onTimeDays, max: selectedEmp.presentDays || 1, color: COLORS.teal },
                      { label: 'Late Coming', value: selectedEmp.lateDays, color: COLORS.rose },
                      { label: 'Absent Days', value: selectedEmp.absentDays, color: COLORS.amber },
                    ].map((m, i) => (
                      <div key={i} className="p-3 rounded-xl bg-white/[0.03]">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
                        <p className="text-lg font-bold" style={{ color: m.color }}>{m.value}{m.max ? `/${m.max}` : ''}</p>
                      </div>
                    ))}
                  </div>

                  {/* Detailed Metrics */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                    {[
                      { label: 'Attendance %', value: `${selectedEmp.attendanceRate}%` },
                      { label: 'Punctuality %', value: `${selectedEmp.punctualityRate}%` },
                      { label: 'Half Days', value: selectedEmp.halfDays },
                      { label: 'Early Out', value: selectedEmp.earlyOutDays },
                      { label: 'Uninformed Leave', value: selectedEmp.uninformedLeaveDays },
                      { label: 'Sunday Work', value: selectedEmp.sundayWorkingDays },
                    ].map((m, i) => (
                      <div key={i} className="p-2 rounded-lg bg-white/[0.03] text-center">
                        <p className="text-[9px] text-muted-foreground">{m.label}</p>
                        <p className="text-sm font-bold">{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Discipline Rating Breakdown */}
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                    <h3 className="text-xs font-semibold text-gold mb-3 uppercase tracking-wider">Strict Attendance Discipline Score <span className="text-rose-400">(Late = after {(() => { const [h,m] = data.officialTime.split(':').map(Number); const totalMin = h*60+m+data.graceMinutes; const rh = Math.floor(totalMin/60); const rm = totalMin%60; return `${String(rh).padStart(2,'0')}:${String(rm).padStart(2,'0')}`; })()} AM)</span></h3>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { condition: '100% On-Time', rating: 5, current: selectedEmp.lateDays === 0 },
                        { condition: '1 Late Mark', rating: 4, current: selectedEmp.lateDays === 1 },
                        { condition: '2-3 Late Marks', rating: 3, current: selectedEmp.lateDays >= 2 && selectedEmp.lateDays <= 3 },
                        { condition: '4-5 Late Marks', rating: 2, current: selectedEmp.lateDays >= 4 && selectedEmp.lateDays <= 5 },
                        { condition: '5+ Late Marks', rating: 1, current: selectedEmp.lateDays > 5 },
                      ].map((row, i) => (
                        <div key={i} className={`p-2 rounded-lg text-center border transition-all ${row.current ? 'border-gold/50 bg-gold/10' : 'border-white/5 bg-white/[0.02]'}`}>
                          <p className="text-lg font-black" style={{ color: RATING_COLORS[row.rating] }}>{row.rating}</p>
                          <p className="text-[9px] text-muted-foreground mt-1">{row.condition}</p>
                          {row.current && <div className="mt-1 text-[9px] text-gold font-bold">← Current</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Late Instances Detail */}
              {selectedEmp.lateInstances.length > 0 && (
                <Card className="glass-card border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-rose" />
                      Late Coming Details ({selectedEmp.lateInstances.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                      {selectedEmp.lateInstances.map((inst, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
                          <span className="text-xs font-mono text-rose-400 font-bold">{inst.date}</span>
                          <span className="text-xs text-muted-foreground">Punch-in:</span>
                          <span className="text-xs font-bold text-rose-400">{inst.checkIn}</span>
                          <span className="text-xs text-muted-foreground">({inst.minutesLate} min late)</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Early Out Details */}
              {selectedEmp.earlyOutInstances.length > 0 && (
                <Card className="glass-card border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber" />
                      Early Departure Details ({selectedEmp.earlyOutInstances.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1.5">
                      {selectedEmp.earlyOutInstances.map((inst, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                          <span className="text-xs font-mono text-amber-400 font-bold">{inst.date}</span>
                          <span className="text-xs text-muted-foreground">Punch-out:</span>
                          <span className="text-xs font-bold text-amber-400">{inst.checkOut}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Alerts */}
              {selectedEmp.alerts.length > 0 && (
                <Card className="glass-card border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber" />
                      Dashboard Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedEmp.alerts.map((alert, i) => (
                      <div key={i} className={`flex items-start gap-2 p-3 rounded-lg border ${
                        alert.type === 'danger' ? 'bg-rose-500/5 border-rose-500/20' :
                        alert.type === 'warning' ? 'bg-amber-500/5 border-amber-500/20' :
                        alert.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/20' :
                        'bg-sky-500/5 border-sky-500/20'
                      }`}>
                        <AlertIcon type={alert.type} />
                        <span className="text-xs">{alert.message}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* AI Insights */}
              {selectedEmp.insights.length > 0 && (
                <Card className="glass-card border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gold" />
                      Management Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedEmp.insights.map((insight, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-gold/5 border border-gold/20">
                        <Info className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                        <span className="text-xs text-muted-foreground">{insight}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Attendance Excellence Award */}
              <Card className={`glass-card border-0 overflow-hidden ${selectedEmp.isExcellenceEligible ? 'ring-2 ring-violet-500/50' : ''}`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${selectedEmp.isExcellenceEligible ? 'bg-violet-500/20' : 'bg-white/5'}`}>
                      <Award className={`w-6 h-6 ${selectedEmp.isExcellenceEligible ? 'text-violet-400' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold">Attendance Excellence Award</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Requirements: No Late Coming · No Early Out · No Uninformed Leave · Attendance ≥ 98%
                      </p>
                    </div>
                    <div className="text-right">
                      {selectedEmp.isExcellenceEligible ? (
                        <>
                          <div className="text-lg font-black text-violet-400">5/5</div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-bold">Champion 🏆</span>
                        </>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-muted-foreground">Not Eligible</span>
                      )}
                    </div>
                  </div>
                  {/* Eligibility Checklist */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                    {[
                      { label: 'No Late Coming', pass: selectedEmp.lateDays === 0 },
                      { label: 'No Early Out', pass: selectedEmp.earlyOutDays === 0 },
                      { label: 'No Uninformed Leave', pass: selectedEmp.uninformedLeaveDays === 0 },
                      { label: 'Attendance ≥ 98%', pass: selectedEmp.attendanceRate >= 98 },
                    ].map((req, i) => (
                      <div key={i} className={`flex items-center gap-1.5 p-2 rounded-lg text-[10px] ${req.pass ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {req.pass ? <CheckCircle className="w-3 h-3" /> : <ShieldX className="w-3 h-3" />}
                        {req.label}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            /* No employee selected - show overview */
            <>
              {/* Department Compliance */}
              <Card className="glass-card border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gold" />
                    Department-wise Punctuality Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.deptCompliance.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={data.deptCompliance}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="firm" tick={{ fill: '#aaa', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#888', fontSize: 10 }} />
                        <Radar name="Punctuality %" dataKey="punctualityCompliance" stroke={COLORS.teal} fill={COLORS.teal} fillOpacity={0.2} />
                        <Radar name="Attendance %" dataKey="attendanceCompliance" stroke={COLORS.emerald} fill={COLORS.emerald} fillOpacity={0.2} />
                        <Legend />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(212,168,73,0.3)', borderRadius: 8 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : <div className="text-center text-sm text-muted-foreground py-8">No department data</div>}
                </CardContent>
              </Card>

              {/* All Employees Table */}
              <Card className="glass-card border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-gold" />
                    All Employee Scorecards — Click to View Detail
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left p-2 text-muted-foreground">Employee</th>
                        <th className="text-center p-2 text-muted-foreground">Rating</th>
                        <th className="text-center p-2 text-muted-foreground">Present</th>
                        <th className="text-center p-2 text-muted-foreground">On-Time</th>
                        <th className="text-center p-2 text-muted-foreground">Late</th>
                        <th className="text-center p-2 text-muted-foreground">Absent</th>
                        <th className="text-center p-2 text-muted-foreground">Att %</th>
                        <th className="text-center p-2 text-muted-foreground">Punc %</th>
                        <th className="text-center p-2 text-muted-foreground">Award</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredScorecards.map(sc => (
                        <tr
                          key={sc.employeeId}
                          onClick={() => setSelectedEmpId(sc.employeeId)}
                          className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          <td className="p-2">
                            <div className="font-semibold">{sc.fullName}</div>
                            <div className="text-[10px] text-muted-foreground">{sc.employeeId} · {sc.firm}</div>
                          </td>
                          <td className="text-center p-2"><RatingBadge rating={sc.overallRating} /></td>
                          <td className="text-center p-2 font-mono">{sc.presentDays}/{sc.workingDays}</td>
                          <td className="text-center p-2 font-mono text-emerald-400">{sc.onTimeDays}</td>
                          <td className="text-center p-2 font-mono text-rose-400">{sc.lateDays}</td>
                          <td className="text-center p-2 font-mono text-amber-400">{sc.absentDays}</td>
                          <td className="text-center p-2 font-mono">{sc.attendanceRate}%</td>
                          <td className="text-center p-2 font-mono">{sc.punctualityRate}%</td>
                          <td className="text-center p-2">
                            {sc.isExcellenceEligible ? <Trophy className="w-4 h-4 text-violet-400 mx-auto" /> : <span className="text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
