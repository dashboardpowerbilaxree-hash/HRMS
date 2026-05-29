'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileText, Download, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useHRMSStore } from '@/lib/store';

export function SalarySlipGenerator() {
  const { selectedEmployeeId } = useHRMSStore();
  const [employeeId, setEmployeeId] = useState(selectedEmployeeId || '');
  const [employees, setEmployees] = useState<{ employeeId: string; fullName: string; department: string }[]>([]);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Salary Slip Generator</h2>
          <p className="text-sm text-muted-foreground">Auto-generated salary slips with all calculations</p>
        </div>
      </div>

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
          <SelectContent>{[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        {slip?.payroll && (
          <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" /> Print</Button>
        )}
      </div>

      {slip?.payroll ? (
        <Card className="glass-card border-0 print:shadow-none print:border print:border-black" id="salary-slip">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">NeoCorp Technologies</CardTitle>
            <p className="text-sm text-muted-foreground">Salary Slip - {months[month - 1]} {year}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Employee Info */}
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div><span className="text-muted-foreground">Employee:</span> <span className="font-medium">{slip.employee.fullName}</span></div>
              <div><span className="text-muted-foreground">ID:</span> <span className="font-medium">{slip.employee.employeeId}</span></div>
              <div><span className="text-muted-foreground">Department:</span> <span className="font-medium">{slip.employee.department}</span></div>
              <div><span className="text-muted-foreground">Designation:</span> <span className="font-medium">{slip.employee.designation}</span></div>
            </div>
            <Separator />

            {/* Earnings & Deductions */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm mb-2 text-green-600 dark:text-green-400">Earnings</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Basic Salary</span><span>₹{slip.payroll.basicSalary.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Overtime</span><span>₹{slip.payroll.overtimeAmount.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Bonus</span><span>₹{slip.payroll.bonus.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Incentive</span><span>₹{slip.payroll.incentive.toLocaleString()}</span></div>
                  <Separator />
                  <div className="flex justify-between font-bold"><span>Gross</span><span>₹{slip.payroll.grossSalary.toLocaleString()}</span></div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2 text-red-500">Deductions</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>PF</span><span>₹{slip.payroll.pfDeduction.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>ESI</span><span>₹{slip.payroll.esiDeduction.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>TDS</span><span>₹{slip.payroll.tdsDeduction.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Advance</span><span>₹{slip.payroll.advanceDeduction.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Others</span><span>₹{slip.payroll.otherDeductions.toLocaleString()}</span></div>
                  <Separator />
                  <div className="flex justify-between font-bold"><span>Total</span><span>₹{slip.payroll.totalDeductions.toLocaleString()}</span></div>
                </div>
              </div>
            </div>
            <Separator />

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-xs text-muted-foreground">Present Days</p><p className="text-lg font-bold">{slip.payroll.presentDays}</p></div>
              <div><p className="text-xs text-muted-foreground">Absent Days</p><p className="text-lg font-bold text-destructive">{slip.payroll.absentDays}</p></div>
              <div><p className="text-xs text-muted-foreground">Net Salary</p><p className="text-2xl font-bold text-green-600 dark:text-green-400">₹{slip.payroll.netSalary.toLocaleString()}</p></div>
            </div>
          </CardContent>
        </Card>
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
