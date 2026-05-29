'use client';

import { useHRMSStore, PageKey } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Clock, DollarSign, CalendarDays,
  Palmtree, Timer, Building2, BarChart3, Bot, FileText,
  Settings, Bell, ChevronLeft, ChevronRight, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

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
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { currentPage, setCurrentPage, sidebarOpen, setSidebarOpen } = useHRMSStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 260 : 72 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative flex flex-col h-full border-r border-border bg-sidebar sidebar-gradient z-20"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg gradient-primary neon-glow">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col"
          >
            <span className="text-lg font-bold neon-text">NeoHRMS</span>
            <span className="text-[10px] text-muted-foreground -mt-1">AI-Powered HRMS</span>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
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
                  ? 'bg-primary/15 text-primary neon-glow'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-primary')} />
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="truncate"
                >
                  {item.label}
                </motion.span>
              )}
              {isActive && sidebarOpen && (
                <motion.div
                  layoutId="sidebar-active"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center shadow-md hover:bg-accent transition-colors"
      >
        {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* Footer */}
      {sidebarOpen && (
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold">HR</div>
            <div className="flex flex-col">
              <span className="text-xs font-medium">HR Admin</span>
              <span className="text-[10px] text-muted-foreground">Super Admin</span>
            </div>
          </div>
        </div>
      )}
    </motion.aside>
  );
}
