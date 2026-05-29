'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Edit, Trash2, Eye, Download,
  Users, Building2, MapPin, Filter, Clock, IndianRupee,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useHRMSStore } from '@/lib/store';
import { toast } from 'sonner';

// ── Firm badge class map ──
const FIRM_BADGE_CLASS: Record<string, string> = {
  LAPL: 'firm-badge-lapl',
  LRSL: 'firm-badge-lrsl',
  SI: 'firm-badge-si',
  SDF: 'firm-badge-sdf',
  Roofing: 'firm-badge-roofing',
};

const FIRMS = ['LAPL', 'LRSL', 'SI', 'SDF'];
const LOCATIONS = ['Ajmer', 'Gurgaon', 'Palra Warehouse', 'Jaipur', 'Roofing Factory'];
const EMPLOYMENT_TYPES = ['Full Time', 'Part Time'];
const SALARY_TYPES = ['Hourly', 'Daily'];

// ── Employee type matching Prisma schema ──
interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  mobile: string | null;
  email: string | null;
  department: string;
  firm: string;
  location: string;
  designation: string;
  joiningDate: string;
  salaryType: string;
  basicSalary: number;
  monthlySalary: number;
  dailyRate: number;
  hourlyRate: number;
  overtimeRate: number;
  shiftStart: string;
  shiftEnd: string;
  shiftHours: number;
  employmentType: string;
  status: string;
  panNumber: string | null;
  aadhaarNumber: string | null;
  pfNumber: string | null;
  esiNumber: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankIfsc: string | null;
  address: string | null;
  reportingManager: string | null;
  emergencyContact: string | null;
}

