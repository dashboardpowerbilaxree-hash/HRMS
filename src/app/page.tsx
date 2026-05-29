'use client';

import { useEffect, useState, useCallback } from 'react';
import { useHRMSStore } from '@/lib/store';
import { Sidebar } from '@/components/hrms/Sidebar';
import { DashboardHome } from '@/components/hrms/DashboardHome';
import { EmployeeManagement } from '@/components/hrms/EmployeeManagement';
import { AttendanceTracker } from '@/components/hrms/AttendanceTracker';
import { PayrollAutomation } from '@/components/hrms/PayrollAutomation';
import { LeaveManagement } from '@/components/hrms/LeaveManagement';
import { HolidayCalendar } from '@/components/hrms/HolidayCalendar';
import { OvertimeManagement } from '@/components/hrms/OvertimeManagement';
import { ReportsAnalytics } from '@/components/hrms/ReportsAnalytics';
import { AIAssistant } from '@/components/hrms/AIAssistant';
import { SalarySlipGenerator } from '@/components/hrms/SalarySlipGenerator';
import { SettingsPanel } from '@/components/hrms/SettingsPanel';
import { NotificationCenter } from '@/components/hrms/NotificationCenter';
import { EmployeeProfile } from '@/components/hrms/EmployeeProfile';
import { DepartmentManagement } from '@/components/hrms/DepartmentManagement';
import { Header } from '@/components/hrms/Header';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const { currentPage, sidebarOpen } = useHRMSStore();
  const [seeded, setSeeded] = useState(false);

  const seedDB = useCallback(async () => {
    try {
      await fetch('/api/seed', { method: 'POST' });
    } catch {}
    setSeeded(true);
  }, []);

  useEffect(() => { seedDB(); }, [seedDB]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardHome />;
      case 'employees': return <EmployeeManagement />;
      case 'attendance': return <AttendanceTracker />;
      case 'payroll': return <PayrollAutomation />;
      case 'leaves': return <LeaveManagement />;
      case 'holidays': return <HolidayCalendar />;
      case 'overtime': return <OvertimeManagement />;
      case 'departments': return <DepartmentManagement />;
      case 'reports': return <ReportsAnalytics />;
      case 'ai-assistant': return <AIAssistant />;
      case 'salary-slip': return <SalarySlipGenerator />;
      case 'settings': return <SettingsPanel />;
      case 'notifications': return <NotificationCenter />;
      case 'employee-profile': return <EmployeeProfile />;
      default: return <DashboardHome />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
