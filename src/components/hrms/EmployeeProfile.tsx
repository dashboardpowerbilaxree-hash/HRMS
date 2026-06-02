'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Mail, Phone, MapPin, Building2, Calendar,
  Clock, FileText, IndianRupee, Briefcase, User,
  AlertCircle, FolderOpen,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHRMSStore } from '@/lib/store';

// ── Firm badge class map ──
const FIRM_BADGE_CLASS: Record<string, string> = {
  LAPL: 'firm-badge-lapl',
  LRSL: 'firm-badge-lrsl',
  SI: 'firm-badge-si',
  SDF: 'firm-badge-sdf',
  Roofing: 'firm-badge-roofing',
};

// ── Convert decimal hours to HH.MM display format ──
function formatHours(decimal: number): string {
  if (!decimal || decimal === 0) return '0.00';
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  if (minutes >= 60) return `${hours + 1}.00`;
  return `${hours}.${String(minutes).padStart(2, '0')}`;
}

// ── Employee Data Type ──
interface EmployeeData {
  id: string;
  employeeId: string;
  fullName: string;
  mobile: string | null;
  email: string | null;
  department: string;
  location: string;
  designation: string;
  joiningDate: string;
  salaryType: string;
  basicSalary: number;
  dailyRate: number;
  perDaySalary: number;
  overtimeRate: number;
  shiftStart: string;
  shiftEnd: string;
  shiftHours: number;
  employmentType: string;
  status: string;
  panNumber: string | null;
  aadhaarNumber: string | null;
  pfNumber: string | null;
  esiNumber: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankIfsc: string | null;
  address: string | null;
  attendance: any[];
  payrolls: any[];
  leaves: any[];
  overtimes: any[];
}

// ── Attendance status badge ──
const AttStatusBadge = ({ status }: { status: string }) => {
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
};

