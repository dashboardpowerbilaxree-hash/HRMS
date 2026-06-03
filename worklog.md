---
Task ID: 1
Agent: Main Agent
Task: Fix attendance data loss after server restart, add payroll export, fix salary slip font

Work Log:
- Investigated data persistence issue - found startup scripts overwrite active DB with stale copy
- Fixed start-daemon.sh: removed `cp -f` line that copies stale DB, changed DATABASE_URL to persistent path
- Fixed start-server.sh: changed DATABASE_URL from standalone copy to persistent /home/z/my-project/db/custom.db
- Fixed start-with-warmup.sh: removed `cp -f` stale DB copy, changed DATABASE_URL to persistent path
- Fixed package.json build script: added DB backup before build
- Added Merriweather serif font to layout.tsx for human-like salary slip appearance
- Updated SalarySlipGenerator.tsx: changed font from 'Segoe UI' to Merriweather/Georgia/Liberation Serif
- Removed formula line from salary slip Excel export footer
- Updated all firm addresses to correct address: Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer
- Updated firm names in seed data to match correct company names
- Updated firms in database via prisma db execute
- Added Export Sheet button to PayrollAutomation.tsx with full XLSX export functionality
- Fixed TypeScript error: removed `p.employee?.firm` reference that doesn't exist in type

Stage Summary:
- Data persistence fixed: All startup scripts now point to /home/z/my-project/db/custom.db (persistent)
- No more stale DB copy on restart - data will survive server restarts and rebuilds
- Payroll Export Sheet added with premium styling (2 sheets: Register + Summary)
- Salary slip now uses Merriweather serif font (human-like, not AI-looking)
- Formula line removed from Excel export footer
- Firm addresses/names corrected in all locations
