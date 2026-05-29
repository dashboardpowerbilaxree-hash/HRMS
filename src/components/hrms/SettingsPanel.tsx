'use client';

import { useEffect, useState, useCallback } from 'react';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

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
    toast.success('Settings saved');
  };

  const handleReseed = async () => {
    await fetch('/api/seed', { method: 'POST' });
    toast.success('Database re-seeded with demo data');
    loadSettings();
  };

  const settingGroups = [
    {
      title: 'Company Information',
      fields: [
        { key: 'companyName', label: 'Company Name' },
        { key: 'companyAddress', label: 'Company Address' },
        { key: 'currency', label: 'Currency' },
      ],
    },
    {
      title: 'Payroll Configuration',
      fields: [
        { key: 'pfRate', label: 'PF Rate (%)' },
        { key: 'esiRate', label: 'ESI Rate (%)' },
        { key: 'gracePeriod', label: 'Late Grace Period (min)' },
        { key: 'otMultiplier', label: 'OT Multiplier' },
        { key: 'holidayOTMultiplier', label: 'Holiday OT Multiplier' },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Settings</h2>
          <p className="text-sm text-muted-foreground">Configure your HRMS system</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReseed}><RefreshCw className="w-4 h-4 mr-2" /> Reset Demo Data</Button>
          <Button className="gradient-primary text-white" onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Save Settings</Button>
        </div>
      </div>

      {settingGroups.map((group) => (
        <Card key={group.title} className="glass-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{group.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.fields.map((field) => (
                <div key={field.key}>
                  <Label className="text-xs">{field.label}</Label>
                  <Input
                    value={settings[field.key] || ''}
                    onChange={e => setSettings({ ...settings, [field.key]: e.target.value })}
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="glass-card border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Version:</span> 2.0.0</div>
            <div><span className="text-muted-foreground">License:</span> Enterprise</div>
            <div><span className="text-muted-foreground">Database:</span> SQLite</div>
            <div><span className="text-muted-foreground">AI Engine:</span> Active</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