const emptyForm = {
  fullName: '',
  mobile: '',
  email: '',
  department: '',
  location: 'Ajmer',
  designation: '',
  joiningDate: '',
  salaryType: 'Hourly',
  basicSalary: 0,
  shiftStart: '10:00',
  shiftEnd: '19:00',
  shiftHours: 9,
  employmentType: 'Full Time',
  status: 'Yes',
  address: '',
  bankName: '',
  bankAccount: '',
  bankIfsc: '',
  panNumber: '',
  aadhaarNumber: '',
  pfNumber: '',
  esiNumber: '',
  reportingManager: '',
  emergencyContact: '',
};

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFirm, setFilterFirm] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEmpType, setFilterEmpType] = useState('all');
  const [filterSalaryType, setFilterSalaryType] = useState('all');
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { setSelectedEmployeeId, selectedFirm } = useHRMSStore();

  // ── Load employees ──
  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const firmFilter = filterFirm !== 'all' ? filterFirm : (selectedFirm && selectedFirm !== '__all__' ? selectedFirm : '');
      if (firmFilter) params.set('firm', firmFilter);
      if (filterLocation !== 'all') params.set('location', filterLocation);
      if (filterStatus !== 'all') params.set('status', filterStatus === 'Active' ? 'Yes' : 'No');
      if (filterSalaryType !== 'all') params.set('salaryType', filterSalaryType === 'Hourly' ? 'hourly' : 'daily');
      const res = await fetch(`/api/employees?${params}`);
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load employees');
    }
    setLoading(false);
  }, [search, filterFirm, filterLocation, filterStatus, filterSalaryType, selectedFirm]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  // ── Auto-calculate OT Rate ──
  const calcOTRate = (basicSalary: number, shiftHours: number) => {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    if (shiftHours <= 0 || daysInMonth <= 0) return 0;
    return Math.round((basicSalary / (shiftHours * daysInMonth)) * 1.5 * 100) / 100;
  };

  // ── Handle form field change ──
  const handleFormChange = (field: string, value: any) => {
    const updated = { ...form, [field]: value };
    if (field === 'basicSalary' || field === 'shiftHours') {
      updated.overtimeRate = calcOTRate(
        field === 'basicSalary' ? Number(value) : updated.basicSalary,
        field === 'shiftHours' ? Number(value) : updated.shiftHours
      );
    }
    setForm(updated);
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!form.fullName || !form.department) {
      toast.error('Please fill required fields (Name & Firm)');
      return;
    }
    try {
      const payload = {
      ...form,
      firm: form.department, // API accepts both firm and department
      monthlySalary: Number(form.basicSalary), // API accepts both monthlySalary and basicSalary
      basicSalary: Number(form.basicSalary),
      shiftHours: Number(form.shiftHours),
    };
      if (editId) {
        const res = await fetch(`/api/employees/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        toast.success('Employee updated successfully');
      } else {
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
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

  // ── Edit ──
  const handleEdit = (emp: Employee) => {
    setEditId(emp.employeeId);
    setForm({
      fullName: emp.fullName,
      mobile: emp.mobile || '',
      email: emp.email || '',
      department: emp.department || emp.firm,
      location: emp.location || 'Ajmer',
      designation: emp.designation,
      joiningDate: emp.joiningDate?.split('T')[0] || '',
      salaryType: emp.salaryType,
      basicSalary: emp.basicSalary || emp.monthlySalary,
      shiftStart: emp.shiftStart,
      shiftEnd: emp.shiftEnd,
      shiftHours: emp.shiftHours || 9,
      employmentType: emp.employmentType || 'Full Time',
      status: emp.status,
      address: emp.address || '',
      bankName: emp.bankName || '',
      bankAccount: emp.bankAccount || '',
      bankIfsc: emp.bankIfsc || '',
      panNumber: emp.panNumber || '',
      aadhaarNumber: emp.aadhaarNumber || '',
      pfNumber: emp.pfNumber || '',
      esiNumber: emp.esiNumber || '',
      reportingManager: emp.reportingManager || '',
      emergencyContact: emp.emergencyContact || '',
    });
    setOpen(true);
  };

  // ── Delete (deactivate) ──
  const handleDelete = async (employeeId: string) => {
    try {
      await fetch(`/api/employees/${employeeId}`, { method: 'DELETE' });
      toast.success('Employee deactivated');
      loadEmployees();
    } catch {
      toast.error('Failed to deactivate employee');
    }
  };

  // ── Firm badge renderer ──
  const FirmBadge = ({ firm }: { firm: string }) => (
    <span className={`${FIRM_BADGE_CLASS[firm] || 'firm-badge-lapl'} whitespace-nowrap shrink-0`}>{firm}</span>
  );

  // ── Status badge ──
  const StatusBadge = ({ status }: { status: string }) => (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 ${
        status === 'Yes' || status === 'active'
          ? 'bg-gold/15 text-gold dark:text-gold border border-gold/20'
          : 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1 ${status === 'Yes' || status === 'active' ? 'bg-gold' : 'bg-red-500'}`} />
      {(status === 'Yes' || status === 'active') ? 'Active' : 'Inactive'}
    </span>
  );

  // ── Employment Type badge ──
  const EmpTypeBadge = ({ type }: { type: string }) => (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap shrink-0 ${
      type === 'Full Time'
        ? 'bg-gold/10 text-gold border border-gold/20'
        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
    }`}>
      {type}
    </span>
  );

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-gold" />
            Employee Management
          </h2>
          <p className="text-sm text-muted-foreground">
            {employees.length} employee{employees.length !== 1 ? 's' : ''} across Laxree Group
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info('Export feature coming soon')}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button
            className="gradient-laxree text-white gap-1.5"
            size="sm"
            onClick={() => {
              setForm(emptyForm);
              setEditId(null);
              setOpen(true);
            }}
          >
            <Plus className="w-4 h-4" /> Add Employee
          </Button>
        </div>
      </motion.div>

      {/* ── Filter Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card p-3"
      >
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9"
              placeholder="Search by name, ID, designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterFirm} onValueChange={setFilterFirm}>
            <SelectTrigger className="w-full sm:w-36 h-9">
              <Building2 className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Firms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Firms</SelectItem>
              {FIRMS.map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterLocation} onValueChange={setFilterLocation}>
            <SelectTrigger className="w-full sm:w-40 h-9">
              <MapPin className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {LOCATIONS.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSalaryType} onValueChange={setFilterSalaryType}>
            <SelectTrigger className="w-full sm:w-32 h-9">
              <SelectValue placeholder="Salary Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {SALARY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-32 h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* ── Employee Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass-card card-gold-hover border-0">
          <CardContent className="p-0">
            <ScrollArea className="max-h-[65vh]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-24">Emp ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Firm</TableHead>
                    <TableHead className="hidden lg:table-cell">Location</TableHead>
                    <TableHead className="hidden md:table-cell">Salary Type</TableHead>
                    <TableHead className="hidden sm:table-cell">Hourly Rate</TableHead>
                    <TableHead className="hidden sm:table-cell">Emp. Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 bg-muted/50 rounded animate-pulse" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        No employees found
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((emp, i) => (
                      <motion.tr
                        key={emp.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setSelectedEmployeeId(emp.employeeId)}
                      >
                        <TableCell className="font-mono text-xs text-gold font-semibold whitespace-nowrap">
                          {emp.employeeId}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full gradient-laxree flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {emp.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 overflow-hidden">
                              <p className="font-medium text-sm truncate">{emp.fullName}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{emp.designation}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <FirmBadge firm={emp.department || emp.firm} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground truncate max-w-[120px]">
                          {emp.location}
                        </TableCell>
                        <TableCell className="hidden md:table-cell whitespace-nowrap">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                            {emp.salaryType}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm font-mono whitespace-nowrap">
                          {emp.hourlyRate > 0 ? `₹${emp.hourlyRate.toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <EmpTypeBadge type={emp.employmentType || 'Full Time'} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={emp.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setSelectedEmployeeId(emp.employeeId)}
                              title="View Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEdit(emp)}
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(emp.employeeId)}
                              title="Deactivate"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Add/Edit Dialog ── */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyForm); setEditId(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gold" />
              {editId ? 'Edit Employee' : 'Add New Employee'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            {/* Personal Info */}
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Personal Information</p>
            </div>
            <div>
              <Label>Full Name *</Label>
              <Input value={form.fullName} onChange={(e) => handleFormChange('fullName', e.target.value)} placeholder="Enter full name" />
            </div>
            <div>
              <Label>Mobile</Label>
              <Input value={form.mobile} onChange={(e) => handleFormChange('mobile', e.target.value)} placeholder="Mobile number" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => handleFormChange('email', e.target.value)} placeholder="Email address" />
            </div>
            <div>
              <Label>Emergency Contact</Label>
              <Input value={form.emergencyContact} onChange={(e) => handleFormChange('emergencyContact', e.target.value)} placeholder="Emergency contact" />
            </div>

            {/* Employment Info */}
            <div className="sm:col-span-2 mt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Employment Details</p>
            </div>
            <div>
              <Label>Firm / Department *</Label>
              <Select value={form.department} onValueChange={(v) => handleFormChange('department', v)}>
                <SelectTrigger><SelectValue placeholder="Select firm" /></SelectTrigger>
                <SelectContent>
                  {FIRMS.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location</Label>
              <Select value={form.location} onValueChange={(v) => handleFormChange('location', v)}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Designation</Label>
              <Input value={form.designation} onChange={(e) => handleFormChange('designation', e.target.value)} placeholder="Designation" />
            </div>
            <div>
              <Label>Joining Date</Label>
              <Input type="date" value={form.joiningDate} onChange={(e) => handleFormChange('joiningDate', e.target.value)} />
            </div>
            <div>
              <Label>Employment Type</Label>
              <Select value={form.employmentType} onValueChange={(v) => handleFormChange('employmentType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => handleFormChange('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Active</SelectItem>
                  <SelectItem value="No">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reporting Manager</Label>
              <Input value={form.reportingManager} onChange={(e) => handleFormChange('reportingManager', e.target.value)} placeholder="Manager name" />
            </div>

            {/* Salary Info */}
            <div className="sm:col-span-2 mt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Salary & Shift</p>
            </div>
            <div>
              <Label>Salary Type</Label>
              <Select value={form.salaryType} onValueChange={(v) => handleFormChange('salaryType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SALARY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monthly Salary (₹)</Label>
              <Input
                type="number"
                value={form.basicSalary}
                onChange={(e) => handleFormChange('basicSalary', e.target.value)}
              />
            </div>
            <div>
              <Label>OT Rate (₹/hr) <span className="text-muted-foreground font-normal">— auto-calculated (1.5x)</span></Label>
              <Input
                type="number"
                value={calcOTRate(form.basicSalary, form.shiftHours)}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label>Shift Start</Label>
              <Input type="time" value={form.shiftStart} onChange={(e) => handleFormChange('shiftStart', e.target.value)} />
            </div>
            <div>
              <Label>Shift End</Label>
              <Input type="time" value={form.shiftEnd} onChange={(e) => handleFormChange('shiftEnd', e.target.value)} />
            </div>

            {/* Statutory Info */}
            <div className="sm:col-span-2 mt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Statutory & Bank Details</p>
            </div>
            <div>
              <Label>PAN Number</Label>
              <Input value={form.panNumber} onChange={(e) => handleFormChange('panNumber', e.target.value)} placeholder="PAN" />
            </div>
            <div>
              <Label>Aadhaar Number</Label>
              <Input value={form.aadhaarNumber} onChange={(e) => handleFormChange('aadhaarNumber', e.target.value)} placeholder="Aadhaar" />
            </div>
            <div>
              <Label>PF Number</Label>
              <Input value={form.pfNumber} onChange={(e) => handleFormChange('pfNumber', e.target.value)} placeholder="PF" />
            </div>
            <div>
              <Label>ESI Number</Label>
              <Input value={form.esiNumber} onChange={(e) => handleFormChange('esiNumber', e.target.value)} placeholder="ESI" />
            </div>
            <div>
              <Label>Bank Name</Label>
              <Input value={form.bankName} onChange={(e) => handleFormChange('bankName', e.target.value)} placeholder="Bank name" />
            </div>
            <div>
              <Label>Bank Account</Label>
              <Input value={form.bankAccount} onChange={(e) => handleFormChange('bankAccount', e.target.value)} placeholder="Account number" />
            </div>
            <div>
              <Label>IFSC Code</Label>
              <Input value={form.bankIfsc} onChange={(e) => handleFormChange('bankIfsc', e.target.value)} placeholder="IFSC" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="gradient-laxree text-white" onClick={handleSubmit}>
              {editId ? 'Update' : 'Add'} Employee
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
