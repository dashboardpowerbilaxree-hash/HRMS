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
// FREELANCE LATE/EARLY APPLICABILITY
//
// Per user instruction (Aug 13, 2026):
//   Freelance employees have flexible hours — they just need to
//   complete their working hours. Late-entry and early-out penalties
//   should NOT apply to them, EXCEPT when their shift is long enough
//   (4+ hours) that punctuality matters.
//
//   Examples:
//     - Reena Gujjar (EMP-011): Freelance, shiftHours=4 (10:00-14:00)
//       → APPLY late/early. She comes after 10:15 → mark late.
//     - Prakash    (EMP-034): Freelance, shiftHours=2 (17:00-19:00)
//       → SKIP late/early. Only half-day rule applies (worked < 1h).
//     - Mayank     (EMP-026): Freelance, shiftHours=1 (10:00-11:00)
//       → SKIP late/early. Only half-day rule applies (worked < 0.5h).
//
//   Full Time / Part Time employees: ALWAYS apply late/early (default).
// ════════════════════════════════════════════════════════════════

/**
 * Determine whether late-entry and early-out flags should be applied
 * for a given employee.
 *
 * Rules:
 *   - Non-Freelance (Full Time / Part Time): ALWAYS apply late/early
 *   - Freelance with shiftHours >= 4: APPLY late/early
 *   - Freelance with shiftHours  < 4: SKIP late/early
 *
 * @param employee  Employee object with at least employmentType and shiftHours
 * @returns true if late/early should be applied, false otherwise
 */
