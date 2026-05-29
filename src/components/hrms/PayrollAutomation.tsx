'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Zap, FileText, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHRMSStore } from '@/lib/store';
import { toast } from 'sonner';

interface PayrollRecord {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  basicSalary: number;
  presentDays: number;
  absentDays: number;
  overtimeAmount: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  status: string;
  employee?: { fullName: string; employeeId: string; department: string; designation: string };
}

export function PayrollAutomation() {
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<{ employeeId: string; fullName: string }[]>([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: '', bonus: 0, incentive: 0, tdsDeduction: 0, advanceDeduction: 0, otherDeductions: 0 });
  const { setCurrentPage, setSelectedEmployeeId } = useHRMSStore();

  const loadData = useCallback(async () => {
    const [payRes, empRes] = await Promise.all([
      fetch(`/api/payroll?month=${month}&year=${year}`),
      fetch('/api/employees'),
    ]);
    setPayrolls(await payRes.json());
    const empData = await empRes.json();
    setEmployees(empData.map((e: any) => ({ employeeId: e.employeeId, fullName: e.fullName })));
  }, [month, year]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGenerateOne = async () => {
    if (!form.employeeId) { toast.error('Select an employee'); return; }
    await fetch('/api/payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: form.employeeId, month, year, ...form }),
    });
    toast.success('Payroll generated');
    setOpen(false);
    loadData();
  };

  const handleGenerateAll = async () => {
    const res = await fetch('/api/payroll/generate-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year }),
    });
    const data = await res.json();
    toast.success(`Payroll generated for ${data.generated} employees`);
    loadData();
  };

  const totalNet = payrolls.reduce((s, p) => s + p.netSalary, 0);
  const totalGross = payrolls.reduce((s, p) => s + p.grossSalary, 0);
  const totalDeductions = payrolls.reduce((s, p) => s + p.totalDeductions, 0);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Payroll Automation</h2>
          <p className="text-sm text-muted-foreground">Auto-calculated salary based on attendance, OT, leaves & deductions</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><DollarSign className="w-4 h-4 mr-2" /> Generate One</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Generate Payroll</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Employee</Label>
                  <Select value={form.employeeId} onValueChange={v => setForm({ ...form, employeeId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employees.map(e => <SelectItem key={e.employeeId} value={e.employeeId}>{e.fullName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Bonus (₹)</Label><Input type="number" value={form.bonus} onChange={e => setForm({ ...form, bonus: Number(e.target.value) })} /></div>
                  <div><Label>Incentive (₹)</Label><Input type="number" value={form.incentive} onChange={e => setForm({ ...form, incentive: Number(e.target.value) })} /></div>
                  <div><Label>TDS (₹)</Label><Input type="number" value={form.tdsDeduction} onChange={e => setForm({ ...form, tdsDeduction: Number(e.target.value) })} /></div>
                  <div><Label>Advance (₹)</Label><Input type="number" value={form.advanceDeduction} onChange={e => setForm({ ...form, advanceDeduction: Number(e.target.value) })} /></div>
                </div>
                <Button className="w-full gradient-primary text-white" onClick={handleGenerateOne}>Generate Payroll</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button className="gradient-primary text-white" onClick={handleGenerateAll}>
            <Zap className="w-4 h-4 mr-2" /> Generate All
          </Button>
        </div>
      </div>

      {/* Month/Year Selector */}
      <div className="flex gap-3">
        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { title: 'Gross Salary', value: totalGross, color: 'text-blue-500' },
          { title: 'Total Deductions', value: totalDeductions, color: 'text-red-500' },
          { title: 'Net Payroll', value: totalNet, color: 'text-green-500' },
        ].map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass-card border-0">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">{c.title}</p>
                <p className={`text-2xl font-bold ${c.color}`}>₹{c.value.toLocaleString()}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Payroll Table */}
      <Card className="glass-card border-0">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[50vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Present</TableHead>
                  <TableHead>Absent</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrolls.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => {
                    setSelectedEmployeeId(p.employeeId);
                    setCurrentPage('salary-slip');
                  }}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{p.employee?.fullName || p.employeeId}</p>
                        <p className="text-xs text-muted-foreground">{p.employee?.department}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{p.presentDays}</TableCell>
                    <TableCell className="text-sm text-destructive">{p.absentDays}</TableCell>
                    <TableCell className="text-sm">₹{p.grossSalary.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-red-500">₹{p.totalDeductions.toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-bold text-green-600 dark:text-green-400">₹{p.netSalary.toLocaleString()}</TableCell>
                    <TableCell><Badge variant={p.status === 'approved' ? 'default' : 'secondary'} className="text-[10px]">{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {payrolls.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No payroll records for this period. Click &quot;Generate All&quot; to create.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
