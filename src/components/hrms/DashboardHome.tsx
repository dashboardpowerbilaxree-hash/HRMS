'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, UserCheck, UserX, Clock, DollarSign, Timer, TrendingUp, CalendarDays, Building2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DashboardData {
  totalEmployees: number;
  activeEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  totalOvertimeHours: number;
  monthlyPayrollCost: number;
  pendingLeaves: number;
  departmentWiseCount: { department: string; count: number }[];
  recentNotifications: { id: string; title: string; message: string; type: string; createdAt: string }[];
  attendanceTrend: { date: string; present: number; absent: number }[];
  payrollTrend: { month: number; year: number; total: number }[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];

function AnimatedCounter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1000;
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  return <span>{prefix}{display.toLocaleString()}{suffix}</span>;
}

export function DashboardHome() {
  const [data, setData] = useState<DashboardData | null>(null);

  const loadDashboard = useCallback(async () => {
    const data = await (await fetch('/api/dashboard')).json();
    setData(data);
  }, []);

  useEffect(() => { loadDashboard().catch(console.error); }, [loadDashboard]);

  if (!data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const kpiCards = [
    { title: 'Total Employees', value: data.totalEmployees, icon: Users, gradient: 'gradient-primary', suffix: '' },
    { title: 'Present Today', value: data.presentToday, icon: UserCheck, gradient: 'gradient-success', suffix: '' },
    { title: 'Absent Today', value: data.absentToday, icon: UserX, gradient: 'gradient-danger', suffix: '' },
    { title: 'Late Today', value: data.lateToday, icon: Clock, gradient: 'gradient-warning', suffix: '' },
    { title: 'OT Hours (Month)', value: data.totalOvertimeHours, icon: Timer, gradient: 'gradient-info', suffix: 'h' },
    { title: 'Monthly Payroll', value: data.monthlyPayrollCost, icon: DollarSign, gradient: 'gradient-primary', prefix: '₹' },
    { title: 'Pending Leaves', value: data.pendingLeaves, icon: CalendarDays, gradient: 'gradient-warning', suffix: '' },
    { title: 'Departments', value: data.departmentWiseCount.length, icon: Building2, gradient: 'gradient-success', suffix: '' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="kpi-card"
            >
              <Card className="border-0 shadow-none bg-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{card.title}</p>
                      <p className="text-2xl font-bold mt-1">
                        <AnimatedCounter
                          value={card.value}
                          prefix={(card as any).prefix || ''}
                          suffix={card.suffix}
                        />
                      </p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg ${card.gradient} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attendance Trend */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Attendance Trend (7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.attendanceTrend}>
                    <defs>
                      <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                    <Area type="monotone" dataKey="present" stroke="#6366f1" fill="url(#colorPresent)" strokeWidth={2} name="Present" />
                    <Area type="monotone" dataKey="absent" stroke="#ef4444" fill="transparent" strokeWidth={2} strokeDasharray="5 5" name="Absent" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payroll Trend */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="glass-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Payroll Cost Trend (6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.payrollTrend.map(p => ({ month: `M${p.month}`, total: p.total }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Payroll']} />
                    <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Department Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Department Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.departmentWiseCount} dataKey="count" nameKey="department" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2} label={({ department, count }) => `${department}: ${count}`}>
                      {data.departmentWiseCount.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="lg:col-span-2">
          <Card className="glass-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-56 overflow-y-auto">
                {data.recentNotifications.map((n, i) => (
                  <div key={n.id || i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.type === 'payroll' ? 'bg-green-500' : n.type === 'leave' ? 'bg-yellow-500' : n.type === 'employee' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {data.recentNotifications.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
