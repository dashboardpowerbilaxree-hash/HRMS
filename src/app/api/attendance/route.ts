import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isActuallyEarlyOut, recomputeStatus, recomputeEarlyOutFlag, getActualShiftHours } from '@/lib/payroll-calc';

function calcHours(checkIn: string, checkOut: string): number {
  const [h1, m1] = checkIn.split(':').map(Number);
  const [h2, m2] = checkOut.split(':').map(Number);
  return Math.max(0, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || '';
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const date = searchParams.get('date') || '';
    const department = searchParams.get('department') || '';
    const location = searchParams.get('location') || '';
    const firm = searchParams.get('firm') || '';

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (date) {
      // Use date string directly for timezone-safe comparison
      // date format from frontend: YYYY-MM-DD
      where.date = {
        gte: new Date(date + 'T00:00:00'),
        lt: new Date(date + 'T23:59:59.999'),
      };
    } else {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      where.date = { gte: start, lt: end };
    }

    // Filter by department/location/firm via employee relation
    const employeeFilter: any = {};
    if (department) employeeFilter.department = department;
    if (location) employeeFilter.location = location;
    if (firm) employeeFilter.firm = firm;
    if (Object.keys(employeeFilter).length > 0) {
      where.employee = employeeFilter;
    }

    const records = await db.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            fullName: true,
            employeeId: true,
            department: true,
            designation: true,
            location: true,
            shiftHours: true,
            shiftStart: true,   // needed for half-day & early-out recompute
            shiftEnd: true,     // needed for half-day & early-out recompute
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // ── Recompute half-day AND early-out status on-the-fly for each record ──
    // Existing DB records may have status='half-day' or status='early-out'
    // set wrongly due to (a) the 12-hour format bug in upload routes, or
    // (b) the employee's shift being updated AFTER attendance was uploaded.
    // We recompute the effective status here WITHOUT modifying the DB
    // (per user's "no data tampering" instruction), so the Attendance
    // Tracker UI and other consumers see the corrected status.
    const correctedRecords = records.map(r => {
      const actualShiftHours = getActualShiftHours(
        r.employee?.shiftHours,
        r.employee?.shiftStart,
        r.employee?.shiftEnd,
      );
      const correctedStatus = recomputeStatus(r, actualShiftHours, r.employee?.shiftStart, r.employee?.shiftEnd);
      const correctedEarlyOut = recomputeEarlyOutFlag(r, r.employee?.shiftStart, r.employee?.shiftEnd);
      return {
        ...r,
        status: correctedStatus,
        earlyOut: correctedEarlyOut,
      };
    });

    // Monthly summary — uses RECOMPUTED records so wrong early-out flags
    // don't inflate the "Early Outs" count for employees with short shifts.
    const summary = {
      totalRecords: correctedRecords.length,
      present: correctedRecords.filter(r => ['present', 'late', 'early-out'].includes(r.status)).length,
      absent: correctedRecords.filter(r => r.status === 'absent').length,
      late: correctedRecords.filter(r => r.lateEntry).length,
      earlyOuts: correctedRecords.filter(r => r.earlyOut).length,
      halfDay: correctedRecords.filter(r => r.halfDay).length,
      sundayWorked: correctedRecords.filter(r => r.isSunday && r.totalHours > 0).length,
      phWorked: correctedRecords.filter(r => r.isPH && r.totalHours > 0).length,
      totalSundayHours: correctedRecords.reduce((sum, r) => sum + r.sundayHours, 0),
      totalOvertimeHours: correctedRecords.reduce((sum, r) => sum + r.overtimeHours, 0),
      totalWorkHours: correctedRecords.reduce((sum, r) => sum + r.totalHours, 0),
    };

    return NextResponse.json({ records: correctedRecords, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, date, checkIn, checkOut } = body;

    const employee = await db.employee.findUnique({ where: { employeeId } });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Block attendance for relieved/inactive employees after their relieving date
    if (employee.relievingDate) {
      const attDate = new Date(date + 'T00:00:00');
      const relDate = new Date(employee.relievingDate);
      if (attDate > relDate) {
        return NextResponse.json({ error: `Cannot mark attendance after relieving date (${relDate.toISOString().split('T')[0]})` }, { status: 400 });
      }
    }
    if (employee.status === 'No' || employee.status === 'inactive') {
      return NextResponse.json({ error: 'Cannot mark attendance for inactive/relieved employee' }, { status: 400 });
    }

    const d = new Date(date);
    const dayOfWeek = d.getDay();

    // Auto-detect Sunday (day 0)
    const isSunday = dayOfWeek === 0;
    const isWeeklyOff = isSunday;

    // Check if date is a public holiday
    const holidays = await db.holiday.findMany({
      where: {
        date: {
          gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
          lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
        },
      },
    });
    const isPH = holidays.length > 0;
    const isHoliday = isPH;

    let totalHours = 0;
    let lateEntry = false;
    let earlyOut = false;
    let halfDay = false;
    let overtimeHours = 0;
    let sundayHours = 0;
    let status = 'present';

    if (checkIn && checkOut) {
      totalHours = calcHours(checkIn, checkOut);

      // Calculate actual shift duration from shiftStart/shiftEnd (not stored shiftHours)
      // This ensures employees with shorter shifts (e.g., 10:00-14:00 = 4h) are correctly evaluated
      let actualShiftHours = employee.shiftHours;
      if (employee.shiftStart && employee.shiftEnd) {
        const [sH, sM] = employee.shiftStart.split(':').map(Number);
        const [eHRaw, eM] = employee.shiftEnd.split(':').map(Number);
        let eH = eHRaw;
        let calculatedShift = ((eH * 60 + eM) - (sH * 60 + sM)) / 60;
        // Handle 12-hour format: if shiftEnd "earlier" than shiftStart,
        // assume shiftEnd is PM and add 12 hours. See bulk-upload for full note.
        if (calculatedShift <= 0 && eH < 12) {
          eH = eH + 12;
          calculatedShift = ((eH * 60 + eM) - (sH * 60 + sM)) / 60;
        }
        if (calculatedShift > 0) actualShiftHours = calculatedShift;
      }

      // Late entry detection (grace period of 15 minutes)
      const gracePeriod = 15;
      const [shiftH, shiftM] = employee.shiftStart.split(':').map(Number);
      const [checkInH, checkInM] = checkIn.split(':').map(Number);
      const shiftMinutes = shiftH * 60 + shiftM;
      const checkInMinutes = checkInH * 60 + checkInM;
      lateEntry = checkInMinutes > shiftMinutes + gracePeriod;

      // Early out detection: if checkOut is before shift end time.
      // Use isActuallyEarlyOut helper so that:
      //   1. The 12-hour-format fix-up is applied (e.g., shiftEnd "02:00"
      //      is interpreted as 14:00, not 2 AM).
      //   2. A 5-minute grace period is applied (leaving 1-5 min before
      //      shift end is NOT flagged as early-out).
      // This ensures employees with short shifts (4h, 5h, etc.) are not
      // wrongly flagged as early-out when they leave at their actual
      // shift end time.
      earlyOut = isActuallyEarlyOut(checkOut, employee.shiftStart, employee.shiftEnd);

      // Half day detection: only when worked LESS than half of actual shift duration
      // e.g., shift=4h, worked=4h → NOT half day; shift=9h, worked=3h → half day
      halfDay = totalHours < actualShiftHours / 2;

      // OT calculation: OT = total hours worked MINUS actual shift hours
      // OT is ONLY given when an employee works MORE than their shift hours
      // e.g., shift=4h, worked=4.5h → OT=0.5h; shift=9h, worked=8.55h → OT=0 (short, no OT)
      overtimeHours = totalHours > actualShiftHours
        ? Math.round((totalHours - actualShiftHours) * 100) / 100
        : 0;

      // Sunday hours: if worked on Sunday, all hours are Sunday hours
      if (isSunday) {
        sundayHours = totalHours;
      }

      // Determine status
      if (isSunday) {
        status = 'weekly-off';
      } else if (isHoliday) {
        status = 'holiday';
      } else if (halfDay) {
        status = 'half-day';
      } else if (lateEntry && earlyOut) {
        status = 'late'; // Late takes priority but earlyOut flag is still set
      } else if (lateEntry) {
        status = 'late';
      } else if (earlyOut) {
        status = 'early-out';
      } else {
        status = 'present';
      }
    } else if (isSunday) {
      status = 'weekly-off';
    } else if (isHoliday) {
      status = 'holiday';
    } else {
      status = 'absent';
    }

    // Check for existing attendance record
    const existing = await db.attendance.findFirst({
      where: {
        employeeId,
        date: {
          gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
          lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
        },
      },
    });

    let record;
    if (existing) {
      record = await db.attendance.update({
        where: { id: existing.id },
        data: {
          checkIn,
          checkOut,
          totalHours,
          status,
          lateEntry,
          earlyOut,
          halfDay,
          overtimeHours,
          isHoliday,
          isWeeklyOff,
          isSunday,
          isPH,
          sundayHours,
          remarks: body.remarks,
        },
      });
    } else {
      record = await db.attendance.create({
        data: {
          employeeId,
          date: d,
          checkIn,
          checkOut,
          totalHours,
          status,
          lateEntry,
          earlyOut,
          halfDay,
          overtimeHours,
          isHoliday,
          isWeeklyOff,
          isSunday,
          isPH,
          sundayHours,
          remarks: body.remarks,
        },
      });
    }

    // Create or update overtime record if applicable (OT at normal hourly rate, NOT 1.5x)
    if (overtimeHours > 0) {
      // Calculate normal hourly rate: monthlySalary / (daysInMonth × shiftHours) — 2 decimal precision
      const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const normalHourlyRate = Math.round((employee.monthlySalary / (daysInMonth * employee.shiftHours)) * 100) / 100;
      const otAmount = Math.round(overtimeHours * normalHourlyRate * 100) / 100;
      await db.overtime.upsert({
        where: { id: `ot-${record.id}` },
        update: {
          hours: overtimeHours,
          rate: normalHourlyRate,
          amount: otAmount,
          isHoliday: isHoliday || isWeeklyOff,
          isSunday,
        },
        create: {
          id: `ot-${record.id}`,
          employeeId,
          date: d,
          hours: overtimeHours,
          rate: normalHourlyRate,
          amount: otAmount,
          isHoliday: isHoliday || isWeeklyOff,
          isSunday,
          status: 'approved',
        },
      });
    } else {
      // No overtime — delete any stale overtime record from previous update
      try {
        await db.overtime.delete({ where: { id: `ot-${record.id}` } });
      } catch {
        // Record may not exist, that's fine
      }
    }

    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
// Build: Thu Jul  2 10:50:41 UTC 2026
