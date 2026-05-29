---
Task ID: 1
Agent: Main Agent
Task: Fix Laxree HRMS Dashboard - site not working, Mark Attendance broken, overlapping text

Work Log:
- Diagnosed missing isSunday field in Prisma Overtime model causing attendance API to crash
- Added isSunday Boolean @default(false) to Overtime model in prisma/schema.prisma
- Ran prisma db push and prisma generate to sync database
- Fixed employees POST API to accept both firm/department and monthlySalary/basicSalary field names
- Fixed employees GET API to accept both firm and department query params, added salaryType filter support
- Fixed EmployeeManagement component: changed filter param from department to firm, added firm and monthlySalary to form payload
- Fixed PayrollAutomation component: changed filter param from department to firm, fixed FirmBadge to use firm field
- Fixed payroll API: added department to employee select, accept both firm and department params
- Fixed payroll generate-all API: accept both firm and department in request body
- Fixed AI Assistant: changed company name from NeoCorp Technologies to Laxree Group of Companies
- Fixed half-day/half_day status inconsistency across dashboard, payroll, and generate-all APIs
- Fixed overlapping text in DashboardHome KPI cards: added overflow-hidden, truncate, gap-1, shrink-0 classes
- Fixed overlapping text in Header: added min-w-0, overflow-hidden, truncate, shrink-0 classes
- Fixed overlapping text in Sidebar: added overflow-hidden to logo section
- Fixed CSS z-index: changed .dark body::before from z-index:0 to z-index:-1 to prevent background overlap
- Disabled Prisma query logging (changed from log: ['query'] to log: ['error']) for performance
- Optimized seed API: skip seeding if admin already exists (prevents slow re-seeding on every page load)
- Build verified: next build passes with zero errors

Stage Summary:
- All critical bugs fixed: Mark Attendance API now works with proper schema fields
- All API param mismatches resolved (department/firm, basicSalary/monthlySalary)
- Overlapping text issues fixed in Dashboard, Header, Sidebar
- Production build passes cleanly
- Database schema synchronized with code
