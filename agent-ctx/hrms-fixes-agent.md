# HRMS Dashboard Bug Fixes - Work Record

## Summary
Fixed 6 issues across the Laxree HRMS Dashboard project involving attendance, payroll, and salary calculations.

## Issues Fixed

### Issue 1: Monthly Present Days Always Shows 26
**File**: `/home/z/my-project/src/app/api/attendance/monthly-summary/route.ts`
**Fix**: 
- Changed `holidayAttendance` to only count holidays where employee actually worked (`a.isHoliday && a.totalHours > 0`) instead of counting all holiday records
- Changed `absentDays` formula to use `paidLeaves` (excluding unpaid/LOP) instead of `leaveDays` (all leaves)
- Added `paidLeaves` field to API response

### Issue 2 & 3: OT Hours & Early Out (Verified - Already Correct)
**Files**: 
- `/home/z/my-project/src/app/api/attendance/route.ts`
- `/home/z/my-project/src/app/api/attendance/bulk-upload/route.ts`
- `/home/z/my-project/src/app/api/attendance/[id]/route.ts`

**Verified**:
- `calcHours` returns decimal hours correctly
- OT formula: `max(0, totalHours - shiftHours)` with rounding ✓
- OT rate from `employee.overtimeRate` used in overtime record creation ✓
- Early Out detection: `checkOutMinutes < shiftEndMinutes` ✓
- Status 'early-out' set when earlyOut=true and not late ✓
- Early-out counted as present for payroll (included in ['present', 'late', 'early-out']) ✓
- StatusBadge has 'early-out' configuration ✓

### Issue 4: AttendanceTracker Monthly Summary Display
**File**: `/home/z/my-project/src/components/hrms/AttendanceTracker.tsx`
**Fix**: Added `paidLeaves?: number` to MonthlySummary interface (API now returns this field)

### Issue 5: SalarySlipGenerator Company Name Mapping (Verified - Already Correct)
**File**: `/home/z/my-project/src/components/hrms/SalarySlipGenerator.tsx`
**Verified**:
- `getFirmFromEmployeeId` correctly maps LAPL→LAPL, LRSL→LRSL, SI-*/SI0→SI, SDF→SDF ✓
- `FIRM_NAMES` mapping is correct ✓
- Payslip displays correct company name based on employee ID prefix ✓

### Issue 6: PayrollAutomation Salary Preview
**File**: `/home/z/my-project/src/components/hrms/PayrollAutomation.tsx`
**Fixes**:
- Updated `salaryPreview` useMemo to compute `baseSalary` from payroll data (monthlySalary - perDaySalary × absentDays)
- Fixed deductions calculation: now uses form values as TOTAL deductions (not adding to existing totalDeductions), matching the payroll API behavior
- Added `baseSalary`, `perDaySalary`, `daysInMonth` fields to PayrollRecord interface
- Updated preview grid to show 7 columns: Base Salary, Gross, Bonus, Incentive, Arrear, Deductions, Net Salary
- Added formula explanation text below the preview
- Net correctly calculated as: grossSalary + bonus + incentive + arrear - totalDeductions

### Bonus Fix: Payroll API Consistency
**Files**:
- `/home/z/my-project/src/app/api/payroll/route.ts`
- `/home/z/my-project/src/app/api/payroll/generate-all/route.ts`

**Fixes**:
- Changed `holidayWorked` to only count holidays where employee actually worked (`a.isHoliday && a.totalHours > 0`)
- Changed `paidLeaves` to exclude unpaid/LOP leave types (consistent with monthly-summary API)
- Changed `weeklyOffWorked` to only count weekly offs where employee actually worked

## Build & Deploy
- `npm run build` passed successfully
- `bun run lint` passed with no errors
- PM2 process restarted
