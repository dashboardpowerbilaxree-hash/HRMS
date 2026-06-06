'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Clock, CheckCircle, XCircle, AlertTriangle, Timer,
  CalendarDays, Search, Building2, Info, MapPin, X,
  Upload, FileSpreadsheet, Pencil, Trash2,
  Download, FileDown, ChevronRight, Users
} from 'lucide-react';
// xlsx-js-style moved to server-side API routes for reliable export
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import Image from 'next/image';

// ── Firm badge class map ──
const FIRM_BADGE_CLASS: Record<string, string> = {
  LAPL: 'firm-badge-lapl',
  LRSL: 'firm-badge-lrsl',
  SI: 'firm-badge-si',
  SDF: 'firm-badge-sdf',
  Roofing: 'firm-badge-roofing',
};

const FIRM_NAMES: Record<string, string> = {
  LAPL: 'LAXREE AMENITIES PVT LTD',
  LRSL: 'LAXREE ROOFING SOLUTION',
  SI: 'SMARTH INTERNATIONAL',
  SDF: 'SANGRAH DECOR & FURNITURE',
};

const FIRM_LOGOS: Record<string, string> = {
  LAPL: '/logos/lapl.jpg',
  LRSL: '/logos/lrsl.jpg',
  SI: '/logos/si.png',
  SDF: '/logos/sdf.png',
};

// ── Convert decimal hours to HH.MM display format ──
// e.g., 6.25 → "6.15", 9.5 → "9.30", 8.0 → "8.00"
function formatHours(decimal: number): string {
  if (!decimal || decimal === 0) return '0.00';
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  if (minutes >= 60) return `${hours + 1}.00`;
  return `${hours}.${String(minutes).padStart(2, '0')}`;
}

// ── Display a value that's already in HH.MM format (e.g., 5.25 = 5h 25min) ──
// Just format with 2 decimal places
function displayHHMM(value: number | undefined | null): string {
  if (!value && value !== 0) return '0.00';
  return value.toFixed(2);
}

// ── Get firm code from employee ID prefix ──
function getFirmFromEmployeeId(employeeId: string): string {
  const id = employeeId.toUpperCase();
  if (id.startsWith('LAPL')) return 'LAPL';
  if (id.startsWith('LRSL')) return 'LRSL';
  if (id.startsWith('SI-') || id.startsWith('SI0')) return 'SI';
  if (id.startsWith('SDF')) return 'SDF';
  return ''; // fallback to existing department/firm
}

const FIRMS = ['LAPL', 'LRSL', 'SI', 'SDF'];
const LOCATIONS = ['Ajmer', 'Gurgaon', 'Palra Warehouse', 'Jaipur', 'Roofing Factory'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Attendance Record Type ──
interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  totalHours: number;
  status: string;
  lateEntry: boolean;
  earlyOut: boolean;
  halfDay: boolean;
  overtimeHours: number;
  isSunday: boolean;
  isPH: boolean;
  sundayHours: number;
  employee?: {
    fullName: string;
    employeeId: string;
    department: string;
    designation: string;
    location: string;
  };
}

// ── Monthly Summary Type ──
interface MonthlySummary {
  employee: {
    fullName: string;
    employeeId: string;
    firm: string;
    firmFullName?: string;
    location: string;
    department: string;
    designation: string;
    shiftHours: number;
    employmentType?: string;
    hourlyRate?: number;
    monthlySalary?: number;
    overtimeRate?: number;
  };
  month: number;
  year: number;
  monthName: string;
  daysInMonth: number;
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  paidLeaves?: number;
  annualLeaves?: number;
  unpaidLeaves?: number;
  halfDays: number;
  holidayDays: number;
  weeklyOffs: number;
  sundays: number;
  totalAttendance: number;
  totalWorkHours: number;
  totalOvertimeHours: number;
  totalSundayHours: number;
  totalHrsInclSunday?: number;
  lateEntries: number;
  earlyOuts?: number;
  records: AttendanceRecord[];
  // Salary calculation fields (from monthly-summary API)
  perDayRate?: number;
  calculatedHourlyRate?: number;
  calculatedBaseSalary?: number;
  calculatedOtAmount?: number;
  calculatedGrossSalary?: number;
}

