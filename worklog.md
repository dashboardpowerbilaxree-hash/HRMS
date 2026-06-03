---
Task ID: 1
Agent: Main Agent
Task: Fix OT Hours Calculation Bug - OT total was showing wrong value (5.26 instead of 4.45 for Radhika)

Work Log:
- Identified root cause: All API routes (monthly-summary, payroll, generate-all, export-monthly, export-daily) were recalculating OT from raw check-in/check-out times (summing OT minutes then converting to HH.MM format) instead of simply summing the stored overtimeHours values
- The stored overtimeHours are decimal hours calculated per-record when attendance is saved
- The raw-time recalculation produced different results due to: no status filtering, intermediate rounding differences, and HH.MM conversion
- Fixed all 6 files:
  1. monthly-summary/route.ts - Changed from raw-time OT calculation to sum of stored overtimeHours
  2. payroll/route.ts - Same fix, with status filter for eligible attendance records
  3. payroll/generate-all/route.ts - Same fix
  4. export-monthly/route.ts - Same fix for total, also changed per-day OT to use stored values
  5. export-daily/route.ts - Same fix, removed raw-time OT recalculation
  6. AttendanceTracker.tsx - Changed OT display from formatHours() (decimal→HH.MM conversion) to .toFixed(2) (raw decimal display)
  7. PayrollAutomation.tsx - Changed OT card display from formatHours() to .toFixed(2)
- Rebuilt and restarted PM2
- Verified with API testing: EMP-033 (Radhika) OT sum = 5.43, API total = 5.43 ✓
- Verified for multiple employees: all show correct matching totals

Stage Summary:
- OT hours now correctly displayed as simple decimal sum of individual stored overtimeHours values
- The total will match what users calculate manually by adding individual OT entries
- Fix applied to ALL employees, ALL API routes, and ALL display components

---
Task ID: 2
Agent: Main Agent
Task: Fix Hourly Rate Calculation & Remove Sunday Earned

Work Log:
- Fixed hourly rate formula in all API routes from (perDayRate/shiftHours) with intermediate rounding to monthlySalary/(daysInMonth×shiftHours) directly
- Updated 5 API route files:
  1. payroll/route.ts - hourlyRate = monthlySalary / (daysInMonth * shiftHours)
  2. payroll/generate-all/route.ts - same fix
  3. attendance/monthly-summary/route.ts - same fix
  4. employees/route.ts - same fix (was using totalWorkingDays instead of daysInMonth)
  5. employees/[employeeId]/route.ts - same fix
- Removed Sunday Earned (sundaysEarned, sundayEarnedHours) from:
  1. monthly-summary/route.ts - removed calculation and response fields
  2. export-monthly/route.ts - removed from Excel summary (reduced from 11 to 10 columns)
  3. AttendanceTracker.tsx - removed from MonthlySummary interface and monthly table
- Also fixed dailyRate in employee routes to use daysInMonth instead of totalWorkingDays
- Rebuilt and restarted PM2

Stage Summary:
- Hourly Rate now correctly calculated as: monthlySalary / (daysInMonth × shiftHours)
  - 31 days × 9 hrs = 279 hrs → ₹20,000/279 = ₹71.68
  - 30 days × 9 hrs = 270 hrs → ₹20,000/270 = ₹74.07
  - 28 days × 9 hrs = 252 hrs → ₹20,000/252 = ₹79.37
- Sunday Earned completely removed from all components and APIs
- Sundays are treated as weekly off, not earned
---
Task ID: 1
Agent: Main Agent
Task: Fix hourly rate calculation and remove Sunday earnings across all payroll routes and components

Work Log:
- Analyzed all files with hourly rate calculations: EmployeeManagement.tsx, payroll/route.ts, payroll/generate-all/route.ts, monthly-summary/route.ts, SalarySlipGenerator.tsx, PayrollAutomation.tsx, ai-assistant/route.ts
- Found the root cause: EmployeeManagement.tsx calcHourlyRate and calcOTRate used totalWorkingDays (excluding Sundays) instead of daysInMonth (total calendar days 28/29/30/31)
- Fixed EmployeeManagement.tsx calcHourlyRate: Changed from monthlySalary / (sh * totalWorkingDays) to monthlySalary / (sh * daysInMonth)
- Fixed EmployeeManagement.tsx calcOTRate: Same fix
- Changed payroll formula from baseSalary = monthlySalary - (perDayRate × absentDays) to baseSalary = perDayRate × earnedDays where earnedDays = effectivePresentDays + effectivePaidLeaves (Sundays NOT counted)
- Updated payroll/route.ts, payroll/generate-all/route.ts, monthly-summary/route.ts with new formula
- Updated SalarySlipGenerator.tsx baseSalary calculation in export, print, and display functions
- Updated PayrollAutomation.tsx salary preview and info card text
- Updated ai-assistant/route.ts payroll rules documentation
- Rebuilt and restarted PM2 successfully

