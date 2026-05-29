'use client';

import { useHRMSStore } from '@/lib/store';
import { Bell, Moon, Sun, Menu, Clock, LogOut, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Image from 'next/image';

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
    <header className="header-blur flex items-center justify-between h-14 px-3 md:px-6 z-10 gap-2">
      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
        <Button variant="ghost" size="icon" className="md:hidden shrink-0 h-8 w-8" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu className="w-4 h-4" />
        </Button>
        <div className="min-w-0 overflow-hidden">
          <h1 className="text-sm md:text-lg font-semibold truncate-fix">{pageTitle[currentPage] || 'Dashboard'}</h1>
          <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:flex items-center gap-1.5 truncate-fix">
            <Image src="/laxree-logo.png" alt="" width={10} height={10} className="rounded-sm shrink-0" />
            <span className="truncate-fix">Laxree Group</span>
            <span className="text-border shrink-0">|</span>
            <span className="truncate-fix">{firmLabel}</span>
            <span className="text-border shrink-0">|</span>
            <span className="text-gold shrink-0">AI-Powered HRMS</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        {/* Real-time Clock */}
        <motion.div
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 text-xs font-mono text-muted-foreground border border-border/50 shrink-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Clock className="w-3 h-3 text-gold" />
          <span>{clock} IST</span>
        </motion.div>

        {/* Admin Name Display — hidden on small screens */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gold/5 border border-gold/15 shrink-0 max-w-[160px]">
          <div className="w-5 h-5 rounded-full gradient-laxree flex items-center justify-center text-white text-[8px] font-bold shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-medium text-gold-gradient truncate-fix">{displayName}</span>
          <Crown className="w-2.5 h-2.5 text-gold shrink-0" />
        </div>

        {/* Dark Mode Toggle */}
        <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="relative hover:bg-gold/5 shrink-0 h-8 w-8" title="Toggle dark mode">
          {darkMode ? <Sun className="w-4 h-4 text-gold" /> : <Moon className="w-4 h-4" />}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative hover:bg-gold/5 shrink-0 h-8 w-8" onClick={() => setCurrentPage('notifications')} title="Notifications">
          <Bell className="w-4 h-4" />
          {notifCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive border-0">
              {notifCount}
            </Badge>
          )}
        </Button>

        {/* Logout */}
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 shrink-0 h-8 w-8" onClick={handleLogout} title="Logout">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
