---
Task ID: 1
Agent: Main Agent
Task: Fix all calculation discrepancies and rebuild server

Work Log:
- Extracted workspace tar from user upload
- Read and analyzed all API routes (monthly-summary, payroll, payroll/generate-all, export-monthly, attendance)
- Read and analyzed SalarySlipGenerator.tsx and PayrollAutomation.tsx components
- Read the user's Excel "Payroll Master (2).xlsx" to understand the exact calculation formula
- Identified root cause: hourly rate was being rounded to 2 decimal places (Math.round(rate*100)/100) while Excel uses full precision
- Fixed monthly-summary/route.ts: removed all early rounding, using full precision hourly rate
- Fixed payroll/route.ts (GET and POST): full precision calculations, only round final amounts
- Fixed payroll/generate-all/route.ts: same full precision approach
- Fixed attendance/route.ts: full precision hourly rate for OT calculation
- Fixed export-monthly/route.ts: consistent base hours calculation + added Salary Calculation sheet
- Fixed SalarySlipGenerator.tsx: uses API-returned perDayRate instead of recalculating with rounding
- Fixed PayrollAutomation.tsx: same fix for salaryPreview
- Built project successfully
- Copied static files and public dir to standalone
- Restarted PM2 successfully

Stage Summary:
- KEY FIX: Hourly rate now uses full precision (e.g., 60.93189964 instead of 60.93)
- Formula matches Excel exactly: Gross = hourlyRate × (baseHrs + sundayHrs + otHrs + paidLeaveHrs)
- Only final salary amounts are rounded to 2 decimal places
- Working hour deductions for Late/Early-Out are correctly applied via baseHrs = totalHours - overtimeHours
- Added Salary Calculation sheet to monthly attendance Excel export
- Server is running on port 3000
- Database is intact with all employee and attendance data
