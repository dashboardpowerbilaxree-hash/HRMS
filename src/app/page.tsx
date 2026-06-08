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
import { ReportsAnalytics } from '@/components/hrms/ReportsAnalytics';
import { AnalyticsDashboard } from '@/components/hrms/AnalyticsDashboard';
import { AIAssistant } from '@/components/hrms/AIAssistant';
import { SalarySlipGenerator } from '@/components/hrms/SalarySlipGenerator';
import { SettingsPanel } from '@/components/hrms/SettingsPanel';

import { EmployeeProfile } from '@/components/hrms/EmployeeProfile';
import { Header } from '@/components/hrms/Header';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, Eye, EyeOff, Loader2, Crown, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';



// ── Premium Login Screen — Laxree Gold/Black ──
function LoginScreen() {
  const { setIsLoggedIn, setAdminName, setAdminRole } = useHRMSStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        setIsLoggedIn(true);
        setAdminName(data.admin?.name || 'Admin');
        setAdminRole(data.admin?.role || 'admin');
        toast.success('Welcome to Laxree HRMS!');
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch {
      setError('Connection error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Animated background elements — Gold orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, oklch(0.78 0.19 80), transparent)' }}
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, oklch(0.68 0.22 55), transparent)' }}
          animate={{ scale: [1.2, 1, 1.2], rotate: [0, -90, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute top-1/3 left-1/4 w-48 h-48 rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, oklch(0.82 0.15 80), transparent)' }}
          animate={{ y: [-20, 20, -20], x: [-10, 10, -10] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(oklch(0.7 0.15 75) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <Card className="glass-card login-card-glow border-0">
          <CardContent className="p-8">
            {/* Logo & Brand — Premium Laxree */}
            <motion.div
              className="flex flex-col items-center mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <motion.div
                className="w-24 h-24 rounded-2xl gradient-laxree flex items-center justify-center mb-4 shadow-2xl animate-float"
                whileHover={{ scale: 1.05 }}
              >
                <Image
                  src="/laxree-logo.png"
                  alt="Laxree Logo"
                  width={72}
                  height={72}
                  className="rounded-xl object-contain"
                />
              </motion.div>
              <h1 className="text-3xl font-bold text-gold-gradient tracking-wide">LAXREE</h1>
              <p className="text-sm text-muted-foreground mt-1">Your Support, Our Success</p>
              <div className="flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-gold/5 border border-gold/15">
                <Sparkles className="w-3 h-3 text-gold" />
                <span className="text-xs text-gold font-medium">AI-Powered HRMS Dashboard</span>
                <Sparkles className="w-3 h-3 text-gold" />
              </div>
            </motion.div>

            {/* Login Form */}
            <motion.form
              onSubmit={handleLogin}
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <div className="space-y-2">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-soft" />
                  <Input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-12 input-premium rounded-xl text-sm"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-soft" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 input-premium rounded-xl text-sm"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gold transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-destructive text-center bg-destructive/10 rounded-lg px-3 py-2"
                >
                  {error}
                </motion.p>
              )}

              <Button
                type="submit"
                className="w-full gradient-laxree text-white h-12 font-semibold rounded-xl btn-gold-glow shadow-lg"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    <span>Sign In to Laxree HRMS</span>
                  </div>
                )}
              </Button>
            </motion.form>

            {/* Footer */}
            <motion.div
              className="mt-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <p className="text-[10px] text-muted-foreground">
                Secured by Laxree Group IT &middot; v2.0
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function Home() {
  const { currentPage, sidebarOpen, isLoggedIn } = useHRMSStore();
  const [seeded, setSeeded] = useState(false);

  const seedDB = useCallback(async () => {
    if (seeded) return;
    try {
      await fetch('/api/seed', { method: 'POST' });
    } catch {}
    try {
      await fetch('/api/firms/seed', { method: 'POST' });
    } catch {}
    setSeeded(true);
  }, [seeded]);

  useEffect(() => {
    seedDB();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardHome />;
      case 'employees': return <EmployeeManagement />;
      case 'attendance': return <AttendanceTracker />;
      case 'payroll': return <PayrollAutomation />;
      case 'leaves': return <LeaveManagement />;
      case 'holidays': return <HolidayCalendar />;
      case 'reports': return <ReportsAnalytics />;
      case 'analytics': return <AnalyticsDashboard />;
      case 'ai-assistant': return <AIAssistant />;
      case 'salary-slip': return <SalarySlipGenerator />;
      case 'settings': return <SettingsPanel />;
      case 'employee-profile': return <EmployeeProfile />;
      default: return <DashboardHome />;
    }
  };

  // Show login screen if not logged in
  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-3 md:p-6">
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
