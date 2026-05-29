'use client';

import { useEffect, useState, useCallback } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Clock, Building2, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const LAXREE_COLORS = {
  gold: '#D4A843',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
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

const FIRMS = ['LAPL', 'LRSL', 'SI', 'SDF'];

export function ReportsAnalytics() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedFirm, setSelectedFirm] = useState('all');
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

  const FirmBadge = ({ firm }: { firm: string }) => (
    <span className={`${FIRM_BADGE_CLASS[firm] || 'firm-badge-lapl'} whitespace-nowrap shrink-0`}>{firm}</span>
  );

  // Filter payroll by selected firm
  const filteredPayrolls = selectedFirm !== 'all' && payReport?.payrolls
    ? payReport.payrolls.filter((p: any) => p.employee?.department === selectedFirm)
    : payReport?.payrolls || [];

  // Firm-wise breakdown for charts
  const firmPayrollData = dashboardData?.firmWiseCount?.map((f: any) => ({
    firm: f.firm,
    employees: f.count,
    payroll: dashboardData?.firmPayrollBreakdown?.[f.firm]?.totalNet || 0,
    fill: FIRM_COLORS[f.firm] || LAXREE_COLORS.gold,
  })) || [];

  return (
    <div className="space-y-4">
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
          <p className="text-sm text-muted-foreground">Comprehensive HR analytics for Laxree Group</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </motion.div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="firm-wise">Firm-wise</TabsTrigger>
          <TabsTrigger value="location-wise">Location-wise</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* KPI Summary */}
          {dashboardData && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { title: 'Total Employees', value: dashboardData.totalEmployees, icon: Users, color: 'text-gold' },
                { title: 'Present Today', value: dashboardData.presentToday, icon: Clock, color: 'text-teal-500' },
                { title: 'Monthly Payroll', value: `₹${dashboardData.monthlyPayrollCost.toLocaleString()}`, icon: DollarSign, color: 'text-violet-500' },
                { title: 'Pending Leaves', value: dashboardData.pendingLeaves, icon: TrendingUp, color: 'text-amber-500' },
              ].map((c, i) => (
                <motion.div key={c.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="glass-card card-gold-hover border-0">
                    <CardContent className="p-4 flex items-center gap-3">
                      <c.icon className={`w-8 h-8 ${c.color}`} />
                      <div className="min-w-0 overflow-hidden"><p className="text-xs text-muted-foreground truncate">{c.title}</p><p className="text-lg font-bold">{c.value}</p></div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
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

        <TabsContent value="attendance" className="mt-4">
          {attReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { title: 'Present', value: attReport.summary?.present || 0, color: 'text-emerald-500' },
                  { title: 'Absent', value: attReport.summary?.absent || 0, color: 'text-red-500' },
                  { title: 'Late', value: attReport.summary?.late || 0, color: 'text-amber-500' },
                  { title: 'OT Hours', value: Math.round((attReport.summary?.totalOvertimeHours || 0) * 10) / 10, color: 'text-cyan-500' },
                ].map((c, i) => (
                  <Card key={c.title} className="glass-card card-gold-hover border-0">
                    <CardContent className="p-3 text-center min-w-0"><p className="text-xs text-muted-foreground truncate">{c.title}</p><p className={`text-xl font-bold ${c.color}`}>{c.value}</p></CardContent>
                  </Card>
                ))}
              </div>
              <Card className="glass-card card-gold-hover border-0">
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[50vh]">
                    <Table>
                      <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Firm</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Hours</TableHead><TableHead>OT</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {(attReport.records || []).slice(0, 50).map((r: any) => (
                          <TableRow key={r.id} className="hover:bg-muted/30">
                            <TableCell className="text-sm truncate max-w-[150px]">{r.employee?.fullName || r.employeeId}</TableCell>
                            <TableCell><FirmBadge firm={r.employee?.department || ''} /></TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{new Date(r.date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{r.status}</TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{r.totalHours}h</TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{r.overtimeHours > 0 ? `${r.overtimeHours}h` : '-'}</TableCell>
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
              <div className="flex items-center gap-2">
                <Select value={selectedFirm} onValueChange={setSelectedFirm}>
                  <SelectTrigger className="w-36 h-9">
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
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { title: 'Gross Total', value: `₹${(payReport.totals?.totalGross || 0).toLocaleString()}`, color: 'text-cyan-500' },
                  { title: 'Deductions', value: `₹${(payReport.totals?.totalDeductions || 0).toLocaleString()}`, color: 'text-red-500' },
                  { title: 'Net Total', value: `₹${(payReport.totals?.totalNet || 0).toLocaleString()}`, color: 'text-gold' },
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
                            <TableCell className="text-sm whitespace-nowrap">₹{p.grossSalary.toLocaleString()}</TableCell>
                            <TableCell className="text-sm text-red-500 whitespace-nowrap">₹{p.totalDeductions.toLocaleString()}</TableCell>
                            <TableCell className="text-sm font-bold text-gold whitespace-nowrap">₹{p.netSalary.toLocaleString()}</TableCell>
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
                          Payroll: ₹{(dashboardData.firmPayrollBreakdown?.[f.firm]?.totalNet || 0).toLocaleString()}
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
                          {firmPayrollData.map((entry: any, i: number) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
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

        <TabsContent value="location-wise" className="mt-4 space-y-4">
          {dashboardData?.locationWiseCount && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {dashboardData.locationWiseCount.map((l: any, i: number) => (
                  <motion.div key={l.location} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="glass-card card-gold-hover border-0">
                      <CardContent className="p-4 flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-gold" />
                        <div>
                          <p className="text-sm font-medium truncate">{l.location}</p>
                          <p className="text-xl font-bold">{l.count}</p>
                          <p className="text-xs text-muted-foreground">employees</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <Card className="glass-card card-gold-hover border-0">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-gold" /> Location-wise Employee Distribution</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData.locationWiseCount} barCategoryGap="20%" layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                        <YAxis type="category" dataKey="location" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={110} />
                        <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                        <Bar dataKey="count" fill={LAXREE_COLORS.gold} radius={[0, 6, 6, 0]} name="Employees" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
