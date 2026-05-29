'use client';

import { useHRMSStore } from '@/lib/store';
import { Bell, Moon, Sun, Search, Menu, Clock, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export function Header() {
  const { currentPage, darkMode, toggleDarkMode, setCurrentPage, setSidebarOpen, sidebarOpen, selectedFirm, adminName, logout } = useHRMSStore();
  const [notifCount, setNotifCount] = useState(0);
  const [clock, setClock] = useState('');

  const displayName = adminName || 'Admin';

  // Real-time IST clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60000);
      const hh = String(ist.getHours()).padStart(2, '0');
      const mm = String(ist.getMinutes()).padStart(2, '0');
      const ss = String(ist.getSeconds()).padStart(2, '0');
      setClock(`${hh}:${mm}:${ss}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Notification count
  const loadNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifCount(data.unreadCount || 0);
    } catch {}
  }, []);

  useEffect(() => { loadNotifs(); }, [currentPage, loadNotifs]);

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
    'admin-panel': 'Admin Panel',
    'audit-logs': 'Audit Logs',
  };

  const firmLabel = selectedFirm && selectedFirm !== '__all__' ? selectedFirm : 'All Firms';

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-6 border-b border-border bg-card/50 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">{pageTitle[currentPage] || 'Dashboard'}</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Laxree Group &middot; {firmLabel} &middot; AI-Powered HRMS
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Global Search (decorative) */}
        <div className="relative hidden md:flex">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search employees, payroll..."
            className="pl-9 w-64 h-9 text-sm bg-muted/50 border-0 focus-visible:ring-1"
            readOnly
          />
        </div>

        {/* Real-time Clock */}
        <motion.div
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 text-xs font-mono text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{clock} IST</span>
        </motion.div>

        {/* Admin Name Display */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
          <div className="w-5 h-5 rounded-full gradient-laxree flex items-center justify-center text-white text-[9px] font-bold">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-medium text-primary">{displayName}</span>
        </div>

        {/* Dark Mode Toggle */}
        <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="relative">
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" onClick={() => setCurrentPage('notifications')}>
          <Bell className="w-4 h-4" />
          {notifCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive">
              {notifCount}
            </Badge>
          )}
        </Button>

        {/* Logout */}
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={handleLogout} title="Logout">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
