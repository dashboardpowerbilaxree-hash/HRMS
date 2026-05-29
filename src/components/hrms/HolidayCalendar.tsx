'use client';

import { useEffect, useState, useCallback } from 'react';
import { Palmtree, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
  description: string | null;
}

export function HolidayCalendar() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', type: 'national', description: '' });

  const loadData = useCallback(async () => {
    const res = await fetch('/api/holidays');
    setHolidays(await res.json());
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async () => {
    if (!form.name || !form.date) { toast.error('Fill required fields'); return; }
    await fetch('/api/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    toast.success('Holiday added');
    setOpen(false);
    setForm({ name: '', date: '', type: 'national', description: '' });
    loadData();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/holidays?id=${id}`, { method: 'DELETE' });
    toast.success('Holiday removed');
    loadData();
  };

  const typeColors: Record<string, string> = {
    national: 'bg-red-500/10 text-red-500 border-red-500/20',
    festival: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    optional: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    company: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  };

  const grouped = holidays.reduce((acc, h) => {
    const month = new Date(h.date).toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(h);
    return acc;
  }, {} as Record<string, Holiday[]>);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Holiday Calendar</h2>
          <p className="text-sm text-muted-foreground">{holidays.length} holidays configured &middot; Sundays auto-marked as weekly off</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white"><Plus className="w-4 h-4 mr-2" /> Add Holiday</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Holiday</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div><Label>Holiday Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Republic Day" /></div>
              <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Type</Label><Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="national">National Holiday</SelectItem><SelectItem value="festival">Festival</SelectItem><SelectItem value="optional">Optional Holiday</SelectItem><SelectItem value="company">Company Holiday</SelectItem></SelectContent></Select></div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" /></div>
              <Button className="w-full gradient-primary text-white" onClick={handleSubmit}>Add Holiday</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {Object.entries(grouped).map(([month, items]) => (
        <motion.div key={month} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass-card border-0 mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Palmtree className="w-4 h-4 text-primary" /> {month}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {items.map((h) => (
                  <div key={h.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="text-center w-12">
                        <p className="text-lg font-bold">{new Date(h.date).getDate()}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(h.date).toLocaleString('default', { weekday: 'short' })}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{h.name}</p>
                        <Badge className={`text-[10px] ${typeColors[h.type] || ''}`} variant="outline">{h.type}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(h.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {holidays.length === 0 && (
        <Card className="glass-card border-0">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Palmtree className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No holidays configured. Add holidays to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
