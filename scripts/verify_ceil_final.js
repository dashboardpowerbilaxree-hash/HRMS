// Quick final verification scan
import { Pool } from '@neondatabase/serverless';
const DATABASE_URL = 'postgresql://neondb_owner:npg_pGbVon2mrZ3q@ep-empty-haze-aq8y1r98-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: DATABASE_URL, max: 1 });

async function main() {
  // 1. Employee: any decimals?
  const e1 = await pool.query(`SELECT COUNT(*)::int AS bad FROM "Employee" WHERE "monthlySalary" > 0 AND "shiftHours" > 0 AND ("hourlyRate" != CEIL("hourlyRate")::numeric OR "overtimeRate" != CEIL("overtimeRate")::numeric);`);
  console.log(`Employee decimals: ${e1.rows[0].bad}`);

  // 2. Payroll: any decimals?
  const e2 = await pool.query(`SELECT COUNT(*)::int AS bad FROM "Payroll" WHERE "hourlyRate" != CEIL("hourlyRate")::numeric OR "otRate" != CEIL("otRate")::numeric;`);
  console.log(`Payroll decimals: ${e2.rows[0].bad}`);

  // 3. Sample: first 5 employees
  const s = await pool.query(`SELECT "employeeId", "fullName", "monthlySalary", "hourlyRate", "overtimeRate" FROM "Employee" WHERE "monthlySalary" > 0 ORDER BY "employeeId" LIMIT 5;`);
  console.table(s.rows);

  // 4. Row counts
  const c = await pool.query(`
    SELECT 'Employee' AS t, COUNT(*)::int AS rows FROM "Employee"
    UNION ALL SELECT 'Attendance', COUNT(*)::int FROM "Attendance"
    UNION ALL SELECT 'Payroll', COUNT(*)::int FROM "Payroll"
    UNION ALL SELECT 'Overtime', COUNT(*)::int FROM "Overtime"
    UNION ALL SELECT 'SalaryHistory', COUNT(*)::int FROM "SalaryHistory"
    UNION ALL SELECT 'Leave', COUNT(*)::int FROM "Leave";
  `);
  console.table(c.rows);

  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