// ── Leave status badge ──
const LeaveStatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { bg: string; text: string }> = {
    approved: { bg: 'bg-emerald-500/15 border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400' },
    rejected: { bg: 'bg-red-500/15 border-red-500/20', text: 'text-red-600 dark:text-red-400' },
    pending: { bg: 'bg-yellow-500/15 border-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400' },
  };
  const s = map[status] || { bg: 'bg-muted border-border', text: 'text-muted-foreground' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.bg} ${s.text}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export function EmployeeProfile() {
  const { selectedEmployeeId, setCurrentPage } = useHRMSStore();
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEmployee = useCallback(async () => {
    if (selectedEmployeeId) {
      setLoading(true);
      try {
        const res = await fetch(`/api/employees/${selectedEmployeeId}`);
        const data = await res.json();
        setEmployee(data);
      } catch {
        setEmployee(null);
      }
      setLoading(false);
    }
  }, [selectedEmployeeId]);

  useEffect(() => { loadEmployee(); }, [loadEmployee]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-32 bg-muted/50 rounded animate-pulse" />
        <div className="h-40 bg-muted/50 rounded-xl animate-pulse" />
        <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] glass-card card-gold-hover p-8">
        <div className="w-16 h-16 rounded-2xl gradient-laxree flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold mb-2">No Employee Selected</h2>
        <p className="text-muted-foreground text-sm text-center max-w-md">
          Select an employee from the Employee Management page to view their profile.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => setCurrentPage('employees')}
        >
          Go to Employees
        </Button>
      </div>
    );
  }

  // ── Quick stats ──
  const quickStats = [
    {
      icon: IndianRupee,
      label: 'Monthly Salary',
      value: `₹${(employee.basicSalary ?? employee.monthlySalary ?? 0).toLocaleString('en-IN')}`,
      color: 'text-gold',
    },
    {
      icon: Calendar,
      label: 'Joining Date',
      value: new Date(employee.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      color: 'text-cyan-500',
    },
    {
      icon: Clock,
      label: 'Shift',
      value: `${employee.shiftStart} – ${employee.shiftEnd}`,
      color: 'text-amber-500',
    },
    {
      icon: Briefcase,
      label: 'Employment',
      value: employee.employmentType || 'Full Time',
      color: 'text-violet-500',
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Back button ── */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <Button variant="ghost" onClick={() => setCurrentPage('employees')} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Employees
        </Button>
      </motion.div>

      {/* ── Profile Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="glass-card card-gold-hover border-0">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full gradient-laxree flex items-center justify-center text-white text-2xl font-bold shadow-lg shrink-0">
                {employee.fullName.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold">{employee.fullName}</h2>
                  <span className={FIRM_BADGE_CLASS[employee.department] || 'firm-badge-lapl'}>
                    {employee.department}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      employee.status === 'Yes'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mr-1 ${employee.status === 'Yes' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {employee.status === 'Yes' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {employee.location}
                  </span>
                  <span>•</span>
                  <span>{employee.designation}</span>
                  <span>•</span>
                  <span className="font-mono text-xs">{employee.employeeId}</span>
                </div>

                {/* Contact info row */}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
                  {employee.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {employee.email}
                    </span>
                  )}
                  {employee.mobile && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {employee.mobile}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              {quickStats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/30 border border-border/30"
                  >
                    <div className={`w-8 h-8 rounded-lg bg-muted/80 flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                      <p className="text-sm font-semibold truncate">{stat.value}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Tab Panels ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs defaultValue="attendance" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="attendance" className="text-xs">Attendance</TabsTrigger>
            <TabsTrigger value="payroll" className="text-xs">Payroll</TabsTrigger>
            <TabsTrigger value="leaves" className="text-xs">Leaves</TabsTrigger>
            <TabsTrigger value="overtime" className="text-xs">Overtime</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
          </TabsList>

          {/* ── Attendance Tab ── */}
          <TabsContent value="attendance" className="mt-4">
            <Card className="glass-card card-gold-hover border-0">
              <CardContent className="p-0">
                <ScrollArea className="max-h-[50vh]">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Date</TableHead>
                        <TableHead>Check-In</TableHead>
                        <TableHead>Check-Out</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">OT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employee.attendance?.length > 0 ? (
                        employee.attendance.map((a: any) => (
                          <TableRow key={a.id} className="hover:bg-muted/30">
                            <TableCell className="text-sm">
                              {new Date(a.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </TableCell>
                            <TableCell className="text-sm font-mono">{a.checkIn || '—'}</TableCell>
                            <TableCell className="text-sm font-mono">{a.checkOut || '—'}</TableCell>
                            <TableCell className="text-sm font-medium">
                              {a.totalHours > 0 ? `${formatHours(a.totalHours)}h` : '—'}
                            </TableCell>
                            <TableCell><AttStatusBadge status={a.status} /></TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              {a.overtimeHours > 0 ? (
                                <span className="text-cyan-600 dark:text-cyan-400 font-medium">{formatHours(a.overtimeHours)}h</span>
                              ) : '—'}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                            No attendance records
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Payroll Tab ── */}
          <TabsContent value="payroll" className="mt-4">
            <Card className="glass-card card-gold-hover border-0">
              <CardContent className="p-0">
                <ScrollArea className="max-h-[50vh]">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Period</TableHead>
                        <TableHead>Work Hours</TableHead>
                        <TableHead>Gross</TableHead>
                        <TableHead>Deductions</TableHead>
                        <TableHead>Net Salary</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employee.payrolls?.length > 0 ? (
                        employee.payrolls.map((p: any) => (
                          <TableRow key={p.id} className="hover:bg-muted/30">
                            <TableCell className="text-sm font-medium">
                              {new Date(p.year, p.month - 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {p.totalWorkHours > 0 ? `${p.totalWorkHours}h` : '—'}
                            </TableCell>
                            <TableCell className="text-sm">₹{p.grossSalary.toLocaleString('en-IN')}</TableCell>
                            <TableCell className="text-sm text-red-500">₹{p.totalDeductions.toLocaleString('en-IN')}</TableCell>
                            <TableCell className="text-sm font-bold text-gold">
                              ₹{p.netSalary.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                p.status === 'generated'
                                  ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
                                  : p.status === 'paid'
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-muted text-muted-foreground border-border'
                              }`}>
                                {p.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                            No payroll records
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Leaves Tab ── */}
          <TabsContent value="leaves" className="mt-4">
            <Card className="glass-card card-gold-hover border-0">
              <CardContent className="p-0">
                <ScrollArea className="max-h-[50vh]">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Type</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employee.leaves?.length > 0 ? (
                        employee.leaves.map((l: any) => (
                          <TableRow key={l.id} className="hover:bg-muted/30">
                            <TableCell className="text-sm font-medium">{l.type}</TableCell>
                            <TableCell className="text-sm">
                              {new Date(l.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(l.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </TableCell>
                            <TableCell className="text-sm">{l.days}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {l.reason || '—'}
                            </TableCell>
                            <TableCell><LeaveStatusBadge status={l.status} /></TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                            No leave records
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Overtime Tab ── */}
          <TabsContent value="overtime" className="mt-4">
            <Card className="glass-card card-gold-hover border-0">
              <CardContent className="p-0">
                <ScrollArea className="max-h-[50vh]">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Date</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="hidden md:table-cell">Sunday</TableHead>
                        <TableHead className="hidden md:table-cell">Holiday</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employee.overtimes?.length > 0 ? (
                        employee.overtimes.map((o: any) => (
                          <TableRow key={o.id} className="hover:bg-muted/30">
                            <TableCell className="text-sm">
                              {new Date(o.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </TableCell>
                            <TableCell className="text-sm font-medium">{o.hours}h</TableCell>
                            <TableCell className="text-sm">₹{o.rate}/hr</TableCell>
                            <TableCell className="text-sm font-bold text-gold">
                              ₹{o.amount.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              {o.isSunday ? (
                                <span className="text-blue-600 dark:text-blue-400 font-medium">Yes</span>
                              ) : 'No'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              {o.isHoliday ? (
                                <span className="text-purple-600 dark:text-purple-400 font-medium">Yes</span>
                              ) : 'No'}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                            No overtime records
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Documents Tab ── */}
          <TabsContent value="documents" className="mt-4">
            <Card className="glass-card card-gold-hover border-0">
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <FolderOpen className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Document Management</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Document upload and management features are under development. Employees will be able to upload and manage their documents here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
