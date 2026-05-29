'use client';

import { useEffect, useState, useCallback } from 'react';
import { Building2, Plus, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  head: string | null;
}

export function DepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [empCounts, setEmpCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '', head: '' });

  const loadData = useCallback(async () => {
    const [dRes, eRes] = await Promise.all([fetch('/api/departments'), fetch('/api/employees')]);
    setDepartments(await dRes.json());
    const emps = await eRes.json();
    const counts: Record<string, number> = {};
    emps.forEach((e: any) => { counts[e.department] = (counts[e.department] || 0) + 1; });
    setEmpCounts(counts);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async () => {
    if (!form.name || !form.code) { toast.error('Name and code required'); return; }
    await fetch('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    toast.success('Department created');
    setOpen(false);
    setForm({ name: '', code: '', description: '', head: '' });
    loadData();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Department Management</h2>
          <p className="text-sm text-muted-foreground">{departments.length} departments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gold text-white"><Plus className="w-4 h-4 mr-2" /> Add Department</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Department name" /></div>
              <div><Label>Code *</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. ENG" /></div>
              <div><Label>Head</Label><Input value={form.head} onChange={e => setForm({ ...form, head: e.target.value })} placeholder="Department head" /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" /></div>
              <Button className="w-full bg-gold text-white" onClick={handleSubmit}>Create Department</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept, i) => (
          <motion.div key={dept.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass-card card-gold-hover border-0 kpi-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gold flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">{empCounts[dept.name] || 0}</span>
                  </div>
                </div>
                <h3 className="font-semibold">{dept.name}</h3>
                <p className="text-xs text-muted-foreground">Code: {dept.code}</p>
                {dept.head && <p className="text-xs text-muted-foreground mt-1">Head: {dept.head}</p>}
                {dept.description && <p className="text-xs text-muted-foreground mt-1">{dept.description}</p>}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
