/**
 * Payroll & Attendance Cutoff Calculation Utilities
 *
 * Problem being solved:
 *   - Monthly attendance was marking FUTURE days as "absent"
 *   - Payslip Sunday counting was counting ALL Sundays in the month,
 *     even those that haven't happened yet (e.g. generating payslip on
 *     the 18th counted all 4-5 Sundays instead of only the 2 that passed)
 *   - When an employee leaves mid-month, counting should stop at their
 *     relieving date, not the end of the month
 *
 * Solution: compute an "effective cutoff day" and use it to cap every
 * loop that iterates over days of the month.
 */

/**
 * Compute the effective cutoff day-of-month for payroll/attendance calculation.
 *
 * Rules (in priority order):
 *   1. If the employee has a relievingDate in this month or earlier,
 *      cap at that day (employee left mid-month).
 *   2. If this is the current month (or a future month), cap at today's day.
 *   3. Otherwise (past month), use the full month.
 *
 * @param year         Year of the period being calculated (e.g. 2026)
 * @param month        Month number 1-12 (NOT 0-indexed)
 * @param daysInMonth  Total days in the target month (e.g. 30)
 * @param relievingDate  Optional employee relieving/exit date (null = still active)
 * @returns integer day-of-month (1..daysInMonth) to cap all calculations at
 */
export function getEffectiveCutoffDay(
  year: number,
  month: number,
  daysInMonth: number,
  relievingDate: Date | null | undefined,
): number {
  const today = new Date();
  // Strip the time portion for clean day comparisons
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 1); // exclusive

  // Default: full month
  let cutoff = daysInMonth;

  // Rule 2 — current or future month: cap at today
  if (todayMidnight < periodEnd) {
    // If today is inside this month, use today's day; if today is past this
    // month, todayMidnight >= periodEnd so we skip this branch.
    if (todayMidnight >= periodStart) {
      cutoff = Math.min(cutoff, today.getDate());
    } else {
      // Future month — nothing has happened yet; cutoff = day 0 means
      // "no days should be counted". We return 0 to signal "no elapsed days".
      cutoff = 0;
    }
  }

  // Rule 1 — relieving date cap
  if (relievingDate) {
    const rd = new Date(relievingDate);
    const rdMidnight = new Date(rd.getFullYear(), rd.getMonth(), rd.getDate());
    if (rdMidnight >= periodStart && rdMidnight < periodEnd) {
      // Relieving date is inside this month — cap at that day
      cutoff = Math.min(cutoff, rdMidnight.getDate() + 1); // +1 to INCLUDE the relieving day itself
    } else if (rdMidnight < periodStart) {
      // Employee left BEFORE this month — no days should be counted
      cutoff = 0;
    }
    // If relieving date is AFTER this month, ignore it (cap stays as today/full month)
  }

  return Math.max(0, Math.min(cutoff, daysInMonth));
}

/**
 * Count Sundays in a month up to (and including) the cutoff day.
 *
 * @param year
 * @param month       1-12
 * @param cutoffDay   Day of month to stop at (inclusive). Use daysInMonth for full month.
 */
export function countSundaysUpTo(
  year: number,
  month: number,
  cutoffDay: number,
): number {
  let sundays = 0;
  for (let d = 1; d <= cutoffDay; d++) {
    if (new Date(year, month - 1, d).getDay() === 0) sundays++;
  }
  return sundays;
}

/**
 * Count total working days (excluding Sundays) up to (and including) the cutoff day.
 * Holidays are subtracted separately by the caller (since holidays require a DB lookup).
 *
 * @param year
 * @param month       1-12
 * @param cutoffDay   Day of month to stop at (inclusive). Use daysInMonth for full month.
 */
export function countWorkingDaysUpTo(
  year: number,
  month: number,
  cutoffDay: number,
): number {
  let working = 0;
  for (let d = 1; d <= cutoffDay; d++) {
    if (new Date(year, month - 1, d).getDay() !== 0) working++;
  }
  return working;
}

/**
 * Count holidays that fall on or before the cutoff day.
 */
export function countHolidaysUpTo(
  holidays: { date: Date }[],
  cutoffDay: number,
): number {
  return holidays.filter((h) => {
    const hd = new Date(h.date);
    return hd.getDate() <= cutoffDay;
  }).length;
}

/**
 * Filter an attendance record list to only those on or before the cutoff day.
 * Defensive: prevents any future-dated rows from polluting calculations.
 */
export function filterAttendanceUpTo<T extends { date: Date }>(
  attendance: T[],
  year: number,
  month: number,
  cutoffDay: number,
): T[] {
  return attendance.filter((a) => {
    const d = new Date(a.date);
    // Ensure record is in the target month and on/before the cutoff day
    return (
      d.getFullYear() === year &&
      d.getMonth() + 1 === month &&
      d.getDate() <= cutoffDay
    );
  });
}

