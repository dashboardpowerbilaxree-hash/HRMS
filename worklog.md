---
Task ID: 1
Agent: Main Agent
Task: Fix attendance absent days calculation and export button issues

Work Log:
- Analyzed the uploaded screenshot showing Khushboo (EMP-007) with absent days showing 0 despite May 14 showing "Absent" status
- Identified root cause: `effectivePresentDays` included `weeklyOffWorked` (Sunday work days) and `holidayWorked`, which inflated present count and cancelled out absent days
- Also found that paid leave calculation counted Sundays (non-working days) as leave days and didn't check if employee was already present on leave days
- Fixed all 4 API routes with consistent calculation logic:
  1. `/api/attendance/monthly-summary/route.ts`
  2. `/api/payroll/route.ts`
  3. `/api/payroll/generate-all/route.ts`
  4. `/api/attendance/export-monthly/route.ts` (new)
- Created new server-side API routes for Excel export (fixes the non-clickable export button):
  1. `/api/attendance/export-monthly/route.ts`
  2. `/api/attendance/export-daily/route.ts`
- Removed client-side xlsx-js-style import from AttendanceTracker.tsx
- Updated export handlers to use server-side API routes via fetch + blob download

Stage Summary:
- Fixed absent days calculation: presentDays = full present only, halfDays tracked separately, absentDays = totalWorkingDays - present - halfDays - effectivePaidLeaves - effectiveUnpaidLeaves
- Effective paid leave calculation: only counts leave days on working days where employee was NOT already present
- Salary uses effectivePresentDays (includes half-days as 0.5) for accurate deduction
- Verified: EMP-007: present=24, absent=1, halfDay=1, total=26 ✓
- Export buttons now work via server-side API routes returning Excel files
- Build successful, PM2 restarted, all API endpoints tested and working
---
Task ID: 1
Agent: Main
Task: Fix OT hours calculation for all employees - was showing 5.26 instead of correct 5.25 for Radhika

Work Log:
- Identified root cause: OT hours were stored as DECIMAL values (1.18 for 1h11min) but displayed as HH.MM (1.11). When summing, the decimal values were summed (5.43) then converted to HH.MM (5.26), which is incorrect because the rounding errors compound.
- Fixed monthly-summary API: Calculate OT from raw check-in/check-out times (minutes-based), convert to HH.MM format
- Fixed export-monthly route: Same approach - calculate from raw times, display individual and total in HH.MM
- Fixed payroll/route.ts and payroll/generate-all: Same approach for OT calculation
- Fixed daily export route: Same approach for OT total display
- Fixed AttendanceTracker monthly tab: Use displayHHMM() for API-returned HH.MM values instead of formatHours()
- Fixed PayrollAutomation: Use displayHHMM() for payroll data (which is now in HH.MM format)
- Fixed SalarySlipGenerator: Use displayHHMM() for payroll data
- Added displayHHMM() function to all affected components for consistent HH.MM display

Stage Summary:
- Radhika's OT now correctly shows 5.25 (5h 25min) instead of 5.26
- Individual day OT values in export now match between daily register and computed totals
- Salary calculations use decimal OT hours internally (otHoursDecimal) for accuracy
- All display uses HH.MM format (e.g., 5.25 = 5h 25min) consistently
- Build succeeded, PM2 restarted
