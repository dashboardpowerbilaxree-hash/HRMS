// Quick sanity check for the early-out recompute helpers.
// Run with: node scripts/test-earlyout-recompute.js

// ─── Inline copies of the helpers (so we don't need to compile TS) ───

function getEffectiveShiftEndMinutes(shiftStart, shiftEnd) {
  if (!shiftEnd) return null;
  const eParts = shiftEnd.split(':').map(Number);
  let eH = eParts[0] || 0;
  const eM = eParts[1] || 0;

  if (shiftStart) {
    const sParts = shiftStart.split(':').map(Number);
    const sH = sParts[0] || 0;
    const sM = sParts[1] || 0;
    const shiftStartMin = sH * 60 + sM;
    let shiftEndMin = eH * 60 + eM;
    if (shiftEndMin <= shiftStartMin && eH < 12) {
      eH = eH + 12;
      shiftEndMin = eH * 60 + eM;
    }
    return shiftEndMin;
  }

  return eH * 60 + eM;
}

function isActuallyEarlyOut(checkOut, shiftStart, shiftEnd, graceMinutes = 5) {
  if (!checkOut) return false;
  const shiftEndMin = getEffectiveShiftEndMinutes(shiftStart, shiftEnd);
  if (shiftEndMin == null) return false;

  const parts = checkOut.split(':').map(Number);
  const coH = parts[0] || 0;
  const coM = parts[1] || 0;
  const checkOutMin = coH * 60 + coM;

  return checkOutMin < (shiftEndMin - graceMinutes);
}

// ─── Test cases ───
const tests = [
  // [description, checkOut, shiftStart, shiftEnd, expected]
  ['14:00 shift, checkout AT 14:02 → NOT early-out', '14:02', '10:00', '14:00', false],
  ['14:00 shift, checkout AT 14:20 → NOT early-out', '14:20', '10:00', '14:00', false],
  ['14:00 shift, checkout AT 14:10 → NOT early-out', '14:10', '10:00', '14:00', false],
  ['14:00 shift, checkout AT 13:57 → NOT early-out (within 5min grace)', '13:57', '10:00', '14:00', false],
  ['14:00 shift, checkout AT 13:50 → early-out (left 10min early)', '13:50', '10:00', '14:00', true],
  ['14:00 shift, checkout AT 13:00 → early-out (left 1h early)', '13:00', '10:00', '14:00', true],

  // 12-hour format fix-up: shiftEnd "02:00" should be interpreted as 14:00
  ['02:00 shift (12h=14:00), checkout AT 14:02 → NOT early-out', '14:02', '10:00', '02:00', false],
  ['02:00 shift (12h=14:00), checkout AT 13:50 → early-out', '13:50', '10:00', '02:00', true],

  // Standard 9-hour shift (10-19:00) — should still work
  ['19:00 shift, checkout AT 19:30 → NOT early-out', '19:30', '10:00', '19:00', false],
  ['19:00 shift, checkout AT 18:30 → early-out', '18:30', '10:00', '19:00', true],
  ['19:00 shift, checkout AT 18:55 → NOT early-out (within grace)', '18:55', '10:00', '19:00', false],

  // Edge cases
  ['No shiftEnd → NOT early-out (no check)', '14:02', '10:00', null, false],
  ['No checkOut → NOT early-out', null, '10:00', '14:00', false],

  // 5-hour shift (10-15:00)
  ['15:00 shift, checkout AT 15:03 → NOT early-out', '15:03', '10:00', '15:00', false],
  ['15:00 shift, checkout AT 14:30 → early-out', '14:30', '10:00', '15:00', true],
];

let pass = 0, fail = 0;
console.log('Running early-out recompute tests...\n');
for (const [desc, checkOut, sStart, sEnd, expected] of tests) {
  const result = isActuallyEarlyOut(checkOut, sStart, sEnd);
  const ok = result === expected;
  console.log(`${ok ? '✓' : '✗'} ${desc}`);
  console.log(`    checkOut=${checkOut}, shiftStart=${sStart}, shiftEnd=${sEnd} → got=${result}, expected=${expected}`);
  if (ok) pass++; else fail++;
}
console.log(`\n${pass}/${pass + fail} tests passed`);
if (fail > 0) process.exit(1);
