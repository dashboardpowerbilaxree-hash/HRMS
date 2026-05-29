'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileText, Download, Printer, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useHRMSStore } from '@/lib/store';
import { motion } from 'framer-motion';
import Image from 'next/image';

const FIRM_BADGE_CLASS: Record<string, string> = {
  LAPL: 'firm-badge-lapl',
  LRSL: 'firm-badge-lrsl',
  SI: 'firm-badge-si',
  SDF: 'firm-badge-sdf',
};

function FirmBadge({ f }: { f: string }) {
  return <span className={FIRM_BADGE_CLASS[f] || 'firm-badge-lapl'}>{f}</span>;
}

export function SalarySlipGenerator() {
  const { selectedEmployeeId } = useHRMSStore();
  const [employeeId, setEmployeeId] = useState(selectedEmployeeId || '');
  const [employees, setEmployees] = useState<{ employeeId: string; fullName: string; department: string; firm: string; location: string; salaryType: string }[]>([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [slip, setSlip] = useState<any>(null);

  const loadEmployees = useCallback(async () => {
    const data = await (await fetch('/api/employees')).json();
    setEmployees(data);
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  useEffect(() => {
    if (selectedEmployeeId) setEmployeeId(selectedEmployeeId);
  }, [selectedEmployeeId]);

  const loadSlip = useCallback(async () => {
    if (!employeeId) return;
    const [empRes, payRes] = await Promise.all([
      fetch(`/api/employees/${employeeId}`),
      fetch(`/api/payroll?employeeId=${employeeId}&month=${month}&year=${year}`),
    ]);
    const empData = await empRes.json();
    const payData = await payRes.json();
    setSlip({ employee: empData, payroll: payData[0] || null });
  }, [employeeId, month, year]);

  useEffect(() => { loadSlip(); }, [loadSlip]);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const handlePrint = () => {
    window.print();
  };

  const firm = slip?.employee?.department || slip?.employee?.firm || '';

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Salary Slip Generator
          </h2>
          <p className="text-sm text-muted-foreground">Auto-generated salary slips with Laxree formula calculations</p>
        </div>
      </motion.div>

      <div className="flex flex-wrap gap-3">
        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select Employee" /></SelectTrigger>
          <SelectContent>{employees.map(e => <SelectItem key={e.employeeId} value={e.employeeId}>{e.fullName} ({e.employeeId})</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>{[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        {slip?.payroll && (
          <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" /> Print</Button>
        )}
      </div>

      {slip?.payroll ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass-card border-0 print:shadow-none print:border print:border-black" id="salary-slip">
            <CardHeader className="text-center pb-2">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl gradient-laxree flex items-center justify-center overflow-hidden">
                  <Image src="/laxree-logo.png" alt="Laxree" width={40} height={40} className="rounded-lg" />
                </div>
                <div>
                  <CardTitle className="text-lg">Laxree Group of Companies</CardTitle>
                  <p className="text-xs text-muted-foreground">Salary Slip - {months[month - 1]} {year}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Employee Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 text-sm">
                <div><span className="text-muted-foreground">Employee:</span> <span className="font-medium">{slip.employee.fullName}</span></div>
                <div><span className="text-muted-foreground">ID:</span> <span className="font-medium font-mono">{slip.employee.employeeId}</span></div>
                <div><span className="text-muted-foreground">Firm:</span> <FirmBadge f={firm} /></div>
                <div><span className="text-muted-foreground">Location:</span> <span className="font-medium">{slip.employee.location}</span></div>
                <div><span className="text-muted-foreground">Designation:</span> <span className="font-medium">{slip.employee.designation}</span></div>
                <div><span className="text-muted-foreground">Salary Type:</span> <span className="font-medium capitalize">{slip.employee.salaryType}</span></div>
              </div>
              <Separator />

              {/* Hourly Rate & Work Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Hourly Rate</p>
                  <p className="text-sm font-bold">₹{(slip.payroll.hourlyRate || slip.payroll.salaryPerHour || 0).toFixed(2)}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Total Worked Hrs</p>
                  <p className="text-sm font-bold">{(slip.payroll.totalWorkedHrs || slip.payroll.totalWorkHours || 0).toFixed(1)}h</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Sunday Hrs</p>
                  <p className="text-sm font-bold">{(slip.payroll.sundayHrs || 0).toFixed(1)}h</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">PH Hours</p>
                  <p className="text-sm font-bold">{(slip.payroll.phHours || 0).toFixed(1)}h</p>
                </div>
              </div>
              <Separator />

              {/* Earnings & Deductions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-emerald-600 dark:text-emerald-400">Earnings</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Gross (Hrs × Rate)</span><span>₹{slip.payroll.grossSalary.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>OT Amount ({slip.payroll.otHours || 0}h × ₹{(slip.payroll.otRate || 0).toFixed(2)})</span><span>₹{(slip.payroll.otAmount || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Bonus</span><span>₹{(slip.payroll.bonus || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Incentive</span><span>₹{(slip.payroll.incentive || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Arrear</span><span>₹{(slip.payroll.arrear || 0).toLocaleString()}</span></div>
                    <Separator />
                    <div className="flex justify-between font-bold"><span>Total Earnings</span><span>₹{(slip.payroll.grossSalary + (slip.payroll.otAmount || 0) + (slip.payroll.bonus || 0) + (slip.payroll.incentive || 0) + (slip.payroll.arrear || 0)).toLocaleString()}</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-red-500">Deductions</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>TDS</span><span>₹{(slip.payroll.tdsDeduction || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Loan</span><span>₹{(slip.payroll.loanDeduction || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Advance</span><span>₹{(slip.payroll.advanceDeduction || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Security Deposit</span><span>₹{(slip.payroll.securityDeposit || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Others</span><span>₹{(slip.payroll.otherDeductions || 0).toLocaleString()}</span></div>
                    <Separator />
                    <div className="flex justify-between font-bold"><span>Total Deductions</span><span>₹{slip.payroll.totalDeductions.toLocaleString()}</span></div>
                  </div>
                </div>
              </div>
              <Separator />

              {/* Summary */}
              <div className="grid grid-cols-4 gap-4 text-center">
                <div><p className="text-xs text-muted-foreground">Present Days</p><p className="text-lg font-bold">{slip.payroll.presentDays}</p></div>
                <div><p className="text-xs text-muted-foreground">Absent Days</p><p className="text-lg font-bold text-destructive">{slip.payroll.absentDays}</p></div>
                <div><p className="text-xs text-muted-foreground">OT Hours</p><p className="text-lg font-bold text-cyan-600 dark:text-cyan-400">{(slip.payroll.otHours || 0).toFixed(1)}h</p></div>
                <div><p className="text-xs text-muted-foreground">Net Salary</p><p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">₹{slip.payroll.netSalary.toLocaleString()}</p></div>
              </div>

              {/* Formula Footer */}
              <div className="text-center text-[10px] text-muted-foreground pt-2 border-t">
                Net = Gross + OT Amount + Arrear − Total Deductions &nbsp;|&nbsp; Laxree Group of Companies
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <Card className="glass-card border-0">
          <CardContent className="p-8 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Select an employee and period to generate salary slip</p>
            {employeeId && <p className="text-sm mt-2">No payroll found for this period. Generate payroll first.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