export function shouldApplyLateEarly(employee: {
  employmentType?: string | null;
  shiftHours?: number | null;
}): boolean {
  // Non-freelance: always apply late/early
  if (employee.employmentType !== 'Freelance') return true;
  // Freelance: only apply if shift is 4+ hours (regular shift like Reena's)
  return (employee.shiftHours || 0) >= 4;
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

// ════════════════════════════════════════════════════════════════
// EARLY-OUT RECOMPUTE UTILITIES
//
// Problem being solved:
//   When attendance was uploaded for employees with short shifts
//   (e.g., 10:00-14:00 = 4h), the upload routes calculated
//   `earlyOut` by comparing `checkOut` against `employee.shiftEnd`
//   WITHOUT applying the 12-hour-format fix-up. So:
//     - If shiftEnd was stored as "02:00" (12-hour, meaning 2 PM),
//       the early-out check treated it as 2 AM → checkouts at 14:02
//       were considered "early" by accident (the math was wrong but
//       the result was lenient).
//     - If the employee's shiftEnd was later updated (e.g., from
//       "19:00" to "14:00") but attendance records were already
//       uploaded, the stored `earlyOut=true` flag became stale —
//       the employee is now correctly leaving at 14:00 (her actual
//       shift end), but old records still show "Early Out".
//
//   Per user's strict instruction: NO data tampering, NO deletion.
//   So we recompute the early-out status on-the-fly in every
//   display/calculation route, using the CURRENT employee.shiftEnd
//   (with the same 12-hour-format fix-up used for half-day).
//
//   A small grace period (default 5 minutes) is applied so that
//   employees who leave 1-5 minutes before their shift end are NOT
//   penalized as "Early Out" — this matches typical HR practice.
// ════════════════════════════════════════════════════════════════

/**
 * Compute the effective shift-end time in minutes from midnight,
 * with a 12-hour-format fix-up (same logic as getActualShiftHours).
 *
 * Examples:
 *   shiftStart="10:00", shiftEnd="14:00" → 840  (14:00)
 *   shiftStart="10:00", shiftEnd="02:00" → 840  (14:00, 12h fix-up)
 *   shiftStart="10:00", shiftEnd="19:00" → 1140 (19:00)
 *   shiftStart=null,    shiftEnd="14:00" → 840
 *   shiftStart=null,    shiftEnd=null    → null (no early-out check)
 */
export function getEffectiveShiftEndMinutes(
  shiftStart: string | null | undefined,
  shiftEnd: string | null | undefined,
): number | null {
  if (!shiftEnd) return null;
  const eParts = shiftEnd.split(':').map(Number);
  let eH = eParts[0] || 0;
  const eM = eParts[1] || 0;

  // 12-hour format fix-up: if shiftStart is given and shiftEnd "earlier"
  // than shiftStart, assume shiftEnd is PM and add 12 hours.
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

/**
 * Recompute whether an attendance record should be treated as an
 * early-out, based on the employee's ACTUAL shift end time (with
 * 12-hour fix-up) and a small grace period. Does NOT modify any data.
 *
 * Rule: a record is an early-out if `checkOut` is more than
 *   `graceMinutes` BEFORE the effective shift end time.
 *
 * Examples (graceMinutes=5):
 *   shiftEnd=14:00, checkOut=14:02 → 842 < 840-5=835? NO  → NOT early-out ✓
 *   shiftEnd=14:00, checkOut=13:55 → 835 < 835?        NO  → NOT early-out (within grace) ✓
 *   shiftEnd=14:00, checkOut=13:50 → 830 < 835?        YES → early-out ✓
 *   shiftEnd=02:00 (=14:00 via fix-up), checkOut=14:02 → same as above ✓
 *   shiftEnd=null → no early-out check → false
 */
export function isActuallyEarlyOut(
  checkOut: string | null | undefined,
  shiftStart: string | null | undefined,
  shiftEnd: string | null | undefined,
  graceMinutes: number = 5,
): boolean {
  if (!checkOut) return false;
  const shiftEndMin = getEffectiveShiftEndMinutes(shiftStart, shiftEnd);
  if (shiftEndMin == null) return false;

  const parts = checkOut.split(':').map(Number);
  const coH = parts[0] || 0;
  const coM = parts[1] || 0;
  const checkOutMin = coH * 60 + coM;

  return checkOutMin < (shiftEndMin - graceMinutes);
}

/**
 * Get the corrected status of an attendance record, recomputing half-day
 * AND early-out status on-the-fly. Does NOT modify the input record.
 *
 * - If the stored status is 'half-day' / 'half_day' / halfDay=true:
 *     - Recompute half-day using actual shift hours.
 *     - If genuinely a half-day → 'half-day'.
 *     - Else derive from lateEntry/earlyOut flags (recomputed).
 *
 * - If the stored status is 'early-out' OR earlyOut=true:
 *     - Recompute early-out using actual shift end (with 12h fix-up
 *       and 5-minute grace period).
 *     - If NOT actually an early-out → fix to 'present' or 'late'.
 *     - Else keep as 'early-out'.
 *
 * - Otherwise, return stored status as-is.
 *
 * @param rec  The attendance record. Must have: status, halfDay?,
 *             totalHours, lateEntry?, earlyOut?, checkOut?
 * @param actualShiftHours  The employee's actual shift hours (from
 *                          getActualShiftHours)
 * @param shiftStart  Optional employee.shiftStart — needed for
 *                    early-out recompute (12h fix-up)
 * @param shiftEnd    Optional employee.shiftEnd — needed for
 *                    early-out recompute
 * @returns The corrected status string
 */
export function recomputeStatus(
  rec: {
    status: string;
    halfDay?: boolean | null;
    totalHours?: number | null;
    lateEntry?: boolean | null;
    earlyOut?: boolean | null;
    checkOut?: string | null;
  },
  actualShiftHours: number,
  shiftStart?: string | null | undefined,
  shiftEnd?: string | null | undefined,
  applyLateEarly: boolean = true,
): string {
  // ── Freelance short-shift suppression ──
  // If late/early should NOT apply (Freelance with shiftHours < 4),
  // suppress all late/early statuses. Half-day rule still applies
  // because freelancers must complete their working hours.
  if (!applyLateEarly) {
    // Half-day rule still applies: worked < half of actual shift → half-day
    if (isActuallyHalfDay(rec.totalHours, actualShiftHours)) return 'half-day';
    // Pass through non-late/early statuses unchanged
    const s = rec.status;
    if (s === 'absent' || s === 'weekly-off' || s === 'holiday' || s === 'leave') return s;
    // For any other stored status (including 'late', 'early-out', 'present',
    // 'half-day' wrongly marked), return 'present' since late/early are suppressed
    return 'present';
  }

  const isStoredHalfDay = rec.status === 'half-day' || rec.status === 'half_day' || !!rec.halfDay;

  // ── Half-day recompute ──
  if (isStoredHalfDay) {
    if (isActuallyHalfDay(rec.totalHours, actualShiftHours)) {
      return 'half-day';
    }
    // Was wrongly flagged as half-day. Derive correct status from
    // lateEntry flag and recomputed early-out flag.
    const actuallyEarlyOut =
      shiftStart !== undefined && shiftEnd !== undefined
        ? isActuallyEarlyOut(rec.checkOut, shiftStart, shiftEnd)
        : !!rec.earlyOut;
    if (rec.lateEntry) return 'late';
    if (actuallyEarlyOut) return 'early-out';
    return 'present';
  }

  // ── Early-out recompute ──
  // Only recompute if shift info is provided (otherwise fall back to stored flag).
  const isStoredEarlyOut = rec.status === 'early-out' || !!rec.earlyOut;
  if (isStoredEarlyOut && shiftStart !== undefined && shiftEnd !== undefined) {
    const actuallyEarlyOut = isActuallyEarlyOut(rec.checkOut, shiftStart, shiftEnd);
    if (!actuallyEarlyOut) {
      // Stored early-out was wrong (employee left at/after actual shift end).
      // Derive correct status: if lateEntry, show 'late'; otherwise 'present'.
      if (rec.lateEntry) return 'late';
      return 'present';
    }
    // Genuinely an early-out — keep the label.
    return 'early-out';
  }

  return rec.status;
}

/**
 * Recompute the raw `earlyOut` boolean flag for an attendance record,
 * using the employee's actual shift end (with 12h fix-up and 5-minute
 * grace period). Use this to override the stored flag in display/export
 * routes WITHOUT modifying the database.
 *
 * Returns `true` if the record should be treated as an early-out.
 *
 * Pass `applyLateEarly=false` for Freelance employees with short shifts
 * (shiftHours < 4) — they should never be marked as early-out.
 */
export function recomputeEarlyOutFlag(
  rec: {
    checkOut?: string | null;
    earlyOut?: boolean | null;
  },
  shiftStart: string | null | undefined,
  shiftEnd: string | null | undefined,
  applyLateEarly: boolean = true,
): boolean {
  // If late/early should NOT apply, never mark as early-out
  if (!applyLateEarly) return false;
  // If we have shift info, recompute; otherwise fall back to stored flag.
  if (shiftStart !== undefined && shiftEnd !== undefined && (shiftStart || shiftEnd)) {
    return isActuallyEarlyOut(rec.checkOut, shiftStart, shiftEnd);
  }
  return !!rec.earlyOut;
}

/**
 * Recompute the raw `lateEntry` boolean flag for an attendance record.
 *
 * The stored `lateEntry` flag is set at attendance-write time based on
 * the employee's shiftStart + 15-min grace. We do NOT recompute it
 * against shiftStart here (since the shift may have been updated since
 * the record was written, just like for early-out). For now, we trust
 * the stored flag — BUT we suppress it for Freelance employees with
 * short shifts (shiftHours < 4), since late marking should not apply
 * to them.
 *
 * Pass `applyLateEarly=false` for Freelance employees with short shifts.
 *
 * Returns `true` if the record should be treated as a late entry.
 */
export function recomputeLateEntryFlag(
  rec: {
    lateEntry?: boolean | null;
  },
  applyLateEarly: boolean = true,
): boolean {
  if (!applyLateEarly) return false;
  return !!rec.lateEntry;
}
