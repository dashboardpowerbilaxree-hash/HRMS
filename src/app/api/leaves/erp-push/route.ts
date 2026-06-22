import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  INTEGRATION_API_KEY,
  parseErpUserId,
  pushLeaveStatusToErp,
  fetchErpLeaves,
} from '@/lib/erp-integration';

/**
 * HRMS endpoint: /api/leaves/erp-push
 *
 * SAFETY:
 * - This is a NEW endpoint (does not modify existing /api/leaves routes)
 * - Only called when HR approves/rejects an ERP-originated leave in HRMS UI
 * - Updates the corresponding ERP Leave record's status via ERP's /api/leaves/hrms-update endpoint
 * - Does NOT delete or modify any HRMS Leave record (HRMS Leave PUT endpoint handles the local update)
 *
 * Flow:
 * 1. HR clicks Approve/Reject on an ERP-originated leave in HRMS dashboard
 * 2. Frontend calls existing PUT /api/leaves (updates HRMS Leave.status) — UNCHANGED
 * 3. Frontend ALSO calls this endpoint with the leaveId and new status
 * 4. This endpoint:
 *    a. Looks up the HRMS Leave record
 *    b. Parses the `[ERP:<userId>]` marker from `reason` field
 *    c. If marker exists → find the matching ERP leave by userId + date range
 *    d. Calls ERP's /api/leaves/hrms-update to update ERP leave status
 *    e. Returns success/skip
 *
 * Request body:
 *   {
 *     "leaveId": "<hrms-leave-id>",
 *     "status": "approved" | "rejected",
 *     "approvedBy": "HR name" (optional)
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leaveId, status, approvedBy } = body;

    if (!leaveId || !status) {
      return NextResponse.json(
        { error: 'leaveId and status are required' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    // ─── Optional auth: require integration key ───
    const providedKey = request.headers.get('x-integration-key');
    if (providedKey && providedKey !== INTEGRATION_API_KEY) {
      return NextResponse.json({ error: 'Invalid integration key' }, { status: 401 });
    }

    // ─── Step 1: Look up the HRMS Leave record ───
    const hrmsLeave = await db.leave.findUnique({
      where: { id: leaveId },
      select: { id: true, reason: true, startDate: true, endDate: true, employeeId: true, type: true },
    });

    if (!hrmsLeave) {
      return NextResponse.json(
        { error: 'HRMS leave not found' },
        { status: 404 }
      );
    }

    // ─── Step 2: Check if this leave originated from ERP ───
    const erpUserId = parseErpUserId(hrmsLeave.reason);

    if (!erpUserId) {
      // Not an ERP-originated leave — nothing to push back
      return NextResponse.json({
        success: true,
        synced: false,
        message: 'Leave is not ERP-originated; no push needed',
      });
    }

    // ─── Step 3: Find the matching ERP leave by userId + date range ───
    // We fetch ALL ERP leaves for this user (no status filter) and find the one matching
    // the startDate + endDate. This is safer than trusting the ERP user ID alone.
    const allErpLeaves = await fetchErpLeaves();
    const startStr = new Date(hrmsLeave.startDate).toISOString().slice(0, 10);
    const endStr = new Date(hrmsLeave.endDate).toISOString().slice(0, 10);

    const matchingErpLeave = allErpLeaves.find((el: any) => {
      if (el.userId !== erpUserId) return false;
      const elStart = new Date(el.fromDate).toISOString().slice(0, 10);
      const elEnd = new Date(el.toDate).toISOString().slice(0, 10);
      return elStart === startStr && elEnd === endStr;
    });

    if (!matchingErpLeave) {
      return NextResponse.json({
        success: true,
        synced: false,
        message: `No matching ERP leave found for user ${erpUserId} with dates ${startStr} → ${endStr}`,
      });
    }

    // ─── Step 4: Push the status update to ERP ───
    const pushResult = await pushLeaveStatusToErp(
      matchingErpLeave.id,
      status,
      approvedBy
    );

    return NextResponse.json({
      success: pushResult.success,
      synced: pushResult.success,
      erpLeaveId: matchingErpLeave.id,
      erpUserId,
      message: pushResult.message,
    });
  } catch (error: any) {
    console.error('[erp-push] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to push leave status to ERP' },
      { status: 500 }
    );
  }
}
