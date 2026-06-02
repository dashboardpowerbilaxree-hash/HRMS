import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    let phHours = 0;
    let status = 'present';

    if (finalCheckIn && finalCheckOut) {
      totalHours = calcHours(finalCheckIn, finalCheckOut);

      const gracePeriod = 15;
      if (employee.shiftStart) {
        const [shiftH, shiftM] = employee.shiftStart.split(':').map(Number);
        const [checkInH, checkInM] = finalCheckIn.split(':').map(Number);
        const shiftMinutes = shiftH * 60 + shiftM;
        const checkInMinutes = checkInH * 60 + checkInM;
        lateEntry = checkInMinutes > shiftMinutes + gracePeriod;
      }

      // Early out detection
      if (employee.shiftEnd) {
        const [shiftEndH, shiftEndM] = employee.shiftEnd.split(':').map(Number);
        const [checkOutH, checkOutM] = finalCheckOut.split(':').map(Number);
        const shiftEndMinutes = shiftEndH * 60 + shiftEndM;
        const checkOutMinutes = checkOutH * 60 + checkOutM;
        earlyOut = checkOutMinutes < shiftEndMinutes;
      }

      halfDay = totalHours < employee.shiftHours / 2;
      overtimeHours = Math.max(0, Math.round((totalHours - employee.shiftHours) * 100) / 100);

      if (isSunday) sundayHours = totalHours;
      if (isPH) phHours = totalHours;

      if (isSunday) status = 'weekly-off';
      else if (isHoliday) status = 'holiday';
      else if (halfDay) status = 'half-day';
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
        overtimeHours, isHoliday, isWeeklyOff, isSunday, isPH, sundayHours, phHours,
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
