'use client';

import { useEffect, useState, useCallback } from 'react';
import { BarChart3, Download, TrendingUp, Users, DollarSign, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444'];

export function ReportsAnalytics() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [attReport, setAttReport] = useState<any>(null);
  const [payReport, setPayReport] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const loadData = useCallback(async () => {
    const [aRes, pRes, dRes] = await Promise.all([
      fetch(`/api/reports/attendance?month=${month}&year=${year}`),
      fetch(`/api/reports/payroll?month=${month}&year=${year}`),
      fetch('/api/dashboard'),
    ]);
    setAttReport(await aRes.json());
    setPayReport(await pRes.json());
    setDashboardData(await dRes.json());
  }, [month, year]);

  useEffect(() => { loadData(); }, [loadData]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Reports & Analytics</h2>
          <p className="text-sm text-muted-foreground">Comprehensive HR analytics and reporting</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* KPI Summary */}
          {dashboardData && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { title: 'Total Employees', value: dashboardData.totalEmployees, icon: Users, color: 'text-blue-500' },
                { title: 'Present Today', value: dashboardData.presentToday, icon: Clock, color: 'text-green-500' },
                { title: 'Monthly Payroll', value: `₹${dashboardData.monthlyPayrollCost.toLocaleString()}`, icon: DollarSign, color: 'text-purple-500' },
                { title: 'Pending Leaves', value: dashboardData.pendingLeaves, icon: TrendingUp, color: 'text-yellow-500' },
              ].map((c, i) => (
                <motion.div key={c.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="glass-card border-0">
                    <CardContent className="p-4 flex items-center gap-3">
                      <c.icon className={`w-8 h-8 ${c.color}`} />
                      <div><p className="text-xs text-muted-foreground">{c.title}</p><p className="text-lg font-bold">{c.value}</p></div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {dashboardData?.attendanceTrend && (
              <Card className="glass-card border-0">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Attendance Trend</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dashboardData.attendanceTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickFormatter={(v) => v.slice(5)} />
                        <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                        <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                        <Area type="monotone" dataKey="present" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} name="Present" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {dashboardData?.departmentWiseCount && (
              <Card className="glass-card border-0">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Department Distribution</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={dashboardData.departmentWiseCount} dataKey="count" nameKey="department" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2}>
                          {dashboardData.departmentWiseCount.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          {attReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { title: 'Present', value: attReport.summary?.present || 0, color: 'text-green-500' },
                  { title: 'Absent', value: attReport.summary?.absent || 0, color: 'text-red-500' },
                  { title: 'Late', value: attReport.summary?.late || 0, color: 'text-yellow-500' },
                  { title: 'OT Hours', value: Math.round((attReport.summary?.totalOvertimeHours || 0) * 10) / 10, color: 'text-blue-500' },
                ].map((c, i) => (
                  <Card key={c.title} className="glass-card border-0">
                    <CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">{c.title}</p><p className={`text-xl font-bold ${c.color}`}>{c.value}</p></CardContent>
                  </Card>
                ))}
              </div>
              <Card className="glass-card border-0">
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[50vh]">
                    <Table>
                      <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Hours</TableHead><TableHead>OT</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {(attReport.records || []).slice(0, 50).map((r: any) => (
                          <TableRow key={r.id} className="hover:bg-muted/30">
                            <TableCell className="text-sm">{r.employee?.fullName || r.employeeId}</TableCell>
                            <TableCell className="text-sm">{new Date(r.date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-sm">{r.status}</TableCell>
                            <TableCell className="text-sm">{r.totalHours}h</TableCell>
                            <TableCell className="text-sm">{r.overtimeHours > 0 ? `${r.overtimeHours}h` : '-'}</TableCell>
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

        <TabsContent value="payroll" className="mt-4">
          {payReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { title: 'Gross Total', value: `₹${(payReport.totals?.totalGross || 0).toLocaleString()}`, color: 'text-blue-500' },
                  { title: 'Deductions', value: `₹${(payReport.totals?.totalDeductions || 0).toLocaleString()}`, color: 'text-red-500' },
                  { title: 'Net Total', value: `₹${(payReport.totals?.totalNet || 0).toLocaleString()}`, color: 'text-green-500' },
                ].map((c, i) => (
                  <Card key={c.title} className="glass-card border-0">
                    <CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">{c.title}</p><p className={`text-xl font-bold ${c.color}`}>{c.value}</p></CardContent>
                  </Card>
                ))}
              </div>

              {payReport.deptBreakdown && Object.keys(payReport.deptBreakdown).length > 0 && (
                <Card className="glass-card border-0">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Department Payroll Breakdown</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={Object.entries(payReport.deptBreakdown).map(([dept, data]: [string, any]) => ({ department: dept.slice(0, 8), net: data.totalNet }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="department" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                          <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                          <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                          <Bar dataKey="net" fill="#6366f1" radius={[4, 4, 0, 0]} name="Net Payroll" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="glass-card border-0">
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[40vh]">
                    <Table>
                      <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Gross</TableHead><TableHead>Deductions</TableHead><TableHead>Net</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {(payReport.payrolls || []).map((p: any) => (
                          <TableRow key={p.id} className="hover:bg-muted/30">
                            <TableCell className="text-sm">{p.employee?.fullName || p.employeeId}</TableCell>
                            <TableCell className="text-sm">₹{p.grossSalary.toLocaleString()}</TableCell>
                            <TableCell className="text-sm text-red-500">₹{p.totalDeductions.toLocaleString()}</TableCell>
                            <TableCell className="text-sm font-bold text-green-600 dark:text-green-400">₹{p.netSalary.toLocaleString()}</TableCell>
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
      </Tabs>
    </div>
  );
}
