'use client';

import { useEffect, useState, useCallback } from 'react';
import { Settings, Save, RefreshCw, Info, Clock, IndianRupee } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Image from 'next/image';

export function SettingsPanel() {
  const [settings, setSettings] = useState<Record<string, string>>({});

  const loadSettings = useCallback(async () => {
    const res = await fetch('/api/settings');
    setSettings(await res.json());
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSave = async () => {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    toast.success('Settings saved successfully');
  };

  const handleReseed = async () => {
    await fetch('/api/seed', { method: 'POST' });
    toast.success('Database re-seeded with demo data');
    loadSettings();
  };

  const settingGroups = [
    {
      title: 'Company Information',
      icon: Settings,
      fields: [
        { key: 'companyName', label: 'Company Name', defaultValue: 'Laxree' },
        { key: 'companyFullName', label: 'Full Company Name', defaultValue: 'Laxree Group of Companies' },
        { key: 'companyAddress', label: 'Company Address', defaultValue: 'Ajmer, Rajasthan, India' },
        { key: 'currency', label: 'Currency', defaultValue: 'INR' },
      ],
    },
    {
      title: 'Payroll Configuration',
      icon: IndianRupee,
      fields: [
        { key: 'pfRate', label: 'PF Rate (%)', defaultValue: '12' },
        { key: 'esiRate', label: 'ESI Rate (%)', defaultValue: '0.75' },
        { key: 'gracePeriod', label: 'Late Grace Period (min)', defaultValue: '15' },
        { key: 'otMultiplier', label: 'OT Multiplier', defaultValue: '1' },
        { key: 'holidayOTMultiplier', label: 'Holiday OT Multiplier', defaultValue: '1' },
      ],
    },
    {
      title: 'Salary Formula Settings',
      icon: Clock,
      fields: [
        { key: 'salaryFormula', label: 'Salary Formula', defaultValue: 'hourly' },
        { key: 'sundayRule', label: 'Sunday Rule', defaultValue: 'earned_per_6_days' },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-gold" />
            Settings
          </h2>
          <p className="text-sm text-muted-foreground">Configure your Laxree HRMS system</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReseed}><RefreshCw className="w-4 h-4 mr-2" /> Reset Demo Data</Button>
          <Button className="gradient-laxree text-white" onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Save Settings</Button>
        </div>
      </motion.div>

      {/* Laxree Brand Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="glass-card card-gold-hover border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl gradient-laxree flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(212,168,67,0.3)]">
                <Image src="/laxree-logo.png" alt="Laxree" width={52} height={52} className="rounded-xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gold-gradient">Laxree Group of Companies</h3>
                <p className="text-sm text-muted-foreground">AI-Powered HRMS Dashboard &middot; Firms: LAPL, LRSL, SI, SDF</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">v2.0</Badge>
                  <Badge variant="outline" className="text-[10px]">Enterprise</Badge>
                  <Badge variant="outline" className="text-[10px]">AI Enabled</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {settingGroups.map((group, gi) => {
        const GroupIcon = group.icon;
        return (
          <motion.div
            key={group.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + gi * 0.05 }}
          >
            <Card className="glass-card card-gold-hover border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <GroupIcon className="w-4 h-4 text-gold" />
                  {group.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.fields.map((field) => (
                    <div key={field.key}>
                      <Label className="text-xs">{field.label}</Label>
                      {field.key === 'salaryFormula' ? (
                        <Select
                          value={settings[field.key] || field.defaultValue}
                          onValueChange={(v) => setSettings({ ...settings, [field.key]: v })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hourly">Hourly Rate Based</SelectItem>
                            <SelectItem value="daily">Daily Rate Based</SelectItem>
                            <SelectItem value="monthly">Monthly Fixed</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : field.key === 'sundayRule' ? (
                        <Select
                          value={settings[field.key] || field.defaultValue}
                          onValueChange={(v) => setSettings({ ...settings, [field.key]: v })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="earned_per_6_days">Earned per 6 working days</SelectItem>
                            <SelectItem value="fixed">Fixed weekly off</SelectItem>
                            <SelectItem value="compensatory">Compensatory off</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={settings[field.key] || field.defaultValue || ''}
                          onChange={e => setSettings({ ...settings, [field.key]: e.target.value })}
                          className="mt-1"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      {/* Salary Formula Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass-card card-gold-hover border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 text-gold" />
              Laxree Salary Formula Reference
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 mt-0.5 shrink-0">Hourly</Badge>
                <span>Gross = Total Worked Hours × Hourly Rate + OT Amount</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 mt-0.5 shrink-0">Net</Badge>
                <span>Net = Gross + Arrear − Total Deductions</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 mt-0.5 shrink-0">Daily</Badge>
                <span>Net = (Daily Rate × Days Present) + Sunday Amt − Deductions</span>
              </div>
              <Separator />
              <p className="text-xs">
                Hourly Rate = Monthly Salary ÷ (Shift Hours × Days in Month) &nbsp;|&nbsp;
                OT Rate = Hourly Rate × {settings.otMultiplier || '1'} (normal rate, NOT 1.5x) &nbsp;|&nbsp;
                Holiday OT = Hourly Rate × {settings.holidayOTMultiplier || '2'}
              </p>
              <p className="text-xs">
                Sunday Rule: {settings.sundayRule === 'earned_per_6_days' ? 'Earned per 6 working days' :
                  settings.sundayRule === 'fixed' ? 'Fixed weekly off' : 'Compensatory off'}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* About */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card className="glass-card card-gold-hover border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">About</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">System:</span> Laxree HRMS</div>
              <div><span className="text-muted-foreground">Version:</span> 2.0.0</div>
              <div><span className="text-muted-foreground">License:</span> Enterprise</div>
              <div><span className="text-muted-foreground">Database:</span> SQLite</div>
              <div><span className="text-muted-foreground">AI Engine:</span> Active</div>
              <div><span className="text-muted-foreground">Firms:</span> LAPL, LRSL, SI, SDF</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
