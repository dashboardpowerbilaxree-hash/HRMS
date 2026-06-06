import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper: calculate days away from today to a target date, accounting for year wrapping
function daysAway(targetMonth: number, targetDay: number, fromYear: number): { date: Date; days: number } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Try this year first
  let target = new Date(fromYear, targetMonth - 1, targetDay);
  if (target < today) {
    // Try next year
    target = new Date(fromYear + 1, targetMonth - 1, targetDay);
  }

  const diffMs = target.getTime() - today.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return { date: target, days };
}

export async function GET() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // ─── 1. Upcoming Birthdays (next 30 days) ──────────────────
    const employeesWithDOB = await db.employee.findMany({
      where: {
        dateOfBirth: { not: null },
        status: { notIn: ['inactive', 'No'] },
      },
      select: {
        employeeId: true,
        fullName: true,
        dateOfBirth: true,
        firm: true,
        designation: true,
      },
    });

    const upcomingBirthdays = employeesWithDOB
      .map(emp => {
        if (!emp.dateOfBirth) return null;
        const dob = new Date(emp.dateOfBirth);
        const birthMonth = dob.getMonth() + 1;
        const birthDay = dob.getDate();

        const { date: birthday, days } = daysAway(birthMonth, birthDay, today.getFullYear());
        return {
          employeeId: emp.employeeId,
          fullName: emp.fullName,
          dateOfBirth: emp.dateOfBirth.toISOString().split('T')[0],
          birthday: birthday.toISOString().split('T')[0],
          daysAway: days,
          firm: emp.firm,
          designation: emp.designation || '',
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null && item.daysAway >= 0 && item.daysAway <= 30)
      .sort((a, b) => a.daysAway - b.daysAway);

    // ─── 2. Upcoming Anniversaries (next 30 days) ──────────────
    const employeesWithJoinDate = await db.employee.findMany({
      where: {
        joiningDate: { not: null },
        status: { notIn: ['inactive', 'No'] },
      },
      select: {
        employeeId: true,
        fullName: true,
        joiningDate: true,
        firm: true,
        designation: true,
      },
    });

    const upcomingAnniversaries = employeesWithJoinDate
      .map(emp => {
        const joinDate = new Date(emp.joiningDate);
        const joinMonth = joinDate.getMonth() + 1;
        const joinDay = joinDate.getDate();

        const { date: anniversary, days } = daysAway(joinMonth, joinDay, today.getFullYear());

        // Calculate years completed at the anniversary date
        let yearsCompleted = anniversary.getFullYear() - joinDate.getFullYear();
        const monthDiff = anniversary.getMonth() - joinDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && anniversary.getDate() < joinDate.getDate())) {
          yearsCompleted--;
        }

        // Skip if years completed would be 0 (joined this year)
        if (yearsCompleted <= 0) return null;

        return {
          employeeId: emp.employeeId,
          fullName: emp.fullName,
          joiningDate: joinDate.toISOString().split('T')[0],
          anniversary: anniversary.toISOString().split('T')[0],
          yearsCompleted,
          firm: emp.firm,
          designation: emp.designation || '',
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null && item.daysAway >= 0 && item.daysAway <= 30)
      .sort((a, b) => a.daysAway - b.daysAway);

    // ─── 3. Upcoming Holidays (next 60 days) ───────────────────
    const sixtyDaysFromNow = new Date(today);
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

    const upcomingHolidayRecords = await db.holiday.findMany({
      where: {
        date: {
          gte: today,
          lte: sixtyDaysFromNow,
        },
      },
      orderBy: { date: 'asc' },
    });

    const upcomingHolidays = upcomingHolidayRecords.map(h => {
      const holidayDate = new Date(h.date);
      const diffMs = holidayDate.getTime() - today.getTime();
      const daysAway = Math.round(diffMs / (1000 * 60 * 60 * 24));
      return {
        name: h.name,
        date: holidayDate.toISOString().split('T')[0],
        type: h.type,
        daysAway,
      };
    });

    return NextResponse.json({
      upcomingBirthdays,
      upcomingAnniversaries,
      upcomingHolidays,
    });
  } catch (error: unknown) {
    console.error('Events API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
