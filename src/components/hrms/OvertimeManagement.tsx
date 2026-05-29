'use client';

import { useEffect, useState, useCallback } from 'react';
import { Timer, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface OTRecord {
  id: string;
  employeeId: string;
  date: string;
  hours: number;
  rate: number;
  amount: number;
  isHoliday: boolean;
  employee?: { fullName: string; department: string };
}

export function OvertimeManagement() {
  const [records, setRecords] = useState<OTRecord[]>([]);
  const [employees, setEmployees] = useState<{ employeeId: string; fullName: string; overtimeRate: number }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: '', date: '', hours: 0, rate: 0, isHoliday: false });

  const loadData = useCallback(async () => {
    const now = new Date();
    const [otRes, empRes] = await Promise.all([
      fetch(`/api/overtime?month=${now.getMonth() + 1}&year=${now.getFullYear()}`),
      fetch('/api/employees'),
    ]);
    setRecords(await otRes.json());
    const empData = await empRes.json();
    setEmployees(empData.map((e: any) => ({ employeeId: e.employeeId, fullName: e.fullName, overtimeRate: e.overtimeRate })));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async () => {
    if (!form.employeeId || !form.date || !form.hours) { toast.error('Fill required fields'); return; }
    await fetch('/api/overtime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    toast.success('Overtime recorded');
    setOpen(false);
    loadData();
  };

  const totalHours = records.reduce((s, r) => s + r.hours, 0);
  const totalAmount = records.reduce((s, r) => s + r.amount, 0);

  const deptOT = records.reduce((acc, r) => {
    const dept = r.employee?.department || 'Unknown';
    if (!acc[dept]) acc[dept] = { hours: 0, amount: 0 };
    acc[dept].hours += r.hours;
    acc[dept].amount += r.amount;
    return acc;
  }, {} as Record<string, { hours: number; amount: number }>);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Overtime Management</h2>
          <p className="text-sm text-muted-foreground">Auto-calculated OT from attendance + manual entries</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white"><Timer className="w-4 h-4 mr-2" /> Add Overtime</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Overtime</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div><Label>Employee</Label><Select value={form.employeeId} onValueChange={v => { const emp = employees.find(e => e.employeeId === v); setForm({ ...form, employeeId: v, rate: emp?.overtimeRate || 0 }); }}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{employees.map(e => <SelectItem key={e.employeeId} value={e.employeeId}>{e.fullName}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Hours</Label><Input type="number" step="0.5" value={form.hours} onChange={e => setForm({ ...form, hours: Number(e.target.value) })} /></div>
              <div><Label>Rate (₹/hr)</Label><Input type="number" value={form.rate} onChange={e => setForm({ ...form, rate: Number(e.target.value) })} /></div>
              <Button className="w-full gradient-primary text-white" onClick={handleSubmit}>Save Overtime</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { title: 'Total OT Hours', value: `${Math.round(totalHours * 10) / 10}h`, icon: Timer, color: 'text-blue-500' },
          { title: 'Total OT Cost', value: `₹${totalAmount.toLocaleString()}`, icon: DollarSign, color: 'text-green-500' },
          { title: 'Departments', value: Object.keys(deptOT).length, icon: TrendingUp, color: 'text-purple-500' },
        ].map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass-card border-0">
              <CardContent className="p-4 flex items-center gap-3">
                <c.icon className={`w-8 h-8 ${c.color}`} />
                <div><p className="text-xs text-muted-foreground">{c.title}</p><p className="text-xl font-bold">{c.value}</p></div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Department OT Chart */}
      {Object.keys(deptOT).length > 0 && (
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3">Department-wise OT Cost</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(deptOT).map(([dept, data]) => ({ department: dept.slice(0, 8), amount: data.amount }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="department" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                  <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="OT Cost" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card border-0">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[45vh]">
            <Table>
              <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Date</TableHead><TableHead>Hours</TableHead><TableHead>Rate</TableHead><TableHead>Amount</TableHead><TableHead>Type</TableHead></TableRow></TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell><p className="text-sm font-medium">{r.employee?.fullName || r.employeeId}</p></TableCell>
                    <TableCell className="text-sm">{new Date(r.date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm">{r.hours}h</TableCell>
                    <TableCell className="text-sm">₹{r.rate}/hr</TableCell>
                    <TableCell className="text-sm font-medium text-green-600 dark:text-green-400">₹{r.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{r.isHoliday ? 'Holiday OT' : 'Regular OT'}</TableCell>
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
