import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  ERP_BASE_URL,
  INTEGRATION_API_KEY,
  parseErpUserId,
  matchErpUserToHrmsEmployee,
  erpLeaveToHrmsPayload,
  fetchErpLeaves,
} from '@/lib/erp-integration';

/**
 * HRMS endpoint: /api/leaves/erp-pull
 *
 * SAFETY:
 * - This is a NEW endpoint (does not modify existing /api/leaves routes)
 * - Only INSERTS new records into HRMS Leave table (never updates/deletes existing records)
 * - Uses existing Leave columns AS-IS — no schema changes
 * - Idempotent: re-running it will NOT create duplicate records
 *
 * Flow:
 * 1. Fetch all PENDING leaves from ERP
 * 2. For each, check if HRMS already has a synced copy (matched by `[ERP:<userId>]` marker in reason
 *    AND same startDate+endDate)
 * 3. If not synced, match ERP user to HRMS employee by name
 * 4. Insert into HRMS Leave table with status='pending', type='ERP_<leaveType>'
 *
 * Query params:
 *  - ?status=pending  (default) — pull only pending leaves from ERP
 *  - ?status=all      — pull all leaves regardless of ERP status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'pending';
    const erpStatus = statusFilter === 'all' ? undefined : 'PENDING';

    // ─── Optional auth: require integration key ───
    const providedKey = request.headers.get('x-integration-key');
    if (providedKey && providedKey !== INTEGRATION_API_KEY) {
      return NextResponse.json({ error: 'Invalid integration key' }, { status: 401 });
    }

    // ─── Step 1: Fetch ERP pending leaves ───
    const erpLeaves = await fetchErpLeaves(erpStatus);

    // ─── Step 2: Load all HRMS employees for name matching ───
    const hrmsEmployees = await db.employee.findMany({
      select: { employeeId: true, fullName: true },
    });

    // ─── Step 3: Load all existing HRMS leaves to detect duplicates ───
    // Look for any leave whose `reason` contains `[ERP:` marker (these are previously synced)
    const existingErpSyncedLeaves = await db.leave.findMany({
      where: { reason: { contains: '[ERP:' } },
      select: { reason: true, startDate: true, endDate: true, employeeId: true },
    });

    // Build a dedup key set: "erpUserId|startDate|endDate"
    const syncedKeys = new Set<string>();
    for (const l of existingErpSyncedLeaves) {
      const erpUserId = parseErpUserId(l.reason);
      if (!erpUserId) continue;
      const start = new Date(l.startDate).toISOString().slice(0, 10);
      const end = new Date(l.endDate).toISOString().slice(0, 10);
      syncedKeys.add(`${erpUserId}|${start}|${end}`);
    }

    // ─── Step 4: For each ERP leave, insert into HRMS if not already synced ───
    const results: Array<{
      erpLeaveId: string;
      erpUserName: string;
      hrmsEmployeeId: string;
      action: 'synced' | 'skipped' | 'error';
      message?: string;
    }> = [];

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const erpLeave of erpLeaves) {
      try {
        const start = new Date(erpLeave.fromDate).toISOString().slice(0, 10);
        const end = new Date(erpLeave.toDate).toISOString().slice(0, 10);
        const dedupKey = `${erpLeave.userId}|${start}|${end}`;

        if (syncedKeys.has(dedupKey)) {
          results.push({
            erpLeaveId: erpLeave.id,
            erpUserName: erpLeave.user?.name || erpLeave.userId,
            hrmsEmployeeId: '',
            action: 'skipped',
            message: 'Already synced',
          });
          skippedCount++;
          continue;
        }

        // Match ERP user → HRMS employee by name
        const hrmsEmployeeId = matchErpUserToHrmsEmployee(
          erpLeave.user?.name || '',
          hrmsEmployees
        );

        // Build HRMS Leave payload
        const payload = erpLeaveToHrmsPayload(erpLeave, hrmsEmployeeId);

        // Insert into HRMS Leave table
        await db.leave.create({ data: payload });

        // Mark as synced to prevent duplicates in same run
        syncedKeys.add(dedupKey);

        results.push({
          erpLeaveId: erpLeave.id,
          erpUserName: erpLeave.user?.name || erpLeave.userId,
          hrmsEmployeeId,
          action: 'synced',
        });
        syncedCount++;
      } catch (err: any) {
        results.push({
          erpLeaveId: erpLeave.id,
          erpUserName: erpLeave.user?.name || erpLeave.userId,
          hrmsEmployeeId: '',
          action: 'error',
          message: err.message,
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedCount} new leaves, skipped ${skippedCount} already-synced, errors: ${errorCount}`,
      summary: {
        erpTotalPending: erpLeaves.length,
        synced: syncedCount,
        skipped: skippedCount,
        errors: errorCount,
      },
      results,
    });
  } catch (error: any) {
    console.error('[erp-pull] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync ERP leaves' },
      { status: 500 }
    );
  }
}
