'use client';

import { useEffect, useState, useCallback, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Edit, Trash2, Eye, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHRMSStore } from '@/lib/store';
import { toast } from 'sonner';

interface Employee {
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
}

const emptyForm = {
  fullName: '', mobile: '', email: '', department: '', designation: '',
  joiningDate: '', salaryType: 'monthly', basicSalary: 0, overtimeRate: 0,
  shiftStart: '09:00', shiftEnd: '18:00', shiftHours: 9, address: '',
  bankName: '', bankAccount: '', bankIfsc: '', panNumber: '', aadhaarNumber: '',
  pfNumber: '', esiNumber: '', reportingManager: '', emergencyContact: '',
};

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { setSelectedEmployeeId } = useHRMSStore();

  const loadEmployees = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterDept) params.set('department', filterDept);
    const res = await fetch(`/api/employees?${params}`);
    const data = await res.json();
    setEmployees(data);
  }, [search, filterDept]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  const handleSubmit = async () => {
    if (!form.fullName || !form.department || !form.designation) {
      toast.error('Please fill required fields');
      return;
    }
    try {
      if (editId) {
        await fetch(`/api/employees/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        toast.success('Employee updated successfully');
      } else {
        await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        toast.success('Employee added successfully');
      }
      setForm(emptyForm);
      setEditId(null);
      setOpen(false);
      loadEmployees();
    } catch {
      toast.error('Failed to save employee');
    }
  };

  const handleEdit = (emp: Employee) => {
    setEditId(emp.employeeId);
    setForm({
      fullName: emp.fullName,
      mobile: emp.mobile || '',
      email: emp.email || '',
      department: emp.department,
      designation: emp.designation,
      joiningDate: emp.joiningDate?.split('T')[0] || '',
      salaryType: emp.salaryType,
      basicSalary: emp.basicSalary,
      overtimeRate: emp.overtimeRate,
      shiftStart: emp.shiftStart,
      shiftEnd: emp.shiftEnd,
      shiftHours: 9,
      address: '',
      bankName: '',
      bankAccount: '',
      bankIfsc: '',
      panNumber: emp.panNumber || '',
      aadhaarNumber: emp.aadhaarNumber || '',
      pfNumber: emp.pfNumber || '',
      esiNumber: emp.esiNumber || '',
      reportingManager: '',
      emergencyContact: '',
    });
    setOpen(true);
  };

  const handleDelete = async (employeeId: string) => {
    await fetch(`/api/employees/${employeeId}`, { method: 'DELETE' });
    toast.success('Employee archived');
    loadEmployees();
  };

  const departments = [...new Set(employees.map(e => e.department))];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Employee Management</h2>
          <p className="text-sm text-muted-foreground">{employees.length} employees found</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyForm); setEditId(null); } }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div><Label>Full Name *</Label><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Enter full name" /></div>
              <div><Label>Mobile</Label><Input value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} placeholder="Mobile number" /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email address" /></div>
              <div>
                <Label>Department *</Label>
                <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {['Engineering', 'Marketing', 'Finance', 'Human Resources', 'Operations'].map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Designation *</Label><Input value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="Designation" /></div>
              <div><Label>Joining Date</Label><Input type="date" value={form.joiningDate} onChange={e => setForm({ ...form, joiningDate: e.target.value })} /></div>
              <div>
                <Label>Salary Type</Label>
                <Select value={form.salaryType} onValueChange={v => setForm({ ...form, salaryType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="daily">Daily Wage</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Basic Salary (₹)</Label><Input type="number" value={form.basicSalary} onChange={e => setForm({ ...form, basicSalary: Number(e.target.value) })} /></div>
              <div><Label>Overtime Rate (₹/hr)</Label><Input type="number" value={form.overtimeRate} onChange={e => setForm({ ...form, overtimeRate: Number(e.target.value) })} /></div>
              <div><Label>Shift Start</Label><Input type="time" value={form.shiftStart} onChange={e => setForm({ ...form, shiftStart: e.target.value })} /></div>
              <div><Label>Shift End</Label><Input type="time" value={form.shiftEnd} onChange={e => setForm({ ...form, shiftEnd: e.target.value })} /></div>
              <div><Label>PAN Number</Label><Input value={form.panNumber} onChange={e => setForm({ ...form, panNumber: e.target.value })} placeholder="PAN" /></div>
              <div><Label>Aadhaar Number</Label><Input value={form.aadhaarNumber} onChange={e => setForm({ ...form, aadhaarNumber: e.target.value })} placeholder="Aadhaar" /></div>
              <div><Label>PF Number</Label><Input value={form.pfNumber} onChange={e => setForm({ ...form, pfNumber: e.target.value })} placeholder="PF" /></div>
              <div><Label>ESI Number</Label><Input value={form.esiNumber} onChange={e => setForm({ ...form, esiNumber: e.target.value })} placeholder="ESI" /></div>
              <div><Label>Bank Name</Label><Input value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} /></div>
              <div><Label>Bank Account</Label><Input value={form.bankAccount} onChange={e => setForm({ ...form, bankAccount: e.target.value })} /></div>
              <div><Label>IFSC Code</Label><Input value={form.bankIfsc} onChange={e => setForm({ ...form, bankIfsc: e.target.value })} /></div>
              <div><Label>Reporting Manager</Label><Input value={form.reportingManager} onChange={e => setForm({ ...form, reportingManager: e.target.value })} /></div>
              <div><Label>Emergency Contact</Label><Input value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="gradient-primary text-white" onClick={handleSubmit}>{editId ? 'Update' : 'Add'} Employee</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Departments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="glass-card border-0">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[65vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Emp ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Department</TableHead>
                  <TableHead className="hidden md:table-cell">Designation</TableHead>
                  <TableHead className="hidden lg:table-cell">Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp, i) => (
                  <motion.tr
                    key={emp.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border/50 hover:bg-muted/30 cursor-pointer"
                    onClick={() => setSelectedEmployeeId(emp.employeeId)}
                  >
                    <TableCell className="font-mono text-xs text-primary">{emp.employeeId}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{emp.fullName}</p>
                        <p className="text-xs text-muted-foreground">{emp.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{emp.department}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{emp.designation}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm font-medium">₹{emp.basicSalary.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={emp.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                        {emp.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedEmployeeId(emp.employeeId)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(emp)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(emp.employeeId)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
