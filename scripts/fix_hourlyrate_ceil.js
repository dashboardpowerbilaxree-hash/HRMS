// Minimal fix: just batch SQL updates, no per-row queries
import { Pool } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_pGbVon2mrZ3q@ep-empty-haze-aq8y1r98-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: DATABASE_URL, max: 1, connectionTimeoutMillis: 30000, query_timeout: 60000 });

// PostgreSQL ROUND only works with numeric, so cast explicitly
function r2(expr) { return `ROUND((${expr})::numeric, 2)`; }

async function main() {
  // STEP 1: Already done - Employee table
  console.log('STEP 1: Verify Employee table...');
  const v0 = await pool.query(`
    SELECT COUNT(*)::int AS bad FROM "Employee"
     WHERE "monthlySalary" > 0 AND "shiftHours" > 0
       AND ("hourlyRate" != CEIL("hourlyRate")::numeric OR "overtimeRate" != CEIL("overtimeRate")::numeric);
  `);
  console.log(`  → Employee rows with decimals: ${v0.rows[0].bad} (already fixed)`);

  // STEP 2: Payroll table
  console.log('STEP 2: Payroll table...');
  const r2 = await pool.query(`
    WITH pay_calc AS (
      SELECT p.id,
             CEIL(p."monthlySalary" / (EXTRACT(DAY FROM (DATE(p.year::text || '-' || p.month::text || '-01') + INTERVAL '1 month' - INTERVAL '1 day'))::numeric * e."shiftHours")) AS new_hr
        FROM "Payroll" p
        JOIN "Employee" e ON e."employeeId" = p."employeeId"
       WHERE e."shiftHours" > 0 AND p."monthlySalary" > 0
    )
    UPDATE "Payroll"
       SET "hourlyRate"     = pc.new_hr,
           "otRate"        = pc.new_hr,
           "otAmount"      = ROUND((pc.new_hr * "otHours")::numeric, 2),
           "sundayEarnings"= ROUND((pc.new_hr * "sundayCount" * (SELECT "shiftHours" FROM "Employee" e WHERE e."employeeId" = "Payroll"."employeeId"))::numeric, 2),
           "grossSalary"   = ROUND((pc.new_hr * "totalHrs")::numeric, 2),
           "netSalary"     = ROUND((pc.new_hr * "totalHrs" + "bonus" + "incentive" + "arrear" - "totalDeductions")::numeric, 2),
           "updatedAt"     = NOW()
      FROM pay_calc pc
     WHERE "Payroll".id = pc.id;
  `);
  console.log(`  → ${r2.rowCount} Payroll rows updated`);

  // STEP 3: SalaryHistory sync
  console.log('STEP 3: SalaryHistory sync...');
  const r3 = await pool.query(`
    UPDATE "SalaryHistory" sh
       SET "netSalary" = p."netSalary"
      FROM "Payroll" p
     WHERE p."employeeId" = sh."employeeId" AND p.month = sh.month AND p.year = sh.year
       AND sh."netSalary" != p."netSalary";
  `);
  console.log(`  → ${r3.rowCount} SalaryHistory rows updated`);

  // STEP 4: Overtime - batch update
  console.log('STEP 4: Overtime table...');
  const r4 = await pool.query(`
    WITH ot_calc AS (
      SELECT o.id,
             CEIL(e."monthlySalary" / (EXTRACT(DAY FROM (DATE(EXTRACT(YEAR FROM o.date)::int::text || '-' || EXTRACT(MONTH FROM o.date)::int::text || '-01') + INTERVAL '1 month' - INTERVAL '1 day'))::numeric * e."shiftHours")) AS new_rate
        FROM "Overtime" o
        JOIN "Employee" e ON e."employeeId" = o."employeeId"
       WHERE e."monthlySalary" > 0 AND e."shiftHours" > 0
    )
    UPDATE "Overtime"
       SET rate = oc.new_rate,
           amount = ROUND((oc.new_rate * hours)::numeric, 2)
      FROM ot_calc oc
     WHERE "Overtime".id = oc.id;
  `);
  console.log(`  → ${r4.rowCount} Overtime rows updated`);

  // VERIFICATION
  console.log('\n=== VERIFICATION ===');

  const ve = await pool.query(`
    SELECT "employeeId", "fullName", "monthlySalary", "shiftHours", "hourlyRate", "overtimeRate"
      FROM "Employee" WHERE "monthlySalary" > 0 ORDER BY "employeeId";
  `);
  console.table(ve.rows);

  const vp = await pool.query(`
    SELECT "employeeId", month, year, "hourlyRate", "otRate", "grossSalary", "netSalary"
      FROM "Payroll" ORDER BY "employeeId";
  `);
  console.table(vp.rows);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