// ════════════════════════════════════════════════════════════════
// HALF-DAY RECOMPUTE UTILITIES
//
// Problem being solved:
//   When attendance was uploaded for employees with short shifts
//   (e.g., 10:00-14:00 = 4h), the upload routes calculated
//   `actualShiftHours` from shiftStart/shiftEnd. If shiftEnd was
//   stored as "02:00" (12-hour format) instead of "14:00" (24-hour),
//   `calculatedShift` went negative, fell back to default `shiftHours`
//   (often 9h), and the half-day threshold became 9/2 = 4.5h. A full
//   4h shift was then wrongly flagged as half-day.
//
//   The upload routes (bulk-upload, attendance POST, attendance/[id]
//   PUT) have been patched to handle the 12-hour format. But existing
//   DB records still carry the wrong `status='half-day'` and
//   `halfDay=true` flags. We must NOT modify data (per user's strict
//   instruction). Instead, we recompute the half-day status on-the-fly
//   in every display/calculation route.
// ════════════════════════════════════════════════════════════════

/**
 * Compute the actual shift duration in hours from shiftStart/shiftEnd,
 * with a 12-hour-format fix-up. Falls back to `shiftHours` (or 9) if
 * parsing fails.
 *
 * Examples:
 *   shiftStart="10:00", shiftEnd="14:00" → 4
 *   shiftStart="10:00", shiftEnd="02:00" → 4 (12h fix-up: 02+12=14)
 *   shiftStart="09:00", shiftEnd="18:00" → 9
 *   shiftStart=null,    shiftEnd=null    → shiftHours || 9
 */
export function getActualShiftHours(
  shiftHours: number | null | undefined,
  shiftStart: string | null | undefined,
  shiftEnd: string | null | undefined,
): number {
  let actualShiftHours = shiftHours || 9;
  if (shiftStart && shiftEnd) {
    const sParts = shiftStart.split(':').map(Number);
    const eParts = shiftEnd.split(':').map(Number);
    const sH = sParts[0] || 0, sM = sParts[1] || 0;
    let eH = eParts[0] || 0, eM = eParts[1] || 0;
    let calculatedShift = ((eH * 60 + eM) - (sH * 60 + sM)) / 60;
    // 12-hour format fix-up: if end "earlier" than start, assume PM and add 12h
    if (calculatedShift <= 0 && eH < 12) {
      eH = eH + 12;
      calculatedShift = ((eH * 60 + eM) - (sH * 60 + sM)) / 60;
    }
    if (calculatedShift > 0) actualShiftHours = calculatedShift;
  }
  return actualShiftHours;
}

/**
 * Recompute whether an attendance record should be treated as a half-day,
 * based on the employee's ACTUAL shift hours (not the stored shiftHours
 * default). This corrects records that were wrongly flagged as half-day
 * due to the 12-hour format bug in upload routes.
 *
 * Returns `true` if the record should be treated as a half-day, `false`
 * if it should be treated as a full present day.
 *
 * Rule: a record is a half-day if `totalHours < actualShiftHours / 2`.
 *   - shift=4h, worked=4h → 4 < 2 → false → full present ✓
 *   - shift=4h, worked=1h → 1 < 2 → true  → half-day ✓
 *   - shift=9h, worked=3h → 3 < 4.5 → true → half-day ✓
 */
export function isActuallyHalfDay(
  totalHours: number | null | undefined,
  actualShiftHours: number,
): boolean {
  return (totalHours || 0) < actualShiftHours / 2;
}

/**
 * Get the corrected status of an attendance record, recomputing half-day
 * status on-the-fly. Does NOT modify the input record.
 *
 * - If the stored status is NOT 'half-day' / 'half_day', returns it as-is.
 * - If the stored status IS 'half-day' but the record was actually a full
 *   shift (worked >= half the actual shift), returns 'present' (or 'late'
 *   / 'early-out' based on the stored lateEntry/earlyOut flags).
 * - If the record was genuinely a half-day, returns 'half-day'.
 *
 * @param rec  The attendance record. Must have: status, halfDay?,
 *             totalHours, lateEntry?, earlyOut?
 * @param actualShiftHours  The employee's actual shift hours (from
 *                          getActualShiftHours)
 * @returns The corrected status string
 */
export function recomputeStatus(
  rec: {
    status: string;
    halfDay?: boolean | null;
    totalHours?: number | null;
    lateEntry?: boolean | null;
    earlyOut?: boolean | null;
  },
  actualShiftHours: number,
): string {
  // Only recompute records currently marked as half-day
  if (rec.status !== 'half-day' && rec.status !== 'half_day' && !rec.halfDay) {
    return rec.status;
  }

  // Recompute: is this actually a half-day?
  if (isActuallyHalfDay(rec.totalHours, actualShiftHours)) {
    return 'half-day';
  }

  // Was wrongly flagged as half-day. Derive the correct status from the
  // stored lateEntry / earlyOut flags so the UI shows the right label.
  if (rec.lateEntry && rec.earlyOut) return 'late';
  if (rec.lateEntry) return 'late';
  if (rec.earlyOut) return 'early-out';
  return 'present';
}
