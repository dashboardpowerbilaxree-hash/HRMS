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

    const totalEmployees = await db.employee.count();
    const inactiveEmployees = await db.employee.count({ where: { status: { in: ['inactive', 'No'] } } });
    const activeEmployees = totalEmployees - inactiveEmployees;

    const todayAttendance = await db.attendance.findMany({
      where: { date: { gte: today, lt: tomorrow }, status: { not: 'absent' } },
    });
    const presentToday = todayAttendance.filter(a => ['present', 'late', 'half_day'].includes(a.status)).length;
    const absentToday = Math.max(0, activeEmployees - todayAttendance.length);
    const lateToday = todayAttendance.filter(a => a.lateEntry).length;

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);
    const overtimeRecords = await db.overtime.findMany({ where: { date: { gte: monthStart, lt: monthEnd } } });
    const totalOvertimeHours = Math.round(overtimeRecords.reduce((sum, o) => sum + o.hours, 0) * 10) / 10;

    const payrolls = await db.payroll.findMany({ where: { month, year } });
    const monthlyPayrollCost = payrolls.reduce((sum, p) => sum + p.netSalary, 0);

    const pendingLeaves = await db.leave.count({ where: { status: 'pending' } });

    // Firm-wise counts
    const firmCounts = await db.employee.groupBy({ by: ['firm'], _count: { firm: true } });
    const firmWiseCount = firmCounts.map(f => ({ firm: f.firm, count: f._count.firm }));

    // Firm payroll breakdown
    const firmPayrollBreakdown: Record<string, { count: number; totalGross: number; totalNet: number }> = {};
    for (const fc of firmCounts) {
      const firmName = fc.firm;
      const firmPayrolls = payrolls.filter(p => {
        // Find employee for this payroll to check their firm
        return true; // We'll filter properly below
      });
      firmPayrollBreakdown[firmName] = { count: fc._count.firm, totalGross: 0, totalNet: 0 };
    }
    // Calculate payroll per firm by looking up employee firm
    const payrollEmployees = await db.payroll.findMany({
      where: { month, year },
      include: { employee: { select: { firm: true } } },
    });
    for (const p of payrollEmployees) {
      const firm = p.employee.firm;
      if (!firmPayrollBreakdown[firm]) {
        firmPayrollBreakdown[firm] = { count: 0, totalGross: 0, totalNet: 0 };
      }
      firmPayrollBreakdown[firm].totalGross += p.grossSalary;
      firmPayrollBreakdown[firm].totalNet += p.netSalary;
    }

    // Location-wise counts
    const locationCounts = await db.employee.groupBy({ by: ['location'], _count: { location: true } });
    const locationWiseCount = locationCounts.map(l => ({ location: l.location, count: l._count.location }));

    const firms = await db.firm.findMany();
    const locations = await db.location.findMany();

    const recentNotifications = await db.notification.findMany({ take: 10, orderBy: { createdAt: 'desc' } });

    // Attendance trend (7 days)
    const attendanceTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      const dayAtt = await db.attendance.findMany({ where: { date: { gte: d, lt: nextD } } });
      attendanceTrend.push({
        date: d.toISOString().split('T')[0],
        present: dayAtt.filter(a => ['present', 'late', 'half_day'].includes(a.status)).length,
        absent: dayAtt.filter(a => a.status === 'absent').length,
      });
    }

    // Payroll trend (6 months)
    const payrollTrend = [];
    for (let i = 5; i >= 0; i--) {
      let m = month - i;
      let y = year;
      if (m <= 0) { m += 12; y--; }
      const p = await db.payroll.findMany({ where: { month: m, year: y } });
      payrollTrend.push({ month: m, year: y, total: p.reduce((sum, pr) => sum + pr.netSalary, 0) });
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
