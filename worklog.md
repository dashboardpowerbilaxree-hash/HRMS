---
Task ID: 1
Agent: Main Agent
Task: Fix data loss, add Advance feature, payroll export, salary slip improvements

Work Log:
- Diagnosed data loss: startup scripts overwrote active DB with stale copy on every restart
- Fixed all startup scripts (start-daemon.sh, start-server.sh, start-with-warmup.sh) to use persistent DB path
- Added DB backup to build script in package.json
- Added Advance model to Prisma schema with employee relation
- Created /api/advances route (GET + POST) and /api/advances/[id] route (DELETE)
- Added Advance section to PayrollAutomation.tsx with Add Advance dialog and Advances list
- Added AdvanceSection component to SalarySlipGenerator.tsx showing advance reason, date, amount
- When advance is added, it auto-updates the payroll advanceDeduction and recalculates net salary
- Added Export Sheet button with full XLSX export (Payroll Register + Summary sheets)
- Changed salary slip font from sans-serif to Merriweather serif (human-like)
- Updated firm addresses to correct Ajmer address
- Updated firm names to match correct company names
- Removed formula line from salary slip Excel footer

Stage Summary:
- Data persistence fixed permanently - no more data loss on restart
- Advance feature fully implemented: Add advance → auto-deducts from payroll → shows on salary slip
- Payroll Export Sheet added with premium styling
- Salary slip now uses human-like Merriweather serif font
- All firm details corrected
