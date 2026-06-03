'use client';

import { useHRMSStore, PageKey } from '@/lib/store';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
  LayoutDashboard, Users, Clock, DollarSign, CalendarDays,
  Palmtree, Timer, Building2, BarChart3, Bot, FileText,
  Settings, ChevronLeft, ChevronRight, Filter, LogOut, Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const navItems: { key: PageKey; label: string; icon: any }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'employees', label: 'Employees', icon: Users },
  { key: 'attendance', label: 'Attendance', icon: Clock },
  { key: 'payroll', label: 'Payroll', icon: DollarSign },
  { key: 'leaves', label: 'Leaves', icon: CalendarDays },
  { key: 'holidays', label: 'Holidays', icon: Palmtree },
  { key: 'overtime', label: 'Overtime', icon: Timer },
  { key: 'departments', label: 'Departments', icon: Building2 },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'salary-slip', label: 'Salary Slip', icon: FileText },
  { key: 'ai-assistant', label: 'AI Assistant', icon: Bot },
  { key: 'settings', label: 'Settings', icon: Settings },
];

const firms = [
  { value: '', label: 'All Firms' },
  { value: 'LAPL', label: 'LAPL' },
  { value: 'LRSL', label: 'LRSL' },
  { value: 'SI', label: 'SI' },
  { value: 'SDF', label: 'SDF' },
];

export function Sidebar() {
  const { currentPage, setCurrentPage, sidebarOpen, setSidebarOpen, selectedFirm, setSelectedFirm, adminName, logout } = useHRMSStore();

  const displayName = adminName || 'Admin';

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 270 : 72 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative flex flex-col h-full border-r border-sidebar-border bg-sidebar sidebar-gradient z-20 shrink-0"
    >
      {/* Logo & Brand — Premium Laxree */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border overflow-hidden">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl gradient-laxree shrink-0 overflow-hidden shadow-lg">
          <Image
            src="/laxree-logo.png"
            alt="Laxree"
            width={40}
            height={40}
            className="rounded-lg object-contain"
          />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              <span className="text-lg font-bold text-gold-gradient">Laxree</span>
              <span className="text-[10px] text-muted-foreground -mt-1">HRMS Dashboard</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation — Premium gold active state */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setCurrentPage(item.key)}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'nav-active-gold'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-gold')} />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && sidebarOpen && (
                <motion.div
                  layoutId="sidebar-active"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-gold"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center shadow-lg hover:bg-accent transition-colors z-30"
      >
        {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* Firm Filter & User — Premium bottom section */}
      <div className="border-t border-sidebar-border">
        {/* Firm Filter */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="px-3 pt-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <Filter className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Firm Filter</span>
              </div>
              <Select value={selectedFirm} onValueChange={setSelectedFirm}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Firms" />
                </SelectTrigger>
                <SelectContent>
                  {firms.map((f) => (
                    <SelectItem key={f.value || '__all__'} value={f.value || '__all__'}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User Avatar & Logout — Premium gold avatar */}
        <div className="px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full gradient-laxree flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col flex-1 min-w-0"
                >
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium truncate">{displayName}</span>
                    <Crown className="w-3 h-3 text-gold shrink-0" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Super Admin</span>
                </motion.div>
              )}
            </AnimatePresence>
            {sidebarOpen && (
              <button
                onClick={logout}
                className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
