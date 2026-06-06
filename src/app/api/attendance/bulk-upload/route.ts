import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function calcHours(checkIn: string, checkOut: string): number {
  const [h1, m1] = checkIn.split(':').map(Number);
  const [h2, m2] = checkOut.split(':').map(Number);
  return Math.max(0, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { records } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No records provided' }, { status: 400 });
    }

    const results: { employeeId: string; date: string; status: string; error?: string }[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const rec of records) {
      try {
        const { employeeId, date, checkIn, checkOut } = rec;
        if (!employeeId || !date) {
          results.push({ employeeId: employeeId || 'unknown', date: date || 'unknown', status: 'error', error: 'Missing employeeId or date' });
          errorCount++;
          continue;
        }

        const employee = await db.employee.findUnique({ where: { employeeId } });
        if (!employee) {
          results.push({ employeeId, date, status: 'error', error: 'Employee not found' });
          errorCount++;
          continue;
        }

        const d = new Date(date);
        if (isNaN(d.getTime())) {
          results.push({ employeeId, date, status: 'error', error: 'Invalid date' });
          errorCount++;
          continue;
        }

        const dayOfWeek = d.getDay();
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

        // Declare checkout minutes at this scope so it's available for OT calc
        let checkOutMinutes = 0;

        if (checkIn && checkOut) {
          totalHours = calcHours(checkIn, checkOut);

          // Late entry detection
          const gracePeriod = 15;
          if (employee.shiftStart) {
            const [shiftH, shiftM] = employee.shiftStart.split(':').map(Number);
            const [checkInH, checkInM] = checkIn.split(':').map(Number);
            const shiftMinutes = shiftH * 60 + shiftM;
            const checkInMinutes = checkInH * 60 + checkInM;
            lateEntry = checkInMinutes > shiftMinutes + gracePeriod;
          }

          // Early out detection: if checkOut is before shift end time
          if (employee.shiftEnd) {
            const [shiftEndH, shiftEndM] = employee.shiftEnd.split(':').map(Number);
            const [checkOutH, checkOutM] = checkOut.split(':').map(Number);
            const shiftEndMinutes = shiftEndH * 60 + shiftEndM;
            checkOutMinutes = checkOutH * 60 + checkOutM;
            earlyOut = checkOutMinutes < shiftEndMinutes;
          }

          // Half day detection
          halfDay = totalHours < employee.shiftHours / 2;

          // OT calculation: OT = time worked AFTER shift end
          // For a late employee who works past shift end, OT is only the time after shift end
          // e.g., checkIn=10:25, checkOut=19:36, shiftEnd=19:00 → OT = 36 min = 0.6 hrs
          let otMinutes = 0;
          if (employee.shiftEnd) {
            const [sEndH, sEndM] = employee.shiftEnd.split(':').map(Number);
            const shiftEndTotalMin = sEndH * 60 + sEndM;
            otMinutes = Math.max(0, checkOutMinutes - shiftEndTotalMin);
          } else {
            // Fallback: if no shiftEnd, use totalHours - shiftHours
            otMinutes = Math.max(0, Math.round((totalHours - employee.shiftHours) * 60));
          }
          overtimeHours = Math.round((otMinutes / 60) * 100) / 100;

          if (isSunday) sundayHours = totalHours;

          // Determine status
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

        // Upsert attendance
        const existing = await db.attendance.findFirst({
          where: {
            employeeId,
            date: {
              gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
              lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
            },
          },
        });

        if (existing) {
          await db.attendance.update({
            where: { id: existing.id },
            data: {
              checkIn, checkOut, totalHours, status, lateEntry, earlyOut, halfDay,
              overtimeHours, isHoliday, isWeeklyOff, isSunday, isPH, sundayHours,
            },
          });
        } else {
          await db.attendance.create({
            data: {
              employeeId, date: d, checkIn, checkOut, totalHours, status, lateEntry, earlyOut, halfDay,
              overtimeHours, isHoliday, isWeeklyOff, isSunday, isPH, sundayHours,
            },
          });
        }

        // Create overtime record if applicable (OT at normal hourly rate, NOT 1.5x)
        if (overtimeHours > 0) {
          const attRecord = existing || await db.attendance.findFirst({
            where: {
              employeeId,
              date: {
                gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
                lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
              },
            },
          });
          if (attRecord) {
            // Calculate normal hourly rate: monthlySalary / (daysInMonth × shiftHours)
            const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
            const normalHourlyRate = Math.round((employee.monthlySalary / (daysInMonth * employee.shiftHours)) * 100) / 100;
            const otAmount = Math.round(overtimeHours * normalHourlyRate * 100) / 100;
            await db.overtime.upsert({
              where: { id: `ot-${attRecord.id}` },
              update: {
                hours: overtimeHours, rate: normalHourlyRate,
                amount: otAmount,
                isHoliday: isHoliday || isWeeklyOff, isSunday,
              },
              create: {
                id: `ot-${attRecord.id}`,
                employeeId, date: d, hours: overtimeHours, rate: normalHourlyRate,
                amount: otAmount,
                isHoliday: isHoliday || isWeeklyOff, isSunday, status: 'approved',
              },
            });
          }
        }

        results.push({ employeeId, date, status });
        successCount++;
      } catch (err: any) {
        results.push({ employeeId: rec.employeeId || 'unknown', date: rec.date || 'unknown', status: 'error', error: err.message });
        errorCount++;
      }
    }

    return NextResponse.json({
      message: `Processed ${records.length} records: ${successCount} success, ${errorCount} errors`,
      successCount,
      errorCount,
      results,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const result = await db.attendance.deleteMany({});
    const otResult = await db.overtime.deleteMany({});
    return NextResponse.json({
      message: `Cleared ${result.count} attendance records and ${otResult.count} overtime records`,
      attendanceDeleted: result.count,
      overtimeDeleted: otResult.count,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