// ── Animated Counter ──
function AnimatedCounter({ value, prefix = '', suffix = '', decimals = 0 }: {
  value: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 1000;
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  if (decimals > 0) {
    return <span>{prefix}{display.toFixed(decimals)}{suffix}</span>;
  }
  return <span>{prefix}{Math.round(display).toLocaleString()}{suffix}</span>;
}

// ── Status badge with colors ──
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    present: { bg: 'bg-emerald-500/15 border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', label: 'Present' },
    late: { bg: 'bg-yellow-500/15 border-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400', label: 'Late' },
    'early-out': { bg: 'bg-rose-500/15 border-rose-500/20', text: 'text-rose-600 dark:text-rose-400', label: 'Early Out' },
    absent: { bg: 'bg-red-500/15 border-red-500/20', text: 'text-red-600 dark:text-red-400', label: 'Absent' },
    'half-day': { bg: 'bg-orange-500/15 border-orange-500/20', text: 'text-orange-600 dark:text-orange-400', label: 'Half-Day' },
    holiday: { bg: 'bg-purple-500/15 border-purple-500/20', text: 'text-purple-600 dark:text-purple-400', label: 'Holiday' },
    'weekly-off': { bg: 'bg-blue-500/15 border-blue-500/20', text: 'text-blue-600 dark:text-blue-400', label: 'Weekly Off' },
  };
  const s = config[status] || { bg: 'bg-muted border-border', text: 'text-muted-foreground', label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

// ── Firm badge ──
function FirmBadge({ firm }: { firm: string }) {
  return <span className={`${FIRM_BADGE_CLASS[firm] || 'firm-badge-lapl'} whitespace-nowrap shrink-0`}>{firm}</span>;
}

export function AttendanceTracker() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState({
    present: 0, absent: 0, late: 0, earlyOut: 0, halfDay: 0, ot: 0,
  });
  const [employees, setEmployees] = useState<{ employeeId: string; fullName: string; department: string; location: string; firm: string; shiftStart: string; shiftEnd: string; shiftHours: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: '', date: '', checkIn: '', checkOut: '' });
  const [employeeSearch, setEmployeeSearch] = useState('');

  // ── Filters ──
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [filterFirm, setFilterFirm] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [searchEmployee, setSearchEmployee] = useState('');

  // ── Daily tab: date filter + status filter ──
  const [filterDate, setFilterDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [statusFilter, setStatusFilter] = useState<string>('all'); // 'all' | 'present' | 'absent' | 'late' | 'early-out' | 'ot'

  // ── Edit state ──
  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState({ checkIn: '', checkOut: '' });

  // ── Monthly Summary state ──
  const [monthlyEmpId, setMonthlyEmpId] = useState('');
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // ── Import state ──
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importDate, setImportDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // If a specific date is selected, use date filter; otherwise use month/year
      if (filterDate) {
        params.set('date', filterDate);
      } else {
        params.set('month', filterMonth);
        params.set('year', filterYear);
      }
      if (filterFirm !== 'all') params.set('department', filterFirm);
      if (filterLocation !== 'all') params.set('location', filterLocation);

      const [attRes, empRes] = await Promise.all([
        fetch(`/api/attendance?${params}`),
        fetch('/api/employees?status=Yes'),
      ]);
      const attData = await attRes.json();
      const empData = await empRes.json();

      const recs: AttendanceRecord[] = attData.records || attData;
      setRecords(recs);
      setEmployees(empData.map((e: any) => ({
        employeeId: e.employeeId,
        fullName: e.fullName,
        department: e.department,
        location: e.location,
        firm: e.firm,
        shiftStart: e.shiftStart || '10:00',
        shiftEnd: e.shiftEnd || '19:00',
        shiftHours: e.shiftHours || 9,
      })));

      const summ = attData.summary || {};
      setSummary({
        present: summ.present || recs.filter((a: any) => ['present', 'late', 'early-out'].includes(a.status)).length,
        absent: summ.absent || recs.filter((a: any) => a.status === 'absent').length,
        late: summ.late || recs.filter((a: any) => a.lateEntry).length,
        earlyOut: summ.earlyOuts || recs.filter((a: any) => a.earlyOut).length,
        halfDay: summ.halfDay || recs.filter((a: any) => a.halfDay).length,
        ot: Math.round((summ.totalOvertimeHours || recs.reduce((s: number, a: any) => s + a.overtimeHours, 0)) * 100) / 100,
      });
    } catch {
      toast.error('Failed to load attendance data');
    }
    setLoading(false);
  }, [filterDate, filterMonth, filterYear, filterFirm, filterLocation]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Filtered records by employee search + status filter ──
  const filteredRecords = useMemo(() => {
    let filtered = records;
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'present') {
        filtered = filtered.filter((r) => ['present', 'late', 'early-out'].includes(r.status));
      } else if (statusFilter === 'absent') {
        filtered = filtered.filter((r) => r.status === 'absent');
      } else if (statusFilter === 'late') {
        filtered = filtered.filter((r) => r.lateEntry);
      } else if (statusFilter === 'early-out') {
        filtered = filtered.filter((r) => r.earlyOut);
      } else if (statusFilter === 'ot') {
        filtered = filtered.filter((r) => r.overtimeHours > 0);
      }
    }
    // Employee search
    if (searchEmployee) {
      const q = searchEmployee.toLowerCase();
      filtered = filtered.filter((r) =>
        r.employee?.fullName?.toLowerCase().includes(q) ||
        r.employeeId.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [records, searchEmployee, statusFilter]);

  // ── Mark attendance submit ──
  const handleSubmit = async () => {
    if (!form.employeeId || !form.date) {
      toast.error('Please select employee and date');
      return;
    }
    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      toast.success('Attendance recorded successfully');
      setOpen(false);
      setForm({ employeeId: '', date: '', checkIn: '', checkOut: '' });
      setEmployeeSearch('');
      loadData();
    } catch {
      toast.error('Failed to record attendance');
    }
  };

  // ── Edit attendance ──
  const handleEdit = (rec: AttendanceRecord) => {
    setEditRecord(rec);
    setEditForm({ checkIn: rec.checkIn || '', checkOut: rec.checkOut || '' });
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editRecord) return;
    try {
      const res = await fetch(`/api/attendance/${editRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        toast.success('Attendance updated successfully');
        setEditOpen(false);
        setEditRecord(null);
        loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update');
      }
    } catch {
      toast.error('Failed to update attendance');
    }
  };

  // ── Delete attendance ──
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this attendance record?')) return;
    try {
      const res = await fetch(`/api/attendance/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Attendance record deleted');
        loadData();
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  // ── Load Monthly Summary ──
  const loadMonthlySummary = useCallback(async () => {
    if (!monthlyEmpId) return;
    setMonthlyLoading(true);
    try {
      const res = await fetch(`/api/attendance/monthly-summary?employeeId=${monthlyEmpId}&month=${filterMonth}&year=${filterYear}`);
      if (res.ok) {
        const data = await res.json();
        setMonthlySummary(data);
      } else {
        setMonthlySummary(null);
      }
    } catch {
      toast.error('Failed to load monthly summary');
      setMonthlySummary(null);
    }
    setMonthlyLoading(false);
  }, [monthlyEmpId, filterMonth, filterYear]);

  useEffect(() => { loadMonthlySummary(); }, [loadMonthlySummary]);

  // ── Export Daily Attendance — via server-side API ──
  const handleExportDailyExcel = async () => {
    if (filteredRecords.length === 0) {
      toast.error('No records to export');
      return;
    }
    try {
      const params = new URLSearchParams();
      if (filterDate) params.set('date', filterDate);
      else { params.set('month', filterMonth); params.set('year', filterYear); }
      if (filterFirm !== 'all') params.set('department', filterFirm);
      if (filterLocation !== 'all') params.set('location', filterLocation);

      const res = await fetch(`/api/attendance/export-daily?${params}`);
      if (!res.ok) { toast.error('Export failed'); return; }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Daily_Attendance_${MONTHS[parseInt(filterMonth) - 1]}_${filterYear}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Daily Attendance Excel downloaded successfully!');
    } catch (err) {
      console.error('Daily export error:', err);
      toast.error('Export failed. Please try again.');
    }
  };

  // ── Export Monthly Attendance Register — via server-side API ──
  const handleExportExcel = async () => {
    if (!monthlySummary) return;
    try {
      const params = new URLSearchParams({
        employeeId: monthlyEmpId,
        month: filterMonth,
        year: filterYear,
      });
      const res = await fetch(`/api/attendance/export-monthly?${params}`);
      if (!res.ok) { toast.error('Export failed'); return; }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Monthly_Attendance_${monthlySummary.employee.fullName}_${monthlySummary.monthName}_${monthlySummary.year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Monthly Attendance Excel downloaded successfully!');
    } catch (err) {
      console.error('Monthly export error:', err);
      toast.error('Export failed. Please try again.');
    }
  };

  // ── Convert Excel serial date to YYYY-MM-DD ──
  const excelSerialToDate = (serial: number): string => {
    // Excel serial date: days since Jan 1, 1900 (with the 1900 leap year bug)
    const epoch = new Date(1899, 11, 30); // Dec 30, 1899 is day 0
    const date = new Date(epoch.getTime() + serial * 86400000);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // ── Convert Excel decimal time to HH:MM ──
  const excelDecimalToTime = (value: any): string => {
    if (typeof value === 'string') {
      // Already a string - check if it looks like HH:MM
      const trimmed = value.trim();
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) return trimmed.substring(0, 5);
      // Try parsing as number
      const num = parseFloat(trimmed);
      if (!isNaN(num) && num >= 0 && num < 1) {
        const totalMinutes = Math.round(num * 1440);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
      return trimmed;
    }
    if (typeof value === 'number') {
      if (value >= 1) {
        // Could be a full datetime serial - extract time portion
        const timePart = value - Math.floor(value);
        const totalMinutes = Math.round(timePart * 1440);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
      // Decimal time fraction (0 to <1)
      const totalMinutes = Math.round(value * 1440);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    return String(value || '');
  };

  // ── Parse any date value to YYYY-MM-DD ──
  const parseDateValue = (value: any): string => {
    if (!value && value !== 0) return '';
    if (typeof value === 'number') {
      // Excel serial date number
      return excelSerialToDate(value);
    }
    const str = String(value).trim();
    if (!str) return '';
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    // Try DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
    // Try MM/DD/YYYY
    const mdyMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (mdyMatch) return `${mdyMatch[3]}-${mdyMatch[1].padStart(2, '0')}-${mdyMatch[2].padStart(2, '0')}`;
    // Fallback: try native Date parse
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    } catch {}
    return str;
  };

  // ── Smart Employee ID matching ──
  const smartMatchEmployeeId = (rawId: string, empName: string): string => {
    if (!rawId && !empName) return '';
    let empId = String(rawId).trim();

    // If we have an ID, try exact match first
    if (empId) {
      // Try exact match
      const exact = employees.find(e => e.employeeId === empId);
      if (exact) return exact.employeeId;

      // Try with EMP- prefix (e.g., "41" → "EMP-041" or "EMP-41")
      const withPrefix = `EMP-${empId.padStart(3, '0')}`;
      const matchPad = employees.find(e => e.employeeId === withPrefix);
      if (matchPad) return matchPad.employeeId;

      const withoutPad = `EMP-${empId}`;
      const matchNoPad = employees.find(e => e.employeeId === withoutPad);
      if (matchNoPad) return matchNoPad.employeeId;
    }

    // Match by employee name
    if (empName) {
      const nameLower = empName.toLowerCase().trim();
      // Exact name match
      const exactName = employees.find(e => e.fullName.toLowerCase() === nameLower);
      if (exactName) return exactName.employeeId;
      // Partial name match
      const partialName = employees.find(e =>
        e.fullName.toLowerCase().includes(nameLower) || nameLower.includes(e.fullName.toLowerCase())
      );
      if (partialName) return partialName.employeeId;
    }

    return empId; // Return whatever we have
  };

  // ── File upload handler ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportResult(null);

    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { cellDates: false, raw: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      // Use raw:true to get actual values, then we convert ourselves
      const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

      if (data.length === 0) {
        toast.error('No data found in the file');
        return;
      }

      // Try to map columns - look for common column names (supports both old and new template formats)
      const mapped = data.map((row: any) => {
        // Get raw values from various possible column names
        const rawEmpId = row['E. Code'] || row['ECode'] || row['Emp Code'] || row['Employee Code'] || row['Employee_Code'] ||
          row['Employee ID'] || row['employeeId'] || row['Employee_Code'] || row['EMP ID'] || row['Emp ID'] || row['Emp_Code'] || '';
        const rawEmpName = row['Name'] || row['Employee Name'] || row['fullName'] || row['Employee_Name'] || row['Emp Name'] || '';
        const rawDate = row['Date'] || row['date'] || row['Attendance Date'] || row['Att Date'] || '';
        const rawCheckIn = row[' InTime'] || row['InTime'] || row['In Time'] || row['Check In'] || row['checkIn'] || row['In_Time'] || row['IN'] || row['Time In'] || '';
        const rawCheckOut = row[' OutTime'] || row['OutTime'] || row['Out Time'] || row['Check Out'] || row['checkOut'] || row['Out_Time'] || row['OUT'] || row['Time Out'] || '';
        const rawShift = row['Shift'] || row['shift'] || '';
        const rawStatus = row['Status'] || row['status'] || '';
        const rawRemarks = row['Remarks'] || row['remarks'] || row['Remark'] || row['remark'] || '';

        // Convert values
        const empId = String(rawEmpId).trim();
        const empName = String(rawEmpName).trim();
        const date = parseDateValue(rawDate);
        const checkIn = excelDecimalToTime(rawCheckIn);
        const checkOut = excelDecimalToTime(rawCheckOut);
        const shift = String(rawShift).trim();
        const status = String(rawStatus).trim();
        const remarks = String(rawRemarks).trim();

        return { employeeId: empId, employeeName: empName, date, checkIn, checkOut, shift, status, remarks };
      }).filter(r => r.employeeId || r.employeeName);

      setImportPreview(mapped);
    } catch (err: any) {
      toast.error('Failed to parse file: ' + err.message);
    }
  };

  // ── Download Excel Template ──
  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    // Helper: format shift as "HH-HH" (e.g., "10-19" from shiftStart "10:00" and shiftEnd "19:00")
    const formatShift = (start: string, end: string): string => {
      const startH = start?.split(':')[0] || '10';
      const endH = end?.split(':')[0] || '19';
      return `${startH}-${endH}`;
    };

    // ── Sheet 1: DailyAttendance_BasicReport ──
    // Template format matching the uploaded Laxree template:
    // Header row + empty rows with just SNo (E. Code/Name/Shift left blank for manual fill)
    const totalRows = employees.length > 0 ? employees.length : 35;
    const templateData: (string | number | null)[][] = [
      ['SNo', 'E. Code', 'Name', 'Shift', 'InTime', 'OutTime', 'Work Dur.', 'OT', 'Tot. Dur.', 'Status', 'Remarks'],
    ];
    for (let i = 1; i <= totalRows; i++) {
      templateData.push([i, null, null, null, '', '', '', '', '', '', '']);
    }

    const ws = XLSX.utils.aoa_to_sheet(templateData);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },   // SNo
      { wch: 12 },  // E. Code
      { wch: 22 },  // Name
      { wch: 10 },  // Shift
      { wch: 10 },  // InTime
      { wch: 10 },  // OutTime
      { wch: 10 },  // Work Dur.
      { wch: 8 },   // OT
      { wch: 10 },  // Tot. Dur.
      { wch: 12 },  // Status
      { wch: 18 },  // Remarks
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'DailyAttendance_BasicReport');

    // ── Sheet 2: Instructions ──
    const instructionsData = [
      ['Laxree HRMS - Daily Attendance Upload Template Instructions'],
      [''],
      ['This template is for importing daily attendance data. Select the Attendance Date in the Import tab before uploading.'],
      [''],
      ['Column Descriptions:'],
      ['Column', 'Format', 'Required', 'Example', 'Notes'],
      ['SNo', 'Number', 'Auto', '1', 'Serial number — auto-filled, no need to change.'],
      ['E. Code', 'EMP-XXX or numeric', 'Yes (or Name)', 'EMP-041', 'Employee code as in HRMS (e.g., EMP-041). Numeric codes like 7 will be auto-matched to EMP-007. If unknown, leave blank and provide Name.'],
      ['Name', 'Text', 'Yes (or E. Code)', 'Kulvinder', 'Employee name — used to match if E. Code not found. Must match the name in the system.'],
      ['Shift', 'HH-HH', 'Auto-filled', '10-19', 'Pre-filled from employee shift data. "NS" = Night Shift. You can override if needed. For reference only — not required for import.'],
      ['InTime', 'HH:MM (24hr)', 'No', '09:30', 'Check-in time in 24-hour format (e.g., 09:30, 14:00, 19:30). Leave blank if absent.'],
      ['OutTime', 'HH:MM (24hr)', 'No', '18:30', 'Check-out time in 24-hour format. Leave blank if absent or not checked out.'],
      ['Work Dur.', 'HH.MM', 'Auto', '9.00', 'Auto-calculated from InTime/OutTime — leave blank for import.'],
      ['OT', 'HH.MM', 'Auto', '1.30', 'Auto-calculated overtime — leave blank for import.'],
      ['Tot. Dur.', 'HH.MM', 'Auto', '9.00', 'Auto-calculated total duration — leave blank for import.'],
      ['Status', 'Text', 'No', 'Late', 'Leave blank for auto-calculation. Use: Present, Late, Half-Day, Absent if needed.'],
      ['Remarks', 'Text', 'No', 'Came late', 'Any notes or remarks for the record.'],
      [''],
      ['Important Notes:'],
      ['1. This is a DAILY template — select the Attendance Date in the Import tab before uploading. No Date column is needed per row.'],
      ['2. E. Code format: Use the system format (e.g., EMP-041, NOT just 41). Numeric codes will be auto-matched (7 → EMP-007).'],
      ['3. Time format: Use HH:MM in 24-hour format (e.g., 09:30, 18:45). Do NOT use AM/PM.'],
      ['4. If InTime and OutTime are blank, the system will mark as Absent.'],
      ['5. Work Dur., OT, and Tot. Dur. are auto-calculated — leave them blank when filling the template.'],
      ['6. The system auto-calculates: Working Hours, Late Entry, Overtime, Half Day, Sunday, Holiday.'],
      ['7. Refer to the Employee List sheet for correct E. Code, Name, and Shift of each employee.'],
      ['8. Save as .xlsx or .csv before uploading.'],
      ['9. The system will auto-match employees by E. Code first, then by Name.'],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(instructionsData);
    ws2['!cols'] = [
      { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 80 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');

    // ── Sheet 3: Employee List (reference for filling the main sheet) ──
    const empListData: (string | number)[][] = [
      ['E. Code', 'Employee Name', 'Company', 'Location', 'Shift'],
    ];
    if (employees.length > 0) {
      employees.forEach(e => {
        empListData.push([e.employeeId, e.fullName, e.firm || e.department, e.location, formatShift(e.shiftStart, e.shiftEnd)]);
      });
    } else {
      // Fallback sample
      empListData.push(['EMP-001', 'John Doe', 'LAPL', 'Ajmer', '10-19']);
      empListData.push(['EMP-002', 'Jane Smith', 'LRSL', 'Gurgaon', '10-19']);
    }
    const ws3 = XLSX.utils.aoa_to_sheet(empListData);
    ws3['!cols'] = [{ wch: 14 }, { wch: 25 }, { wch: 12 }, { wch: 18 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Employee List');

    XLSX.writeFile(wb, 'Laxree_Attendance_Template.xlsx');
    toast.success('Template downloaded! Fill it and upload.');
  };

  // ── Process import ──
  const handleProcessImport = async () => {
    if (importPreview.length === 0) return;
    setImporting(true);

    try {
      // Use smart matching for employee IDs
      const recordsToImport = importPreview.map((row) => {
        const empId = smartMatchEmployeeId(row.employeeId, row.employeeName);
        // Use row date if available, otherwise fall back to the selected importDate
        const date = row.date || importDate;
        return {
          employeeId: empId,
          date,
          checkIn: row.checkIn || '',
          checkOut: row.checkOut || '',
        };
      }).filter(r => r.employeeId && r.date);

      if (recordsToImport.length === 0) {
        toast.error('No valid records found. Ensure Employee IDs or Names match the system.');
        setImporting(false);
        return;
      }

      const res = await fetch('/api/attendance/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: recordsToImport }),
      });
      const data = await res.json();

      if (res.ok) {
        setImportResult(data);
        toast.success(`Processed ${data.successCount} records successfully!`);
        loadData();
      } else {
        toast.error(data.error || 'Import failed');
      }
    } catch (err: any) {
      toast.error('Import failed: ' + err.message);
    }
    setImporting(false);
  };

  // ── Summary cards config — clickable for daily tab ──
  const statCards = [
    { title: 'Present', value: summary.present, icon: CheckCircle, gradient: 'gradient-success', color: 'text-emerald-500', filter: 'present' },
    { title: 'Absent', value: summary.absent, icon: XCircle, gradient: 'gradient-danger', color: 'text-red-500', filter: 'absent' },
    { title: 'Late', value: summary.late, icon: AlertTriangle, gradient: 'gradient-warning', color: 'text-yellow-500', filter: 'late' },
    { title: 'Early Out', value: summary.earlyOut, icon: Clock, gradient: 'gradient-rose', color: 'text-rose-500', filter: 'early-out' },
    { title: 'OT Hours', value: summary.ot, icon: Timer, gradient: 'gradient-info', color: 'text-cyan-500', isHours: true, filter: 'ot' },
  ];

  // ── Filtered employees for the dialog searchable list ──
  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (employeeSearch) {
      const q = employeeSearch.toLowerCase();
      list = list.filter((e) =>
        e.fullName.toLowerCase().includes(q) || e.employeeId.toLowerCase().includes(q)
      );
    }
    return list;
  }, [employees, employeeSearch]);

  // Selected employee info
  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.employeeId === form.employeeId);
  }, [employees, form.employeeId]);

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
            <Clock className="w-5 h-5 text-gold" />
            Attendance Tracker
          </h2>
          <p className="text-sm text-muted-foreground">
            Auto-calculated working hours, overtime & deductions
          </p>
        </div>
        <Button
          className="gradient-laxree text-white gap-1.5 shrink-0"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <Clock className="w-4 h-4" /> Mark Attendance
        </Button>
      </motion.div>

      {/* ── Date Picker + Summary Cards (clickable) ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 space-y-4 border border-gold/10"
      >
        {/* Date Picker Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-gold" />
            <span className="text-sm font-semibold">Select Date</span>
          </div>
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => {
              setFilterDate(e.target.value);
              setStatusFilter('all');
              // Auto-set month/year from date for monthly tab sync
              if (e.target.value) {
                const d = new Date(e.target.value);
                setFilterMonth(String(d.getMonth() + 1));
                setFilterYear(String(d.getFullYear()));
              }
            }}
            className="w-full sm:w-48 h-10 text-sm font-medium input-premium rounded-lg"
          />
          {filterDate && (
            <span className="text-xs text-muted-foreground">
              {new Date(filterDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          )}
          <div className="sm:ml-auto flex items-center gap-2">
            <Select value={filterFirm} onValueChange={(v) => { setFilterFirm(v); setStatusFilter('all'); }}>
              <SelectTrigger className="w-32 h-9 text-xs">
                <Building2 className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="All Firms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Firms</SelectItem>
                {FIRMS.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filterLocation} onValueChange={(v) => { setFilterLocation(v); setStatusFilter('all'); }}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <MapPin className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {LOCATIONS.map((l) => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Clickable Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* "All" card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            className={`cursor-pointer transition-all duration-200 rounded-xl border-2 ${
              statusFilter === 'all'
                ? 'border-gold shadow-lg shadow-gold/10 kpi-card'
                : 'border-transparent kpi-card hover:border-gold/30'
            }`}
            onClick={() => setStatusFilter('all')}
          >
            <Card className="border-0 shadow-none bg-transparent">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-laxree flex items-center justify-center shrink-0 shadow-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium truncate">Total</p>
                  <p className="text-xl font-bold">
                    <AnimatedCounter value={records.length} />
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          {statCards.map((card, i) => {
            const Icon = card.icon;
            const isActive = statusFilter === card.filter;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i + 1) * 0.05 }}
                className={`cursor-pointer transition-all duration-200 rounded-xl border-2 ${
                  isActive
                    ? 'border-gold shadow-lg shadow-gold/10 kpi-card'
                    : 'border-transparent kpi-card hover:border-gold/30'
                }`}
                onClick={() => setStatusFilter(isActive ? 'all' : card.filter)}
              >
                <Card className="border-0 shadow-none bg-transparent">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${card.gradient} flex items-center justify-center shrink-0 shadow-lg ${isActive ? 'animate-pulse' : ''}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground font-medium truncate">{card.title}</p>
                      <p className="text-xl font-bold">
                        {card.isHours ? (
                          <span>{card.value.toFixed(2)}h</span>
                        ) : (
                          <AnimatedCounter
                            value={card.value}
                            suffix={'suffix' in card ? (card as any).suffix : ''}
                            decimals={'decimals' in card ? (card as any).decimals : 0}
                          />
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Active filter indicator */}
        {statusFilter !== 'all' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Showing:</span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gold/10 text-gold border border-gold/20">
              {statCards.find(c => c.filter === statusFilter)?.title || statusFilter} ({filteredRecords.length} records)
            </span>
            <button
              className="text-xs text-muted-foreground hover:text-gold underline"
              onClick={() => setStatusFilter('all')}
            >
              Show All
            </button>
          </div>
        )}
      </motion.div>

      {/* ── Tabs: Daily / Monthly / Import ── */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="daily" className="gap-1.5 text-xs">
            <CalendarDays className="w-3.5 h-3.5" /> Daily
          </TabsTrigger>
          <TabsTrigger value="monthly" className="gap-1.5 text-xs">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Monthly
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-1.5 text-xs">
            <Upload className="w-3.5 h-3.5" /> Import
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════
            DAILY ATTENDANCE TAB
            ══════════════════════════════════════════════════ */}
        <TabsContent value="daily" className="space-y-4">
          {/* ── Search + Export Row ── */}
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9 h-9" placeholder="Search employee by name or ID..." value={searchEmployee} onChange={(e) => setSearchEmployee(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0" onClick={handleExportDailyExcel}>
              <FileDown className="w-3.5 h-3.5" /> Export Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 shrink-0 border-red-500/30 hover:border-red-500/60 hover:bg-red-500/5 text-red-500"
              onClick={async () => {
                if (!confirm('Are you sure you want to CLEAR ALL attendance records? This cannot be undone!')) return;
                if (!confirm('FINAL WARNING: All attendance data will be permanently deleted. Continue?')) return;
                try {
                  const res = await fetch('/api/attendance/clear-all', { method: 'DELETE' });
                  if (res.ok) {
                    const data = await res.json();
                    toast.success(`Cleared ${data.deletedCount} attendance records`);
                    loadData();
                  } else {
                    toast.error('Failed to clear attendance records');
                  }
                } catch {
                  toast.error('Failed to clear attendance records');
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </Button>
          </motion.div>

          {/* ── Attendance Table ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-card card-gold-hover border-0">
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[65vh]" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <Table id="daily-attendance-table">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent sticky top-0 bg-card z-10">
                        <TableHead className="min-w-[160px]">Employee</TableHead>
                        <TableHead className="min-w-[70px]">Emp Code</TableHead>
                        <TableHead className="hidden md:table-cell min-w-[70px]">Company</TableHead>
                        <TableHead className="min-w-[80px]">In Time</TableHead>
                        <TableHead className="hidden sm:table-cell min-w-[70px]">Out Time</TableHead>
                        <TableHead className="min-w-[50px]">Hrs</TableHead>
                        <TableHead className="min-w-[80px]">Status</TableHead>
                        <TableHead className="hidden lg:table-cell min-w-[50px]">OT</TableHead>
                        <TableHead className="w-[70px] sticky right-0 bg-card">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 9 }).map((_, j) => (
                              <TableCell key={j}><div className="h-4 bg-muted/50 rounded animate-pulse" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : filteredRecords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                            <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="font-medium">No attendance records for this date</p>
                            <p className="text-xs mt-1">Select a different date or import attendance data</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRecords.map((rec) => (
                          <TableRow key={rec.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full gradient-laxree flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                  {rec.employee?.fullName?.charAt(0) || '?'}
                                </div>
                                <div className="min-w-0 overflow-hidden">
                                  <p className="text-sm font-medium truncate max-w-[120px]">{rec.employee?.fullName || rec.employeeId}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">{rec.employeeId}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              <FirmBadge firm={getFirmFromEmployeeId(rec.employeeId) || rec.employee?.department || ''} />
                            </TableCell>
                            <TableCell className="text-sm font-mono whitespace-nowrap">{rec.checkIn || '—'}</TableCell>
                            <TableCell className="hidden sm:table-cell text-sm font-mono whitespace-nowrap">{rec.checkOut || '—'}</TableCell>
                            <TableCell className="text-sm font-medium whitespace-nowrap">{rec.totalHours > 0 ? `${formatHours(rec.totalHours)}h` : '—'}</TableCell>
                            <TableCell><StatusBadge status={rec.status} /></TableCell>
                            <TableCell className="hidden lg:table-cell text-sm whitespace-nowrap">
                              {rec.overtimeHours > 0 ? (
                                <span className="text-cyan-600 dark:text-cyan-400 font-medium">{rec.overtimeHours.toFixed(2)}h</span>
                              ) : '—'}
                            </TableCell>
                            <TableCell className="sticky right-0 bg-card">
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(rec)} title="Edit">
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(rec.id)} title="Delete">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════
            MONTHLY ATTENDANCE TAB
            ══════════════════════════════════════════════════ */}
        <TabsContent value="monthly" className="space-y-4">
          {/* ── Employee Selector ── */}
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-3">
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs text-muted-foreground mb-1 block">Select Employee</Label>
                <Select value={monthlyEmpId} onValueChange={setMonthlyEmpId}>
                  <SelectTrigger className="w-full h-9">
                    <Search className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="Select Employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.sort((a, b) => a.fullName.localeCompare(b.fullName)).map(e => (
                      <SelectItem key={e.employeeId} value={e.employeeId}>
                        {e.fullName} ({e.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-full sm:w-36 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (<SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-full sm:w-24 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map(y => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
                </SelectContent>
              </Select>
              {monthlySummary && (
                <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleExportExcel}>
                  <FileDown className="w-3.5 h-3.5" /> Export Excel
                </Button>
              )}
            </div>
          </motion.div>

          {/* ── Monthly Summary Card — Spreadsheet Format ── */}
          {monthlyLoading ? (
            <Card className="glass-card card-gold-hover border-0">
              <CardContent className="p-8 text-center text-muted-foreground">
                <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full mx-auto mb-3" />
                <p>Loading monthly summary...</p>
              </CardContent>
            </Card>
          ) : monthlySummary ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass-card card-gold-hover border-0">
                <CardContent className="p-4 md:p-6 space-y-4">
                  {/* Employee Info Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                    {(() => {
                      const firmCode = getFirmFromEmployeeId(monthlySummary.employee.employeeId) || monthlySummary.employee.firm || monthlySummary.employee.department;
                      const logoSrc = FIRM_LOGOS[firmCode];
                      return logoSrc ? (
                        <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-gold/30 shrink-0 bg-white p-1">
                          <Image src={logoSrc} alt={firmCode} width={48} height={48} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-xl gradient-laxree flex items-center justify-center text-white text-lg font-bold shrink-0">
                          {monthlySummary.employee.fullName.charAt(0)}
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <h3 className="font-bold text-lg">{monthlySummary.employee.fullName}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                        <span className="font-mono">{monthlySummary.employee.employeeId}</span>
                        <span>•</span>
                        <FirmBadge firm={getFirmFromEmployeeId(monthlySummary.employee.employeeId) || monthlySummary.employee.firm || monthlySummary.employee.department} />
                        <span>•</span>
                        <span>{monthlySummary.employee.location}</span>
                        <span>•</span>
                        <span>{monthlySummary.monthName} {monthlySummary.year}</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Spreadsheet-style Summary Table ── */}
                  <div className="overflow-x-auto rounded-lg border border-border/50">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-emerald-700 dark:bg-emerald-900 text-white">
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider border-r border-emerald-600/30">Days Present</th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider border-r border-emerald-600/30">Days Absent</th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider border-r border-emerald-600/30">Half Days</th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider border-r border-emerald-600/30">AL</th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider border-r border-emerald-600/30">UL</th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider border-r border-emerald-600/30">Total Hrs Worked</th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider border-r border-emerald-600/30">OT Hrs</th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider border-r border-emerald-600/30">Sunday Hrs</th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Total Hrs (incl. Sunday)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-muted/30 hover:bg-muted/50 transition-colors">
                          <td className="px-3 py-3 font-bold text-emerald-600 dark:text-emerald-400 border-r border-border/30">{monthlySummary.presentDays}</td>
                          <td className="px-3 py-3 font-bold text-red-500 border-r border-border/30">{monthlySummary.absentDays}</td>
                          <td className="px-3 py-3 font-bold text-orange-500 border-r border-border/30">{monthlySummary.halfDays}</td>
                          <td className="px-3 py-3 text-blue-500 border-r border-border/30">{monthlySummary.annualLeaves || 0}</td>
                          <td className="px-3 py-3 text-amber-600 dark:text-amber-400 border-r border-border/30">{monthlySummary.unpaidLeaves || 0}</td>
                          <td className="px-3 py-3 font-bold text-cyan-600 dark:text-cyan-400 border-r border-border/30">{displayHHMM(monthlySummary.totalWorkHours)}</td>
                          <td className="px-3 py-3 font-bold text-yellow-600 dark:text-yellow-400 border-r border-border/30">{displayHHMM(monthlySummary.totalOvertimeHours)}</td>
                          <td className="px-3 py-3 text-blue-600 dark:text-blue-400 border-r border-border/30">{displayHHMM(monthlySummary.totalSundayHours)}</td>
                          <td className="px-3 py-3 font-bold text-gold">{displayHHMM(monthlySummary.totalHrsInclSunday || (monthlySummary.totalWorkHours || 0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Additional Info Row */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { label: 'Working Days', value: monthlySummary.totalWorkingDays, color: 'text-foreground' },
                      { label: 'Weekly Offs', value: monthlySummary.weeklyOffs, color: 'text-sky-500' },
                      { label: 'Sundays', value: monthlySummary.sundays, color: 'text-blue-500' },
                      { label: 'Late Entries', value: monthlySummary.lateEntries, color: 'text-amber-500' },
                      { label: 'Early Outs', value: monthlySummary.earlyOuts || 0, color: 'text-rose-500' },
                      { label: 'Shift Hrs', value: `${displayHHMM(monthlySummary.employee.shiftHours)}h`, color: 'text-muted-foreground' },
                    ].map(item => (
                      <div key={item.label} className="p-2 rounded-lg bg-muted/20 text-center">
                        <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">{item.label}</p>
                        <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Daily Records Table — Full scrollable */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <ChevronRight className="w-4 h-4 text-gold" />
                      Daily Attendance Breakdown ({monthlySummary.records.length} days)
                    </h4>
                    <div
                      className="rounded-lg border border-border/50"
                      style={{
                        maxHeight: '60vh',
                        overflowY: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        scrollBehavior: 'smooth',
                      }}
                    >
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent sticky top-0 bg-card z-10">
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Day</TableHead>
                            <TableHead className="text-xs">In</TableHead>
                            <TableHead className="text-xs">Out</TableHead>
                            <TableHead className="text-xs">Hrs</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs">OT</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            const daysInMonth = new Date(monthlySummary.year, monthlySummary.month, 0).getDate();
                            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                            const rows = [];
                            for (let day = 1; day <= daysInMonth; day++) {
                              const dateStr = `${monthlySummary.year}-${String(monthlySummary.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                              const dateObj = new Date(dateStr + 'T00:00:00');
                              const dayName = dayNames[dateObj.getDay()];
                              const rec = monthlySummary.records.find((r: any) => {
                                const rDate = new Date(r.date);
                                return rDate.getFullYear() === monthlySummary.year && rDate.getMonth() + 1 === monthlySummary.month && rDate.getDate() === day;
                              });
                              const isSunday = dateObj.getDay() === 0;
                              rows.push(
                                <TableRow
                                  key={day}
                                  className={`${isSunday ? 'bg-blue-500/5' : 'hover:bg-muted/30'} transition-colors`}
                                >
                                  <TableCell className="text-xs whitespace-nowrap font-medium">
                                    {dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                  </TableCell>
                                  <TableCell className={`text-xs ${isSunday ? 'text-blue-500 font-bold' : ''}`}>{dayName}</TableCell>
                                  <TableCell className="text-xs font-mono">{rec?.checkIn || '—'}</TableCell>
                                  <TableCell className="text-xs font-mono">{rec?.checkOut || '—'}</TableCell>
                                  <TableCell className="text-xs font-medium">{rec && rec.totalHours > 0 ? `${formatHours(rec.totalHours)}h` : '—'}</TableCell>
                                  <TableCell>
                                    {rec ? (
                                      <StatusBadge status={rec.status} />
                                    ) : isSunday ? (
                                      <StatusBadge status="weekly-off" />
                                    ) : (
                                      <span className="text-xs text-muted-foreground italic">No Record</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs">{rec && rec.overtimeHours > 0 ? `${rec.overtimeHours.toFixed(2)}h` : '—'}</TableCell>
                                </TableRow>
                              );
                            }
                            return rows;
                          })()}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Card className="glass-card card-gold-hover border-0">
              <CardContent className="p-8 text-center text-muted-foreground">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Select an employee to view monthly attendance summary</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════
            DAILY ATTENDANCE IMPORT TAB
            ══════════════════════════════════════════════════ */}
        <TabsContent value="import" className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-card card-gold-hover border-0">
              <CardContent className="p-6 space-y-6">
                {/* Upload Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Upload className="w-4 h-4 text-gold" />
                      Upload Attendance Sheet
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs border-gold/30 hover:border-gold/60 hover:bg-gold/5"
                      onClick={handleDownloadTemplate}
                    >
                      <Download className="w-3.5 h-3.5" /> Download Template
                    </Button>
                  </div>

                  {/* Attendance Date Picker */}
                  <div className="mb-4">
                    <Label htmlFor="importDate" className="text-xs font-semibold flex items-center gap-1.5 mb-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-gold" />
                      Attendance Date
                    </Label>
                    <Input
                      id="importDate"
                      type="date"
                      value={importDate}
                      onChange={(e) => setImportDate(e.target.value)}
                      className="w-full sm:w-56 h-9 text-sm font-medium input-premium rounded-lg"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      This date will be used for all rows in the uploaded file (daily template has no Date column per row).
                    </p>
                  </div>

                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-gold/50 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload Excel (.xlsx, .xls) or CSV file with attendance data
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-1.5"
                    >
                      <Upload className="w-4 h-4" /> Choose File
                    </Button>
                    {importFile && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                  <div className="mt-3 p-3 rounded-lg bg-gold/5 border border-gold/10">
                    <Info className="w-4 h-4 text-gold inline mr-1.5 -mt-0.5" />
                    <span className="text-xs text-muted-foreground">
                      <strong>Template format:</strong> SNo, E. Code, Name, Shift, InTime, OutTime, Work Dur., OT, Tot. Dur., Status, Remarks. 
                      The daily template has no Date column — set the <strong>Attendance Date</strong> above before uploading.
                      Click <strong>"Download Template"</strong> to get the correct format with all employees pre-filled. 
                      The system auto-converts Excel dates/times and matches employees by E. Code or Name.
                      Also supports the old format (Employee ID, Employee Name, Date, In Time, Out Time, Status).
                    </span>
                  </div>
                </div>

                {/* Preview Section */}
                {importPreview.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Search className="w-4 h-4 text-gold" />
                      Preview ({importPreview.length} records found)
                      {!importPreview.some(r => r.date) && importDate && (
                        <span className="text-[10px] text-muted-foreground font-normal ml-1">
                          — using date: {importDate}
                        </span>
                      )}
                    </h3>
                    <ScrollArea className="max-h-[40vh]">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-xs">E. Code</TableHead>
                            <TableHead className="text-xs">Name</TableHead>
                            <TableHead className="text-xs">Shift</TableHead>
                            <TableHead className="text-xs">InTime</TableHead>
                            <TableHead className="text-xs">OutTime</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs">Remarks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPreview.slice(0, 100).map((row, i) => (
                            <TableRow key={i} className="hover:bg-muted/30">
                              <TableCell className="text-xs font-mono">{row.employeeId || '—'}</TableCell>
                              <TableCell className="text-xs">{row.employeeName || '—'}</TableCell>
                              <TableCell className="text-xs">{row.shift || '—'}</TableCell>
                              <TableCell className="text-xs font-mono">{row.checkIn || '—'}</TableCell>
                              <TableCell className="text-xs font-mono">{row.checkOut || '—'}</TableCell>
                              <TableCell className="text-xs">{row.status || '—'}</TableCell>
                              <TableCell className="text-xs">{row.remarks || '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>

                    {/* Process Button */}
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t relative z-10 bg-background">
                      <Button
                        className="gradient-laxree text-white gap-1.5 shrink-0"
                        onClick={handleProcessImport}
                        disabled={importing}
                      >
                        {importing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" /> Process Attendance
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="shrink-0"
                        onClick={() => {
                          setImportPreview([]);
                          setImportFile(null);
                          setImportResult(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      >
                        Clear
                      </Button>
                      <span className="text-xs text-muted-foreground ml-auto">{importPreview.length} records ready to process</span>
                    </div>
                  </div>
                )}

                {/* Import Result */}
                {importResult && (
                  <div className="p-4 rounded-lg bg-muted/30 border">
                    <h4 className="text-sm font-semibold mb-2">Import Results</h4>
                    <div className="flex gap-4 text-sm">
                      <span className="text-emerald-500 font-medium">Success: {importResult.successCount}</span>
                      {importResult.errorCount > 0 && (
                        <span className="text-red-500 font-medium">Errors: {importResult.errorCount}</span>
                      )}
                    </div>
                    {importResult.results?.filter((r: any) => r.error).length > 0 && (
                      <div className="mt-2 text-xs text-red-500">
                        {importResult.results.filter((r: any) => r.error).map((r: any, i: number) => (
                          <p key={i}>{r.employeeId} ({r.date}): {r.error}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* ── Mark Attendance Dialog ── */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm({ employeeId: '', date: '', checkIn: '', checkOut: '' }); setEmployeeSearch(''); } }}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto z-[100]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gold" />
              Mark Attendance
            </DialogTitle>
            <DialogDescription>Select an employee and enter attendance details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Employee Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Employee *</Label>
              {!form.employeeId ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Search employee by name or ID..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {filteredEmployees.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No employees found</p>
                    ) : (
                      filteredEmployees.slice(0, 20).map((e) => (
                        <button
                          key={e.employeeId}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted/80 text-sm flex items-center justify-between transition-colors border-b border-border/50 last:border-0 gap-2"
                          onClick={() => { setForm({ ...form, employeeId: e.employeeId }); setEmployeeSearch(''); }}
                        >
                          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                            <FirmBadge firm={e.department} />
                            <span className="truncate-fix">{e.fullName}</span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono shrink-0">{e.employeeId}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2.5 bg-muted/50 rounded-lg gap-2">
                  <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                    <div className="w-7 h-7 rounded-full gradient-laxree flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                      {selectedEmployee?.fullName?.charAt(0) || '?'}
                    </div>
                    <span className="text-sm font-medium truncate-fix">{selectedEmployee?.fullName}</span>
                    <FirmBadge firm={selectedEmployee?.department || ''} />
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0 px-2" onClick={() => setForm({ ...form, employeeId: '' })}>
                    <X className="w-3 h-3 mr-1" /> Change
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Date *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Check-In Time</Label>
                <Input type="time" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} className="w-full" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Check-Out Time</Label>
                <Input type="time" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} className="w-full" />
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-gold/5 border border-gold/10">
              <Info className="w-4 h-4 text-gold shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                System auto-calculates working hours, late entry detection, overtime, Sunday hours, and public holiday tracking.
              </p>
            </div>

            <Button className="w-full gradient-laxree text-white h-10" onClick={handleSubmit}>
              Save Attendance
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Attendance Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md z-[100]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-gold" />
              Edit Attendance
            </DialogTitle>
            <DialogDescription>Update check-in and check-out times for this attendance record</DialogDescription>
          </DialogHeader>
          {editRecord && (
            <div className="space-y-4 py-2">
              <div className="px-3 py-2.5 bg-muted/50 rounded-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-full gradient-laxree flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {editRecord.employee?.fullName?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium">{editRecord.employee?.fullName || editRecord.employeeId}</p>
                  <p className="text-xs text-muted-foreground">
                    {editRecord.employeeId} • {new Date(editRecord.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <StatusBadge status={editRecord.status} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Check-In Time</Label>
                  <Input type="time" value={editForm.checkIn} onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })} className="w-full" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Check-Out Time</Label>
                  <Input type="time" value={editForm.checkOut} onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })} className="w-full" />
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-gold/5 border border-gold/10">
                <Info className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Hours, OT, late entry, and status will be auto-recalculated when you save.
                </p>
              </div>
              <Button className="w-full gradient-laxree text-white h-10" onClick={handleEditSubmit}>
                Update Attendance
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
