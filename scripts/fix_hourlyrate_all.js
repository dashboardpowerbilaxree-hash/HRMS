/**
 * Fix ALL employees' hourlyRate and overtimeRate
 * Uses daysInMonth based on the employee's createdAt month
 * ONLY touches hourlyRate and overtimeRate - NO other data changes
 */
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pGbVon2mrZ3q@ep-empty-haze-aq8y1r98-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  const client = await pool.connect();
  
  try {
    // Get all employees
    const result = await client.query(
      'SELECT "employeeId", "fullName", "monthlySalary", "shiftHours", "hourlyRate", "overtimeRate", "createdAt" FROM "Employee" ORDER BY "employeeId"'
    );
    
    console.log(`Total employees: ${result.rows.length}`);
    console.log('='.repeat(100));
    
    let fixedCount = 0;
    let alreadyCorrect = 0;
    
    for (const emp of result.rows) {
      const created = new Date(emp.createdAt);
      // Get daysInMonth for the month the employee was CREATED
      const daysInMonth = new Date(created.getFullYear(), created.getMonth() + 1, 0).getDate();
      
      // Calculate correct rate using the HRMS formula
      const correctRate = Math.round((emp.monthlySalary / (daysInMonth * emp.shiftHours)) * 100) / 100;
      const correctOT = correctRate;
      
      const rateMismatch = Math.abs(emp.hourlyRate - correctRate) > 0.01;
      const otMismatch = Math.abs(emp.overtimeRate - correctOT) > 0.01;
      
      if (rateMismatch || otMismatch) {
        // UPDATE only hourlyRate and overtimeRate
        await client.query(
          'UPDATE "Employee" SET "hourlyRate" = $1, "overtimeRate" = $2 WHERE "employeeId" = $3',
          [correctRate, correctOT, emp.employeeId]
        );
        fixedCount++;
        console.log(`FIXED: ${emp.employeeId} | ${emp.fullName} | dim=${daysInMonth} | Rate: ${emp.hourlyRate} → ${correctRate} | OT: ${emp.overtimeRate} → ${correctOT}`);
      } else {
        alreadyCorrect++;
        console.log(`OK: ${emp.employeeId} | ${emp.fullName} | dim=${daysInMonth} | Rate: ${emp.hourlyRate}`);
      }
    }
    
    console.log('='.repeat(100));
    console.log(`\nSUMMARY: ${fixedCount} fixed, ${alreadyCorrect} already correct, ${result.rows.length} total`);
    
    // VERIFICATION: Re-check Sujeet specifically
    const sujeet = await client.query(
      'SELECT "employeeId", "fullName", "monthlySalary", "shiftHours", "hourlyRate", "overtimeRate" FROM "Employee" WHERE "employeeId" = $1',
      ['EMP-424']
    );
    console.log(`\nSUJEET VERIFICATION: hourlyRate=${sujeet.rows[0].hourlyRate}, overtimeRate=${sujeet.rows[0].overtimeRate}`);
    
    // VERIFICATION: Check no whole numbers remain that shouldn't be
    const wholeNums = await client.query(
      'SELECT "employeeId", "fullName", "hourlyRate" FROM "Employee" WHERE "hourlyRate" = FLOOR("hourlyRate") ORDER BY "employeeId"'
    );
    console.log(`\nEmployees with whole number rates: ${wholeNums.rows.length}`);
    wholeNums.rows.forEach(r => console.log(`  ${r.employeeId} | ${r.fullName} | ${r.hourlyRate}`));
    
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
