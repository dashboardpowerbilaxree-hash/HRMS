import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ════════════════════════════════════════════════════════════════════════
// v24·0625 — EXTERNAL ATTENDANCE ENDPOINT (HRMS → ERP, READ-ONLY)
// ════════════════════════════════════════════════════════════════════════
// ERP's /api/attendance/bridge calls this endpoint to fetch an employee's
// monthly attendance (read-only) so ERP users can see their HRMS attendance
// without leaving ERP.
//
// FLOW:
//   1. ERP backend calls GET {HRMS_URL}/api/external/attendance
//        with header `x-hrms-api-key: <HRMS_BRIDGE_API_KEY>`
//        and query `?email=X&phone=Y&month=M&year=Y`
//   2. HRMS looks up the employee by email (primary) or phone (fallback).
//   3. HRMS returns attendance records + summary + employee identity.
//
// AUTH: Requires `x-hrms-api-key` header matching env var HRMS_BRIDGE_API_KEY.
//
// v24·0625-fix: FALLBACK — if HRMS_BRIDGE_API_KEY is not set on this HRMS
// deployment, accept ERP_BRIDGE_API_KEY instead. This makes the bridge work
// even when only ONE of the two keys is configured on each side (the most
// common deployment mistake). When both keys are set, HRMS_BRIDGE_API_KEY
// takes precedence.
//
// SAFETY: PURELY READ-ONLY. This endpoint NEVER writes to any database table.
// It does not modify attendance, employees, leaves, or any other record.
// ════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    // Validate API key (with fallback to the symmetric key — see header comment)
    const apiKey = request.headers.get('x-hrms-api-key');
    const expectedKey = process.env.HRMS_BRIDGE_API_KEY || process.env.ERP_BRIDGE_API_KEY;
    if (!expectedKey || apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = (searchParams.get('email') || '').toLowerCase().trim();
    const phone = (searchParams.get('phone') || '').trim();
    const name = (searchParams.get('name') || '').toLowerCase().trim();
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    if (!email && !phone && !name) {
      return NextResponse.json(
        { error: 'Either email, phone, or name is required to identify the employee' },
        { status: 400 }
      );
    }

    // Look up employee by email (primary) → phone (fallback) → name (final fallback)
    // We do NOT modify the employee record — purely read.
    //
    // v24·0625-fix: added name-based fallback because HRMS employees frequently
    // have null/empty email AND mobile fields (operator hasn't populated them).
    // Name matching is case-insensitive and partial (either side contains the other),
    // which handles cases like ERP "Girish Shahani" ↔ HRMS "Girish".
    let employee: any = null;
    if (email) {
      employee = await db.employee.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: {
          employeeId: true, fullName: true, email: true, mobile: true,
          department: true, designation: true, location: true,
          firm: true, shiftHours: true, employmentType: true,
        },
      });
    }
    if (!employee && phone) {
      // Try matching the last 10 digits (handles +91 prefix etc.)
      const phoneLast10 = phone.replace(/\D/g, '').slice(-10);
      if (phoneLast10.length >= 10) {
        employee = await db.employee.findFirst({
          where: { mobile: { contains: phoneLast10 } },
          select: {
            employeeId: true, fullName: true, email: true, mobile: true,
            department: true, designation: true, location: true,
            firm: true, shiftHours: true, employmentType: true,
          },
        });
      }
    }
    if (!employee && name) {
      // v24·0625-fix: name-based fallback matching.
      // Strategy: try exact case-insensitive match first, then partial match
      // (HRMS fullName contains ERP name OR ERP name contains HRMS fullName).
      // This handles common naming differences between ERP and HRMS:
      //   ERP "Girish Shahani" ↔ HRMS "Girish"
      //   ERP "Saurabh"        ↔ HRMS "Saurabh"
      //   ERP "Arti Sharma"    ↔ HRMS "Arti"
      //
      // Step 1: exact case-insensitive match
      employee = await db.employee.findFirst({
        where: { fullName: { equals: name, mode: 'insensitive' } },
        select: {
          employeeId: true, fullName: true, email: true, mobile: true,
          department: true, designation: true, location: true,
          firm: true, shiftHours: true, employmentType: true,
        },
      });

      // Step 2: partial match — fetch all employees and find best match in JS.
      // Prisma `contains` with `mode: 'insensitive'` would work for one direction
      // but not both, so we fetch all and filter in code (employee list is small,
      // typically <100 records).
      if (!employee) {
        const allEmployees = await db.employee.findMany({
          select: {
            employeeId: true, fullName: true, email: true, mobile: true,
            department: true, designation: true, location: true,
            firm: true, shiftHours: true, employmentType: true,
          },
        });
        // Normalize: lowercase + trim + collapse multiple spaces
        const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
        const normName = normalize(name);
        // Try both directions of partial match
        const partialMatch = allEmployees.find(e => {
          const empName = normalize(e.fullName || '');
          if (!empName || !normName) return false;
          return empName.includes(normName) || normName.includes(empName);
        });
        if (partialMatch) employee = partialMatch;
      }
    }

    if (!employee) {
      // Soft-fail: ERP UI will show "no linked HRMS record"
      return NextResponse.json({
        employee: null,
        records: [],
        summary: null,
        message: 'No HRMS employee found matching this email/phone.',
      });
    }

    // Fetch attendance for the requested month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const records = await db.attendance.findMany({
      where: {
        employeeId: employee.employeeId,
        date: { gte: startDate, lt: endDate },
      },
      orderBy: { date: 'asc' },
      // Select only safe, non-sensitive fields
      select: {
        id: true, date: true, checkIn: true, checkOut: true,
        totalHours: true, status: true, lateEntry: true,
        halfDay: true, overtimeHours: true, earlyOut: true,
        isHoliday: true, isWeeklyOff: true,
      },
    });

    // Build summary (read-only computation — no writes)
    const summary = {
      totalRecords: records.length,
      present: records.filter(r => ['present', 'late', 'early-out'].includes(r.status)).length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.lateEntry).length,
      earlyOuts: records.filter(r => r.earlyOut).length,
      halfDay: records.filter(r => r.halfDay).length,
      totalOvertimeHours: records.reduce((sum, r) => sum + (r.overtimeHours || 0), 0),
      totalWorkHours: records.reduce((sum, r) => sum + (r.totalHours || 0), 0),
    };

    return NextResponse.json({
      employee,
      records,
      summary,
    });
  } catch (error: any) {
    console.error('External attendance GET error:', error);
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}
