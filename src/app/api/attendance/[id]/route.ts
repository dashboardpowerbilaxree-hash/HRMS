import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isActuallyEarlyOut, shouldApplyLateEarly } from '@/lib/payroll-calc';

function calcHours(checkIn: string, checkOut: string): number {
  const [h1, m1] = checkIn.split(':').map(Number);
  const [h2, m2] = checkOut.split(':').map(Number);
  return Math.max(0, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    // Use provided values or fall back to existing record values
    const checkIn = body.checkIn !== undefined ? body.checkIn : undefined;
    const checkOut = body.checkOut !== undefined ? body.checkOut : undefined;

    const existing = await db.attendance.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    const employee = await db.employee.findUnique({ where: { employeeId: existing.employeeId } });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Block attendance updates for relieved/inactive employees after their relieving date
    if (employee.relievingDate) {
      const attDate = new Date(existing.date);
      const relDate = new Date(employee.relievingDate);
      if (attDate > relDate) {
        return NextResponse.json({ error: `Cannot update attendance after relieving date (${relDate.toISOString().split('T')[0]})` }, { status: 400 });
      }
    }
    if (employee.status === 'No' || employee.status === 'inactive') {
      return NextResponse.json({ error: 'Cannot update attendance for inactive/relieved employee' }, { status: 400 });
    }

    // Use provided values, or fall back to existing values
    const finalCheckIn = checkIn !== undefined ? checkIn : existing.checkIn;
    const finalCheckOut = checkOut !== undefined ? checkOut : existing.checkOut;

    const d = new Date(existing.date);
    const dayOfWeek = d.getDay();
    const isSunday = dayOfWeek === 0;
    const isWeeklyOff = isSunday;

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

    if (finalCheckIn && finalCheckOut) {
      totalHours = calcHours(finalCheckIn, finalCheckOut);

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

      // Freelance short-shift rule (Aug 13, 2026):
      // Freelance employees with shiftHours < 4 should NOT be marked late/early.
      // Freelance with shiftHours >= 4 (e.g. Reena 4h) and all Full Time /
      // Part Time employees follow normal late/early rules.
      const applyLateEarly = shouldApplyLateEarly(employee);

      // Late entry detection (grace period of 15 minutes)
      // SKIP for Freelance short-shift employees
      if (applyLateEarly && employee.shiftStart) {
        const gracePeriod = 15;
        const [shiftH, shiftM] = employee.shiftStart.split(':').map(Number);
        const [checkInH, checkInM] = finalCheckIn.split(':').map(Number);
        const shiftMinutes = shiftH * 60 + shiftM;
        const checkInMinutes = checkInH * 60 + checkInM;
        lateEntry = checkInMinutes > shiftMinutes + gracePeriod;

        // Early out detection.
        // Use isActuallyEarlyOut helper so that:
        //   1. The 12-hour-format fix-up is applied (e.g., shiftEnd "02:00"
        //      is interpreted as 14:00, not 2 AM).
        //   2. A 5-minute grace period is applied (leaving 1-5 min before
        //      shift end is NOT flagged as early-out).
        // This ensures employees with short shifts (4h, 5h, etc.) are not
        // wrongly flagged as early-out when they leave at their actual
        // shift end time.
        if (employee.shiftEnd) {
          earlyOut = isActuallyEarlyOut(finalCheckOut, employee.shiftStart, employee.shiftEnd);
        }
      }
      // else: lateEntry and earlyOut stay false (Freelance short shift)

      // Half day detection: only when worked LESS than half of actual shift duration
      // This rule applies to ALL employees (including Freelance short-shift)
      halfDay = totalHours < actualShiftHours / 2;

      // OT calculation: OT = total hours worked MINUS actual shift hours
      // OT is ONLY given when an employee works MORE than their shift hours
      overtimeHours = totalHours > actualShiftHours
        ? Math.round((totalHours - actualShiftHours) * 100) / 100
        : 0;

      if (isSunday) sundayHours = totalHours;

      // Determine status — late+earlyOut gets 'late' but earlyOut flag is set
      if (isSunday) status = 'weekly-off';
      else if (isHoliday) status = 'holiday';
      else if (halfDay) status = 'half-day';
      else if (lateEntry && earlyOut) status = 'late';
      else if (lateEntry) status = 'late';
      else if (earlyOut) status = 'early-out';
      else status = 'present';
    } else if (isSunday) {
      status = 'weekly-off';
    } else if (isHoliday) {
      status = 'holiday';
    } else {
      status = 'absent';
    }

    const updated = await db.attendance.update({
      where: { id },
      data: {
        checkIn: finalCheckIn,
        checkOut: finalCheckOut,
        totalHours, status, lateEntry, earlyOut, halfDay,
        overtimeHours, isHoliday, isWeeklyOff, isSunday, isPH, sundayHours,
      },
    });

    // Update overtime record (OT at normal hourly rate, NOT 1.5x)
    if (overtimeHours > 0) {
      const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const normalHourlyRate = Math.round((employee.monthlySalary / (daysInMonth * employee.shiftHours)) * 100) / 100;
      const otAmount = Math.round(overtimeHours * normalHourlyRate * 100) / 100;
      await db.overtime.upsert({
        where: { id: `ot-${id}` },
        update: {
          hours: overtimeHours, rate: normalHourlyRate,
          amount: otAmount,
          isHoliday: isHoliday || isWeeklyOff, isSunday,
        },
        create: {
          id: `ot-${id}`,
          employeeId: existing.employeeId, date: d, hours: overtimeHours,
          rate: normalHourlyRate, amount: otAmount,
          isHoliday: isHoliday || isWeeklyOff, isSunday, status: 'approved',
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await db.attendance.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    // Delete associated overtime
    await db.overtime.deleteMany({ where: { id: `ot-${id}` } });
    await db.attendance.delete({ where: { id } });

    return NextResponse.json({ message: 'Attendance record deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
