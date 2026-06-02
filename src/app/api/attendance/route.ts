import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (date) {
      const d = new Date(date);
      where.date = {
        gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
      };
    } else {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      where.date = { gte: start, lt: end };
    }

    // Filter by department/location via employee relation
    const employeeFilter: any = {};
    if (department) employeeFilter.department = department;
    if (location) employeeFilter.location = location;
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
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Monthly summary
    const summary = {
      totalRecords: records.length,
      present: records.filter(r => ['present', 'late', 'early-out'].includes(r.status)).length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.lateEntry).length,
      earlyOuts: records.filter(r => r.earlyOut).length,
      halfDay: records.filter(r => r.halfDay).length,
      sundayWorked: records.filter(r => r.isSunday && r.totalHours > 0).length,
      phWorked: records.filter(r => r.isPH && r.totalHours > 0).length,
      totalSundayHours: records.reduce((sum, r) => sum + r.sundayHours, 0),
      totalPHHours: records.reduce((sum, r) => sum + r.phHours, 0),
      totalOvertimeHours: records.reduce((sum, r) => sum + r.overtimeHours, 0),
      totalWorkHours: records.reduce((sum, r) => sum + r.totalHours, 0),
    };

    return NextResponse.json({ records, summary });
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
    let phHours = 0;
    let status = 'present';

    if (checkIn && checkOut) {
      totalHours = calcHours(checkIn, checkOut);

      // Late entry detection (grace period of 15 minutes)
      const gracePeriod = 15;
      const [shiftH, shiftM] = employee.shiftStart.split(':').map(Number);
      const [checkInH, checkInM] = checkIn.split(':').map(Number);
      const shiftMinutes = shiftH * 60 + shiftM;
      const checkInMinutes = checkInH * 60 + checkInM;
      lateEntry = checkInMinutes > shiftMinutes + gracePeriod;

      // Early out detection: if checkOut is before shift end time
      const [shiftEndH, shiftEndM] = employee.shiftEnd.split(':').map(Number);
      const [checkOutH, checkOutM] = checkOut.split(':').map(Number);
      const shiftEndMinutes = shiftEndH * 60 + shiftEndM;
      const checkOutMinutes = checkOutH * 60 + checkOutM;
      earlyOut = checkOutMinutes < shiftEndMinutes;

      // Half day detection
      halfDay = totalHours < employee.shiftHours / 2;

      // OT calculation: if totalHours > shiftHours, OT = totalHours - shiftHours
      overtimeHours = Math.max(0, Math.round((totalHours - employee.shiftHours) * 100) / 100);

      // Sunday hours: if worked on Sunday, all hours are Sunday hours
      if (isSunday) {
        sundayHours = totalHours;
      }

      // PH hours: if worked on a public holiday, all hours are PH hours
      if (isPH) {
        phHours = totalHours;
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
          phHours,
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
          phHours,
          remarks: body.remarks,
        },
      });
    }

    // Create overtime record if applicable (OT at normal hourly rate, NOT 1.5x)
    if (overtimeHours > 0) {
      // Calculate normal hourly rate: monthlySalary / (daysInMonth × shiftHours)
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
    }

    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
