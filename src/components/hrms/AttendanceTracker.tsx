'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle, AlertTriangle, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

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
  isHoliday: boolean;
  employee?: { fullName: string; employeeId: string; department: string };
}

export function AttendanceTracker() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<{ employeeId: string; fullName: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: '', date: '', checkIn: '', checkOut: '' });
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0, halfDay: 0, ot: 0 });

  const loadData = useCallback(async () => {
    const now = new Date();
    const [attRes, empRes] = await Promise.all([
      fetch(`/api/attendance?month=${now.getMonth() + 1}&year=${now.getFullYear()}`),
      fetch('/api/employees'),
    ]);
    const attData = await attRes.json();
    const empData = await empRes.json();
    setRecords(attData);
    setEmployees(empData.map((e: any) => ({ employeeId: e.employeeId, fullName: e.fullName })));
    setSummary({
      present: attData.filter((a: any) => ['present', 'late'].includes(a.status)).length,
      absent: attData.filter((a: any) => a.status === 'absent').length,
      late: attData.filter((a: any) => a.lateEntry).length,
      halfDay: attData.filter((a: any) => a.halfDay).length,
      ot: attData.reduce((s: number, a: any) => s + a.overtimeHours, 0),
    });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async () => {
    if (!form.employeeId || !form.date) {
      toast.error('Please fill required fields');
      return;
    }
    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    toast.success('Attendance recorded');
    setOpen(false);
    setForm({ employeeId: '', date: '', checkIn: '', checkOut: '' });
    loadData();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      present: { variant: 'default', label: 'Present' },
      late: { variant: 'secondary', label: 'Late' },
      absent: { variant: 'destructive', label: 'Absent' },
      half_day: { variant: 'outline', label: 'Half Day' },
      holiday: { variant: 'secondary', label: 'Holiday' },
      weekly_off: { variant: 'outline', label: 'Weekly Off' },
    };
    const s = map[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>;
  };

  const statCards = [
    { title: 'Present', value: summary.present, icon: CheckCircle, color: 'text-green-500' },
    { title: 'Absent', value: summary.absent, icon: XCircle, color: 'text-red-500' },
    { title: 'Late', value: summary.late, icon: AlertTriangle, color: 'text-yellow-500' },
    { title: 'OT Hours', value: Math.round(summary.ot * 10) / 10, icon: Timer, color: 'text-blue-500' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Attendance Tracker</h2>
          <p className="text-sm text-muted-foreground">Auto-calculated working hours, overtime & deductions</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white"><Clock className="w-4 h-4 mr-2" /> Mark Attendance</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Mark Attendance</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Employee *</Label>
                <Select value={form.employeeId} onValueChange={v => setForm({ ...form, employeeId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.employeeId} value={e.employeeId}>{e.fullName} ({e.employeeId})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Check-In Time</Label><Input type="time" value={form.checkIn} onChange={e => setForm({ ...form, checkIn: e.target.value })} /></div>
              <div><Label>Check-Out Time</Label><Input type="time" value={form.checkOut} onChange={e => setForm({ ...form, checkOut: e.target.value })} /></div>
              <p className="text-xs text-muted-foreground">System auto-calculates: working hours, late entry, half day, overtime, and salary adjustments.</p>
              <Button className="w-full gradient-primary text-white" onClick={handleSubmit}>Save Attendance</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card, i) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass-card border-0">
              <CardContent className="p-4 flex items-center gap-3">
                <card.icon className={`w-8 h-8 ${card.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                  <p className="text-xl font-bold">{card.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <Card className="glass-card border-0">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[55vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Check-In</TableHead>
                  <TableHead>Check-Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>OT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.slice(0, 100).map((rec) => (
                  <TableRow key={rec.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{rec.employee?.fullName || rec.employeeId}</p>
                        <p className="text-xs text-muted-foreground">{rec.employee?.department}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{new Date(rec.date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm font-mono">{rec.checkIn || '-'}</TableCell>
                    <TableCell className="text-sm font-mono">{rec.checkOut || '-'}</TableCell>
                    <TableCell className="text-sm">{rec.totalHours}h</TableCell>
                    <TableCell>{statusBadge(rec.status)}</TableCell>
                    <TableCell className="text-sm">{rec.overtimeHours > 0 ? `${rec.overtimeHours}h` : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
