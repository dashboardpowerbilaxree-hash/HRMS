'use client';

import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Mail, Phone, MapPin, Building2, Calendar, DollarSign, Clock, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHRMSStore } from '@/lib/store';

interface EmployeeData {
  id: string;
  employeeId: string;
  fullName: string;
  mobile: string | null;
  email: string | null;
  department: string;
  designation: string;
  joiningDate: string;
  salaryType: string;
  basicSalary: number;
  perDaySalary: number;
  overtimeRate: number;
  shiftStart: string;
  shiftEnd: string;
  status: string;
  panNumber: string | null;
  aadhaarNumber: string | null;
  pfNumber: string | null;
  esiNumber: string | null;
  bankName: string | null;
  bankAccount: string | null;
  attendance: any[];
  payrolls: any[];
  leaves: any[];
  overtimes: any[];
}

export function EmployeeProfile() {
  const { selectedEmployeeId, setCurrentPage } = useHRMSStore();
  const [employee, setEmployee] = useState<EmployeeData | null>(null);

  const loadEmployee = useCallback(async () => {
    if (selectedEmployeeId) {
      const data = await (await fetch(`/api/employees/${selectedEmployeeId}`)).json();
      setEmployee(data);
    }
  }, [selectedEmployeeId]);

  useEffect(() => { loadEmployee(); }, [loadEmployee]);

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Select an employee to view profile</p>
      </div>
    );
  }

  const infoItems = [
    { icon: Mail, label: 'Email', value: employee.email || '-' },
    { icon: Phone, label: 'Mobile', value: employee.mobile || '-' },
    { icon: Building2, label: 'Department', value: employee.department },
    { icon: Calendar, label: 'Joined', value: new Date(employee.joiningDate).toLocaleDateString() },
    { icon: DollarSign, label: 'Basic Salary', value: `₹${employee.basicSalary.toLocaleString()}` },
    { icon: Clock, label: 'Shift', value: `${employee.shiftStart} - ${employee.shiftEnd}` },
  ];

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => setCurrentPage('employees')} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Employees
      </Button>

      {/* Profile Header */}
      <Card className="glass-card border-0">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-white text-2xl font-bold">
              {employee.fullName.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{employee.fullName}</h2>
                <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>{employee.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{employee.designation} &middot; {employee.department}</p>
              <p className="text-xs text-muted-foreground font-mono">{employee.employeeId}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
            {infoItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <item.icon className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="leaves">Leaves</TabsTrigger>
          <TabsTrigger value="overtime">Overtime</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-4">
          <Card className="glass-card border-0">
            <CardContent className="p-0">
              <ScrollArea className="max-h-[50vh]">
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Check-In</TableHead><TableHead>Check-Out</TableHead><TableHead>Hours</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {employee.attendance?.map((a: any) => (
                      <TableRow key={a.id} className="hover:bg-muted/30">
                        <TableCell className="text-sm">{new Date(a.date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm font-mono">{a.checkIn || '-'}</TableCell>
                        <TableCell className="text-sm font-mono">{a.checkOut || '-'}</TableCell>
                        <TableCell className="text-sm">{a.totalHours}h</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{a.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-4">
          <Card className="glass-card border-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Month</TableHead><TableHead>Gross</TableHead><TableHead>Deductions</TableHead><TableHead>Net</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {employee.payrolls?.map((p: any) => (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm">{p.month}/{p.year}</TableCell>
                      <TableCell className="text-sm">₹{p.grossSalary.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-red-500">₹{p.totalDeductions.toLocaleString()}</TableCell>
                      <TableCell className="text-sm font-bold text-green-600 dark:text-green-400">₹{p.netSalary.toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{p.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves" className="mt-4">
          <Card className="glass-card border-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Duration</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {employee.leaves?.map((l: any) => (
                    <TableRow key={l.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm">{l.type}</TableCell>
                      <TableCell className="text-sm">{new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm">{l.days}</TableCell>
                      <TableCell><Badge variant={l.status === 'approved' ? 'default' : l.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px]">{l.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overtime" className="mt-4">
          <Card className="glass-card border-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Hours</TableHead><TableHead>Rate</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {employee.overtimes?.map((o: any) => (
                    <TableRow key={o.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm">{new Date(o.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm">{o.hours}h</TableCell>
                      <TableCell className="text-sm">₹{o.rate}/hr</TableCell>
                      <TableCell className="text-sm font-medium">₹{o.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