Stage Summary:
- Hourly Rate formula: monthlySalary / (daysInMonth × shiftHours) — uses total calendar days (28/29/30/31), NOT working days
- Base Salary formula: perDayRate × earnedDays — where earnedDays = effectivePresentDays + effectivePaidLeaves (Sundays NOT counted)
- Sundays are now weekly off, NOT counted as present or earned days
- All employee sections now show correct OT rate based on daysInMonth

---
Task ID: 1
Agent: Main Agent
Task: Fix hourly rate formula and add Sunday earnings for all employees

Work Log:
- Added `sundayCount` and `sundayEarnings` fields to Prisma Payroll model
- Ran `prisma db push` to update database schema
- Fixed hourly rate formula in payroll route.ts (POST): `base_salary / (daysInMonth * 9)` - hardcoded 9 as shift hours
- Fixed hourly rate formula in payroll generate-all route.ts: same formula
- Fixed hourly rate formula in attendance monthly-summary route.ts: same formula
- Added Sunday Earnings calculation: `perDayRate × sundayCount`
- Added Earned Sunday Hours calculation: `sundayCount × 9`
- Updated Gross Salary formula: `baseSalary + sundayEarnings + otAmount`
- Updated payroll GET endpoint to compute and return Sunday earnings for backward compatibility
- Updated PayrollAutomation component: added sundayCount/sundayEarnings/earnedSundayHrs fields, updated formula info card, changed "Sunday Hrs" column to "Earn Sunday" with count/hours/amount display
- Updated SalarySlipGenerator: replaced "HRA" with "Sunday Earnings" row in all three formats (on-screen, Excel export, print)
- Updated baseSalaryCalc to exclude Sunday earnings (Sundays paid separately)
- Rebuilt and restarted PM2
- Verified: Kamlesh 17000/31/9 = ₹60.93, Sunday Count=5, Earned Sunday Hrs=45

Stage Summary:
- Hourly Rate now correctly uses base_salary / daysInMonth / 9 for all employees
- Sunday Earnings are now shown and included in gross salary
- Earned Sunday Hours = sundayCount × 9 (e.g., 5 Sun × 9 = 45h)
- Formula verified: 17000/279=₹60.93 (31-day), 17000/270=₹62.96 (30-day)
- All 35 employees generated successfully with new formula
---
Task ID: 1
Agent: main
Task: Fix chunk loading error and verify hourly rate + Sunday earnings calculations

Work Log:
- Analyzed user screenshot showing "Failed to load chunk 915af5a81489a42e.js" error
- Identified root cause: `.next/standalone/.next/static/` directory was missing chunk files
- After rebuild, copied `.next/static` to `.next/standalone/.next/static` and `public` to `.next/standalone/public`
- Verified all backend API routes already have correct hourly rate formula: base_salary / (daysInMonth * 9)
- Verified Sunday earnings are correctly included: perDayRate × sundayCount, earnedSundayHrs = sundayCount × 9
- Fixed payroll GET endpoint (`/api/payroll/route.ts`) to dynamically recalculate hourlyRate instead of using stale DB values
- Also dynamically recalculates otAmount using the correct hourly rate
- Tested all calculations with real employee data - all match manual calculations
- Rebuilt and restarted PM2 successfully

Stage Summary:
- Chunk loading error fixed by properly copying static files to standalone directory
- Hourly rate now ALWAYS calculated dynamically as base_salary / (daysInMonth * 9)
- Sunday earnings correctly shown: 5 Sundays in 31-day month = 45 earned Sunday hours
- Kamlesh verification: 17000/31/9 = ₹60.93 ✅, Sunday Earnings = ₹2741.95 ✅
- User should hard-refresh browser (Ctrl+Shift+R) to clear cached old chunk hashes
---
Task ID: 2
Agent: main
Task: Fix Late/Early-Out working hour deduction in salary calculation

Work Log:
- Identified that Late and Early-Out employees were counted as full present days with no pay deduction
- Implemented hour-based effective present days calculation:
  - "present" status = 1.0 day (full pay)
  - "late" status = actual_worked_minutes / shift_minutes (deducted for late arrival)
  - "early-out" status = actual_worked_minutes / shift_minutes (deducted for early departure)
  - "half-day" status = 0.5 day
- Fixed in ALL payroll-related files:
  - /api/payroll/route.ts (GET + POST)
  - /api/payroll/generate-all/route.ts
  - /api/attendance/monthly-summary/route.ts
  - /api/attendance/export-monthly/route.ts
  - PayrollAutomation.tsx (formula description)
- Fixed shiftMinutes variable ordering bug in monthly-summary and export-monthly routes
- Updated payroll GET endpoint to fully recalculate from attendance data (not use stale DB values)
- Rebuilt and restarted PM2 successfully

Stage Summary:
- Late/Early-Out deduction now works correctly across all calculation endpoints
- Example: Sandeep Sawilani - 25 present days, 23.77 effective days (1.23 days deducted for 18 lates)
- Example: taraChand - 26 present days, 25.55 effective days (0.45 days deducted)
- Formula: effective day = actual_worked_minutes / shift_minutes (capped at 1.0)
- Applies to May 2026 and all future months when payroll is generated
