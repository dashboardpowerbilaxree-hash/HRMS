/**
 * ERP ↔ HRMS Leave Integration — Shared helpers
 *
 * SAFETY:
 * - This file is NEW (does not modify any existing code)
 * - Only used by NEW API routes: /api/leaves/erp-pull and /api/leaves/erp-push
 * - Existing /api/leaves routes do NOT import or use this file
 *
 * Matching strategy:
 * - HRMS Employee records do NOT have email or mobile populated
 * - Only safe matching key is the full name (case-insensitive, trimmed)
 * - Unmatched ERP users get employeeId='ERP-UNKNOWN' for manual HR review
 */

// ERP production URL — fall back to env var if set
export const ERP_BASE_URL =
  process.env.ERP_BASE_URL || 'https://erp-ea.vercel.app';

// Shared API key for cross-system auth (both projects must use the same key)
// Falls back to a default if env var is not set, so initial deployment works
export const INTEGRATION_API_KEY =
  process.env.HRMS_ERP_INTEGRATION_KEY || 'laxree-hrms-erp-integration-2026';

// Marker prefix embedded in HRMS Leave.reason field to identify ERP-originated leaves
// Format: "[ERP:<erpUserId>] <original-reason>"
export const ERP_MARKER_PREFIX = '[ERP:';
export const ERP_MARKER_SUFFIX = ']';

/**
 * Embed the ERP user ID inside the HRMS leave reason field.
 * Example: formatErpReason('user-emp6', 'Family function') => '[ERP:user-emp6] Family function'
 *
 * This avoids needing a new DB column while keeping the linkage traceable.
 */
export function formatErpReason(erpUserId: string, originalReason: string): string {
  return `${ERP_MARKER_PREFIX}${erpUserId}${ERP_MARKER_SUFFIX} ${originalReason || ''}`.trim();
}

/**
 * Parse an HRMS leave reason and extract the embedded ERP user ID (if any).
 * Returns null if the leave was NOT originated from ERP.
 */
export function parseErpUserId(reason: string | null): string | null {
  if (!reason) return null;
  const match = reason.match(/\[ERP:([^\]]+)\]/);
  return match ? match[1] : null;
}

/**
 * Match an ERP user to an HRMS employee by name (case-insensitive).
 *
 * @param erpUserName - The `name` field from ERP's User table
 * @param hrmsEmployees - Array of HRMS employees (must contain `employeeId` and `fullName`)
 * @returns The matched HRMS employeeId, or 'ERP-UNKNOWN' if no match
 */
export function matchErpUserToHrmsEmployee(
  erpUserName: string,
  hrmsEmployees: { employeeId: string; fullName: string }[]
): string {
  if (!erpUserName) return 'ERP-UNKNOWN';

  // Normalize: lowercase, trim, collapse spaces
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  const erpName = normalize(erpUserName);

  // Exact match (normalized)
  const exact = hrmsEmployees.find(e => normalize(e.fullName) === erpName);
  if (exact) return exact.employeeId;

  // Partial match: HRMS employee fullName contains ERP user name OR vice versa
  const partial = hrmsEmployees.find(e => {
    const hrmsName = normalize(e.fullName);
    return hrmsName.includes(erpName) || erpName.includes(hrmsName);
  });
  if (partial) return partial.employeeId;

  // No match found — HR will need to manually reassign the employeeId later
  return 'ERP-UNKNOWN';
}

/**
 * Map ERP leave type to HRMS leave type with `ERP_` prefix.
 * This keeps ERP-originated leaves visually distinct in the HRMS dashboard.
 */
export function mapErpLeaveType(erpLeaveType: string): string {
  const t = (erpLeaveType || 'CASUAL').toUpperCase();
  return `ERP_${t}`;
}

/**
 * Convert an ERP leave record (from ERP's /api/leaves response) into an
 * HRMS-compatible Leave.create() payload.
 *
 * Note: This does NOT call the DB — it only shapes the data.
 */
export function erpLeaveToHrmsPayload(
  erpLeave: any,
  hrmsEmployeeId: string
): {
  employeeId: string;
  type: string;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: string;
} {
  return {
    employeeId: hrmsEmployeeId,
    type: mapErpLeaveType(erpLeave.leaveType),
    startDate: new Date(erpLeave.fromDate),
    endDate: new Date(erpLeave.toDate),
    days: erpLeave.totalDays || 1,
    reason: formatErpReason(erpLeave.userId, erpLeave.reason || ''),
    status: 'pending',
  };
}

/**
 * Helper: call ERP's /api/leaves endpoint to fetch leaves.
 */
export async function fetchErpLeaves(status?: string): Promise<any[]> {
  const url = `${ERP_BASE_URL}/api/leaves${status ? `?status=${status}` : ''}`;
  const res = await fetch(url, {
    headers: { 'x-integration-key': INTEGRATION_API_KEY },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`ERP /api/leaves returned HTTP ${res.status}`);
  }
  const data = await res.json();
  // ERP returns { leaves: [...] }
  return Array.isArray(data) ? data : (data.leaves || []);
}

/**
 * Helper: push leave status update back to ERP via ERP's /api/leaves/hrms-update endpoint.
 */
export async function pushLeaveStatusToErp(
  erpLeaveId: string,
  status: string,
  approvedBy?: string
): Promise<{ success: boolean; message: string }> {
  const url = `${ERP_BASE_URL}/api/leaves/hrms-update`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-integration-key': INTEGRATION_API_KEY,
    },
    body: JSON.stringify({
      leaveId: erpLeaveId,
      status, // 'approved' or 'rejected'
      approvedBy: approvedBy || 'HRMS-HR',
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    return {
      success: false,
      message: `ERP returned HTTP ${res.status}: ${txt.slice(0, 200)}`,
    };
  }

  const data = await res.json().catch(() => ({}));
  return {
    success: true,
    message: data.message || 'Updated in ERP',
  };
}
