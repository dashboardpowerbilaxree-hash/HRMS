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
