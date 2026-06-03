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
