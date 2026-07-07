// Test the half-day recompute logic for Reena Gujjar's scenario
// Reena: shift 10:00-14:00 (4h), worked 4.01h → should NOT be half-day

// Simulate the getActualShiftHours function
function getActualShiftHours(shiftHours, shiftStart, shiftEnd) {
  let actualShiftHours = shiftHours || 9;
  if (shiftStart && shiftEnd) {
    const sParts = shiftStart.split(':').map(Number);
    const eParts = shiftEnd.split(':').map(Number);
    const sH = sParts[0] || 0, sM = sParts[1] || 0;
    let eH = eParts[0] || 0, eM = eParts[1] || 0;
    let calculatedShift = ((eH * 60 + eM) - (sH * 60 + sM)) / 60;
    if (calculatedShift <= 0 && eH < 12) {
      eH = eH + 12;
      calculatedShift = ((eH * 60 + eM) - (sH * 60 + sM)) / 60;
    }
    if (calculatedShift > 0) actualShiftHours = calculatedShift;
  }
  return actualShiftHours;
}

function isActuallyHalfDay(totalHours, actualShiftHours) {
  return (totalHours || 0) < actualShiftHours / 2;
}

function recomputeStatus(rec, actualShiftHours) {
  if (rec.status !== 'half-day' && rec.status !== 'half_day' && !rec.halfDay) {
    return rec.status;
  }
  if (isActuallyHalfDay(rec.totalHours, actualShiftHours)) {
    return 'half-day';
  }
  if (rec.lateEntry && rec.earlyOut) return 'late';
  if (rec.lateEntry) return 'late';
  if (rec.earlyOut) return 'early-out';
  return 'present';
}

console.log('=== TEST 1: Reena Gujjar — shift 10:00-14:00 (24h format) ===');
const shiftHrs1 = getActualShiftHours(9, '10:00', '14:00');
console.log('Actual shift hours:', shiftHrs1, '(expected: 4)');

const rec1 = { status: 'half-day', halfDay: true, totalHours: 4.01, lateEntry: false, earlyOut: false };
const result1 = recomputeStatus(rec1, shiftHrs1);
console.log('Recomputed status:', result1, '(expected: present)');
console.log('');

console.log('=== TEST 2: Reena Gujjar — shift 10:00-02:00 (12h format, means 14:00) ===');
const shiftHrs2 = getActualShiftHours(9, '10:00', '02:00');
console.log('Actual shift hours:', shiftHrs2, '(expected: 4)');

const rec2 = { status: 'half-day', halfDay: true, totalHours: 3.59, lateEntry: false, earlyOut: false };
const result2 = recomputeStatus(rec2, shiftHrs2);
console.log('Recomputed status:', result2, '(expected: present)');
console.log('');

console.log('=== TEST 3: Jaya Gujar — 4h shift, worked 4.10h, was marked half-day ===');
const shiftHrs3 = getActualShiftHours(9, '10:00', '14:00');
const rec3 = { status: 'half-day', halfDay: true, totalHours: 4.10, lateEntry: false, earlyOut: true };
const result3 = recomputeStatus(rec3, shiftHrs3);
console.log('Recomputed status:', result3, '(expected: early-out)');
console.log('');

console.log('=== TEST 4: Genuine half-day — 9h shift, worked only 3h ===');
const shiftHrs4 = getActualShiftHours(9, '09:00', '18:00');
console.log('Actual shift hours:', shiftHrs4, '(expected: 9)');
const rec4 = { status: 'half-day', halfDay: true, totalHours: 3.0, lateEntry: false, earlyOut: false };
const result4 = recomputeStatus(rec4, shiftHrs4);
console.log('Recomputed status:', result4, '(expected: half-day)');
console.log('');

console.log('=== TEST 5: Genuine half-day — 4h shift, worked only 1h ===');
const shiftHrs5 = getActualShiftHours(4, '10:00', '14:00');
const rec5 = { status: 'half-day', halfDay: true, totalHours: 1.0, lateEntry: false, earlyOut: false };
const result5 = recomputeStatus(rec5, shiftHrs5);
console.log('Recomputed status:', result5, '(expected: half-day)');
console.log('');

console.log('=== TEST 6: Normal present record — should NOT be recomputed ===');
const shiftHrs6 = getActualShiftHours(9, '10:00', '19:00');
const rec6 = { status: 'present', halfDay: false, totalHours: 8.55, lateEntry: false, earlyOut: false };
const result6 = recomputeStatus(rec6, shiftHrs6);
console.log('Recomputed status:', result6, '(expected: present)');
console.log('');

console.log('=== TEST 7: Absent record — should NOT be recomputed ===');
const rec7 = { status: 'absent', halfDay: false, totalHours: 0, lateEntry: false, earlyOut: false };
const result7 = recomputeStatus(rec7, 9);
console.log('Recomputed status:', result7, '(expected: absent)');
console.log('');

console.log('=== TEST 8: Late + Early-out (was wrongly marked half-day) ===');
const shiftHrs8 = getActualShiftHours(4, '10:00', '14:00');
const rec8 = { status: 'half-day', halfDay: true, totalHours: 3.58, lateEntry: true, earlyOut: true };
const result8 = recomputeStatus(rec8, shiftHrs8);
console.log('Recomputed status:', result8, '(expected: late)');
