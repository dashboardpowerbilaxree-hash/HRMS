import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ── Batch 1: Run all independent count/lookup queries in parallel ──
    // Previously these were 6 sequential awaits; now they run concurrently.
    const [
      totalEmployees,
      inactiveEmployees,
      todayAttendance,
      overtimeRecords,
      payrolls,
      pendingLeaves,
      firmCounts,
      locationCounts,
      firms,
      locations,
      recentNotifications,
    ] = await Promise.all([
      db.employee.count(),
      db.employee.count({ where: { status: { in: ['inactive', 'No'] } } }),
      db.attendance.findMany({
        where: { date: { gte: today, lt: tomorrow }, status: { not: 'absent' } },
      }),
      db.overtime.findMany({
        where: {
          date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) },
        },
      }),
      db.payroll.findMany({
        where: { month, year },
        include: { employee: { select: { firm: true } } },
      }),
      db.leave.count({ where: { status: 'pending' } }),
      db.employee.groupBy({ by: ['firm'], _count: { firm: true } }),
      db.employee.groupBy({ by: ['location'], _count: { location: true } }),
      db.firm.findMany(),
      db.location.findMany(),
      db.notification.findMany({ take: 10, orderBy: { createdAt: 'desc' } }),
    ]);

    const activeEmployees = totalEmployees - inactiveEmployees;
    const presentToday = todayAttendance.filter(a =>
      ['present', 'late', 'half-day', 'half_day'].includes(a.status),
    ).length;
    const absentToday = Math.max(0, activeEmployees - todayAttendance.length);
    const lateToday = todayAttendance.filter(a => a.lateEntry).length;
    const totalOvertimeHours =
      Math.round(overtimeRecords.reduce((sum, o) => sum + o.hours, 0) * 10) / 10;
    const monthlyPayrollCost = payrolls.reduce((sum, p) => sum + p.netSalary, 0);
    const firmWiseCount = firmCounts.map(f => ({ firm: f.firm, count: f._count.firm }));

    // ── Firm payroll breakdown (single pass over payrolls already fetched) ──
    // Previously this was a SECOND payrolls query (with include) — now we
    // include employee.firm in the main payrolls query above and reuse it.
    const firmPayrollBreakdown: Record<string, { count: number; totalGross: number; totalNet: number }> = {};
    for (const fc of firmCounts) {
      firmPayrollBreakdown[fc.firm] = {
        count: fc._count.firm,
        totalGross: 0,
        totalNet: 0,
      };
    }
    for (const p of payrolls) {
      const firm = p.employee?.firm;
      if (!firm) continue;
      if (!firmPayrollBreakdown[firm]) {
        firmPayrollBreakdown[firm] = { count: 0, totalGross: 0, totalNet: 0 };
      }
      firmPayrollBreakdown[firm].totalGross += p.grossSalary;
      firmPayrollBreakdown[firm].totalNet += p.netSalary;
    }

    const locationWiseCount = locationCounts.map(l => ({
      location: l.location,
      count: l._count.location,
    }));

    // ── Batch 2: Attendance trend (last 7 days) in ONE query ──
    // Previously this was 7 sequential queries (one per day). Now we fetch
    // all records for the 7-day window in a single query and group in memory.
    const trendStart = new Date(today);
    trendStart.setDate(trendStart.getDate() - 6);
    const trendAttendance = await db.attendance.findMany({
      where: { date: { gte: trendStart, lt: tomorrow } },
      select: { date: true, status: true },
    });
    const attendanceTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      const dayAtt = trendAttendance.filter(a => {
        const ad = new Date(a.date);
        return ad >= d && ad < nextD;
      });
      attendanceTrend.push({
        date: d.toISOString().split('T')[0],
        present: dayAtt.filter(a =>
          ['present', 'late', 'half-day', 'half_day'].includes(a.status),
        ).length,
        absent: dayAtt.filter(a => a.status === 'absent').length,
      });
    }

    // ── Batch 3: Payroll trend (last 6 months) in ONE query ──
    // Previously this was 6 sequential queries (one per month). Now we fetch
    // all payrolls for the 6-month window in a single query and group in memory.
    let startMonth = month - 5;
    let startYear = year;
    while (startMonth <= 0) {
      startMonth += 12;
      startYear--;
    }
    const payrollTrendStart = new Date(startYear, startMonth - 1, 1);
    const payrollTrendEnd = new Date(year, month, 1);
    const payrollTrendRecords = await db.payroll.findMany({
      where: {
        // We can't filter by month/year directly since they're separate fields,
        // but we can fetch all and filter in memory. Since payroll rows have
        // month+year columns, we fetch a broad window and filter in JS.
        // This is still much faster than 6 round-trips.
        AND: [
          { year: { gte: startYear } },
          { year: { lte: year } },
        ],
      },
      select: { month: true, year: true, netSalary: true },
    });
    const payrollTrend = [];
    for (let i = 5; i >= 0; i--) {
      let m = month - i;
      let y = year;
      if (m <= 0) {
        m += 12;
        y--;
      }
      const monthPayrolls = payrollTrendRecords.filter(p => p.month === m && p.year === y);
      payrollTrend.push({
        month: m,
        year: y,
        total: monthPayrolls.reduce((sum, p) => sum + p.netSalary, 0),
      });
    }

    return NextResponse.json({
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      presentToday,
      absentToday,
      lateToday,
      totalOvertimeHours,
      monthlyPayrollCost,
      pendingLeaves,
      firmWiseCount,
      firmPayrollBreakdown,
      locationWiseCount,
      firmsCount: firms.length,
      locationsCount: locations.length,
      recentNotifications,
      attendanceTrend,
      payrollTrend,
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
