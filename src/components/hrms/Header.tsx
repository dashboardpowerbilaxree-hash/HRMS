'use client';

import { useHRMSStore } from '@/lib/store';
import { Bell, Moon, Sun, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useCallback } from 'react';

export function Header() {
  const { currentPage, darkMode, toggleDarkMode, setCurrentPage, setSidebarOpen, sidebarOpen } = useHRMSStore();
  const [notifCount, setNotifCount] = useState(0);

  const loadNotifs = useCallback(async () => {
    const data = await (await fetch('/api/notifications')).json();
    setNotifCount(data.unreadCount || 0);
  }, []);

  useEffect(() => { loadNotifs().catch(() => {}); }, [currentPage, loadNotifs]);

  const pageTitle: Record<string, string> = {
    dashboard: 'Dashboard',
    employees: 'Employee Management',
    attendance: 'Attendance Tracker',
    payroll: 'Payroll Automation',
    leaves: 'Leave Management',
    holidays: 'Holiday Calendar',
    overtime: 'Overtime Management',
    departments: 'Department Management',
    reports: 'Reports & Analytics',
    'ai-assistant': 'AI HR Assistant',
    'salary-slip': 'Salary Slip Generator',
    settings: 'Settings',
    notifications: 'Notification Center',
    'employee-profile': 'Employee Profile',
  };

  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-6 border-b border-border bg-card/50 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">{pageTitle[currentPage] || 'Dashboard'}</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">NeoCorp Technologies &middot; AI-Powered HRMS</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden md:flex">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search anything..."
            className="pl-9 w-64 h-9 text-sm bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>

        <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="relative">
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        <Button variant="ghost" size="icon" className="relative" onClick={() => setCurrentPage('notifications')}>
          <Bell className="w-4 h-4" />
          {notifCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive">
              {notifCount}
            </Badge>
          )}
        </Button>
      </div>
    </header>
  );
}
