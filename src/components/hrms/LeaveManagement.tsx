'use client';

import { useEffect, useState, useCallback } from 'react';
import { CalendarDays, Check, X, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface LeaveRequest {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: string;
  employee?: { fullName: string; employeeId: string; department: string };
}

export function LeaveManagement() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<{ employeeId: string; fullName: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [syncingErp, setSyncingErp] = useState(false);
  const [form, setForm] = useState({ employeeId: '', type: 'Casual Leave', startDate: '', endDate: '', days: 1, reason: '' });

  const loadData = useCallback(async () => {
    const [lRes, eRes] = await Promise.all([fetch('/api/leaves'), fetch('/api/employees')]);
    setLeaves(await lRes.json());
    const empData = await eRes.json();
    setEmployees(empData.map((e: any) => ({ employeeId: e.employeeId, fullName: e.fullName })));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── ERP Integration: Pull pending leaves from ERP into HRMS ───
  // SAFE: only inserts new records; existing HRMS leaves are not touched
  const handleSyncErp = async () => {
    setSyncingErp(true);
    try {
      const res = await fetch('/api/leaves/erp-pull');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      toast.success(
        `Synced ${data.summary?.synced || 0} new ERP leaves (skipped ${data.summary?.skipped || 0}, errors ${data.summary?.errors || 0})`
      );
      loadData();
    } catch (err: any) {
      toast.error(`ERP sync failed: ${err.message}`);
    } finally {
      setSyncingErp(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.employeeId || !form.startDate || !form.endDate) { toast.error('Fill required fields'); return; }
    await fetch('/api/leaves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    toast.success('Leave request submitted');
    setOpen(false);
    loadData();
  };

  // ─── ERP Integration: When approving/rejecting, also push status back to ERP ───
  // SAFE: if the leave is not ERP-originated, erp-push returns success with synced=false
  const handleAction = async (id: string, status: string) => {
    // 1. Update HRMS Leave status (existing flow — UNCHANGED)
    await fetch('/api/leaves', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    toast.success(`Leave ${status}`);

    // 2. Best-effort push to ERP (non-blocking — won't break HRMS flow if ERP is down)
    try {
      const pushRes = await fetch('/api/leaves/erp-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveId: id, status, approvedBy: 'HR' }),
      });
      const pushData = await pushRes.json();
      if (pushData.synced) {
        toast.success(`ERP updated: ${pushData.message || 'synced'}`);
      }
    } catch {
      // Silent fail — ERP sync is best-effort
    }
    loadData();
  };

  const pending = leaves.filter(l => l.status === 'pending').length;
  const approved = leaves.filter(l => l.status === 'approved').length;
  const rejected = leaves.filter(l => l.status === 'rejected').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Leave Management</h2>
          <p className="text-sm text-muted-foreground">{pending} pending approvals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSyncErp} disabled={syncingErp}>
            <RefreshCw className={`w-4 h-4 mr-2 ${syncingErp ? 'animate-spin' : ''}`} />
            {syncingErp ? 'Syncing...' : 'Sync ERP Leaves'}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gold text-white"><CalendarDays className="w-4 h-4 mr-2" /> Apply Leave</Button>
            </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Apply Leave</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div><Label>Employee</Label><Select value={form.employeeId} onValueChange={v => setForm({ ...form, employeeId: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{employees.map(e => <SelectItem key={e.employeeId} value={e.employeeId}>{e.fullName}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Leave Type</Label><Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Casual Leave">Casual Leave</SelectItem><SelectItem value="Sick Leave">Sick Leave</SelectItem><SelectItem value="Earned Leave">Earned Leave</SelectItem><SelectItem value="Maternity Leave">Maternity Leave</SelectItem></SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
                <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
              </div>
              <div><Label>Days</Label><Input type="number" value={form.days} onChange={e => setForm({ ...form, days: Number(e.target.value) })} /></div>
              <div><Label>Reason</Label><Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Reason for leave" /></div>
              <Button className="w-full bg-gold text-white" onClick={handleSubmit}>Submit Leave</Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { title: 'Pending', value: pending, color: 'text-yellow-500', icon: Clock },
          { title: 'Approved', value: approved, color: 'text-green-500', icon: Check },
          { title: 'Rejected', value: rejected, color: 'text-red-500', icon: X },
        ].map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass-card card-gold-hover border-0">
              <CardContent className="p-4 flex items-center gap-3">
                <c.icon className={`w-8 h-8 ${c.color}`} />
                <div className="min-w-0 overflow-hidden"><p className="text-xs text-muted-foreground truncate">{c.title}</p><p className="text-xl font-bold">{c.value}</p></div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="glass-card card-gold-hover border-0">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[55vh]">
            <Table>
              <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Duration</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {leaves.map((l) => {
                  const isErpOriginated = !!(l.reason && l.reason.includes('[ERP:'));
                  return (
                  <TableRow key={l.id} className="hover:bg-muted/30">
                    <TableCell><div className="min-w-0 overflow-hidden"><p className="text-sm font-medium truncate flex items-center gap-1.5">{l.employee?.fullName || l.employeeId}{isErpOriginated && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">ERP</span>}</p><p className="text-xs text-muted-foreground truncate">{l.employee?.department}</p></div></TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{l.type}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{l.days}</TableCell>
                    <TableCell>
                      <Badge variant={l.status === 'approved' ? 'default' : l.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px] whitespace-nowrap shrink-0">{l.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {l.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={() => handleAction(l.id, 'approved')}><Check className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => handleAction(l.id, 'rejected')}><X className="w-4 h-4" /></Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
