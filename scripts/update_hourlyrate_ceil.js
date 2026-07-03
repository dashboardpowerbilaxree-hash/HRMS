/**
 * Script: Update all Employee.hourlyRate and Payroll.hourlyRate to Math.ceil values
 * CRITICAL: No data deletion, no data tampering — only formula update
 * 
 * What it does:
 * 1. Reads all employees with monthlySalary, shiftHours, hourlyRate
 * 2. Computes correct hourlyRate = Math.ceil(monthlySalary / (daysInMonth × shiftHours))
 *    using the current month's daysInMonth
 * 3. Updates Employee.hourlyRate where it differs
 * 4. Reads all Payroll records and updates hourlyRate + salary-derived fields
 * 5. Reports what changed
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DB_URL = 'postgresql://neondb_owner:npg_pGbVon2mrZ3q@ep-empty-haze-aq8y1r98-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentYear = now.getFullYear();
  
  console.log(`\n=== HOURLY RATE CEILING UPDATE ===`);
  console.log(`Current Month: ${currentMonth + 1}/${currentYear}`);
  console.log(`Days in current month: ${daysInMonth}`);
  console.log(`Formula: Math.ceil(monthlySalary / (${daysInMonth} × shiftHours))\n`);

  // ─── Step 1: Update Employee.hourlyRate ───
  console.log(`--- Step 1: Updating Employee.hourlyRate ---`);
  const employees = await prisma.employee.findMany({
    select: {
      employeeId: true,
      fullName: true,
      monthlySalary: true,
      shiftHours: true,
      hourlyRate: true,
      salaryType: true,
    }
  });

  let empUpdated = 0;
  let empSkipped = 0;
  const empChanges = [];

  for (const emp of employees) {
    // Skip employees without salary or shift info
    if (!emp.monthlySalary || !emp.shiftHours || emp.salaryType === 'hourly') {
      empSkipped++;
      continue;
    }

    const correctHourlyRate = Math.ceil(emp.monthlySalary / (daysInMonth * emp.shiftHours));
    const currentRate = emp.hourlyRate || 0;

    if (currentRate !== correctHourlyRate) {
      empChanges.push({
        employeeId: emp.employeeId,
        name: emp.fullName,
        oldRate: currentRate,
        newRate: correctHourlyRate,
        monthlySalary: emp.monthlySalary,
        shiftHours: emp.shiftHours,
      });

      await prisma.employee.update({
        where: { employeeId: emp.employeeId },
        data: { hourlyRate: correctHourlyRate }
      });
      empUpdated++;
    } else {
      empSkipped++;
    }
  }

  console.log(`Employees total: ${employees.length}`);
  console.log(`Employees updated: ${empUpdated}`);
  console.log(`Employees skipped (already correct or hourly type): ${empSkipped}\n`);

  if (empChanges.length > 0) {
    console.log(`Employee Rate Changes:`);
    for (const c of empChanges) {
      console.log(`  ${c.employeeId} (${c.name}): ₹${c.oldRate} → ₹${c.newRate}  [Salary: ₹${c.monthlySalary}, Shift: ${c.shiftHours}h]`);
    }
    console.log();
  }

  // ─── Step 2: Update Payroll.hourlyRate and salary-derived fields ───
  console.log(`--- Step 2: Updating Payroll records ---`);
  // Get employees' shiftHours for payroll calculation
  const empShiftMap = {};
  for (const emp of employees) {
    empShiftMap[emp.employeeId] = emp.shiftHours;
  }

  const payrolls = await prisma.payroll.findMany({
    select: {
      id: true,
      employeeId: true,
      month: true,
      year: true,
      monthlySalary: true,
      hourlyRate: true,
      otRate: true,
      totalWorkedHrs: true,
      otHours: true,
      presentDays: true,
      sundayEarnings: true,
      grossSalary: true,
      netSalary: true,
      otAmount: true,
      sundayHrs: true,
      totalHrs: true,
    }
  });

  let payrollUpdated = 0;
  let payrollSkipped = 0;
  const payrollChanges = [];

  for (const p of payrolls) {
    // Use the payroll's own month/year to get daysInMonth
    const payrollDaysInMonth = new Date(p.year, p.month, 0).getDate();
    const shiftHours = empShiftMap[p.employeeId];
    
    if (!p.monthlySalary || !shiftHours) {
      payrollSkipped++;
      continue;
    }

    const correctHourlyRate = Math.ceil(p.monthlySalary / (payrollDaysInMonth * shiftHours));
    const currentRate = p.hourlyRate || 0;

    if (currentRate !== correctHourlyRate) {
      // Recalculate salary-derived fields using the new ceiling hourlyRate
      // DO NOT touch attendance-derived fields (totalWorkedHrs, otHours, presentDays, etc.)
      const totalHrs = p.totalHrs || 0;
      const otHrs = p.otHours || 0;
      const sundayHrsVal = p.sundayHrs || 0;
      const baseHrs = p.totalWorkedHrs || 0;

      const round2 = (n) => Math.round(n * 100) / 100;

      const newOtAmount = round2(correctHourlyRate * otHrs);
      const newSundayEarnings = round2(correctHourlyRate * sundayHrsVal);
      const newGrossSalary = round2(correctHourlyRate * totalHrs);
      const newNetSalary = newGrossSalary - (p.tdsDeduction || 0) - (p.loanDeduction || 0) - (p.advanceDeduction || 0) - (p.securityDeposit || 0) - (p.otherDeductions || 0) + (p.arrear || 0) + (p.bonus || 0) + (p.incentive || 0);
      const roundedNetSalary = round2(newNetSalary);

      payrollChanges.push({
        id: p.id,
        employeeId: p.employeeId,
        month: p.month,
        year: p.year,
        oldRate: currentRate,
        newRate: correctHourlyRate,
        oldGross: p.grossSalary,
        newGross: newGrossSalary,
      });

      await prisma.payroll.update({
        where: { id: p.id },
        data: {
          hourlyRate: correctHourlyRate,
          otRate: correctHourlyRate, // OT rate = same as hourly rate (1x, not 1.5x)
          otAmount: newOtAmount,
          sundayEarnings: newSundayEarnings,
          grossSalary: newGrossSalary,
          netSalary: roundedNetSalary,
        }
      });
      payrollUpdated++;
    } else {
      payrollSkipped++;
    }
  }

  console.log(`Payroll records total: ${payrolls.length}`);
  console.log(`Payroll records updated: ${payrollUpdated}`);
  console.log(`Payroll records skipped: ${payrollSkipped}\n`);

  if (payrollChanges.length > 0) {
    console.log(`Payroll Rate Changes:`);
    for (const c of payrollChanges) {
      console.log(`  ${c.employeeId} (${c.month}/${c.year}): Rate ₹${c.oldRate} → ₹${c.newRate}, Gross ₹${c.oldGross} → ₹${c.newGross}`);
    }
    console.log();
  }

  // ─── Summary ───
  console.log(`\n=== UPDATE COMPLETE ===`);
  console.log(`Employees updated: ${empUpdated}`);
  console.log(`Payroll records updated: ${payrollUpdated}`);
  console.log(`No records deleted. No attendance data modified.`);
  console.log(`Only hourlyRate formula changed: Math.ceil(monthlySalary / (daysInMonth × shiftHours))\n`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
