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

    const totalEmployees = await db.employee.count({ where: { status: 'active' } });
    const activeEmployees = totalEmployees;

    const todayAttendance = await db.attendance.findMany({
      where: { date: { gte: today, lt: tomorrow }, status: { not: 'absent' } },
    });
    const presentToday = todayAttendance.filter(a => ['present', 'late', 'half_day'].includes(a.status)).length;
    const absentToday = Math.max(0, activeEmployees - todayAttendance.length);
    const lateToday = todayAttendance.filter(a => a.lateEntry).length;

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);
    const overtimeRecords = await db.overtime.findMany({ where: { date: { gte: monthStart, lt: monthEnd } } });
    const totalOvertimeHours = overtimeRecords.reduce((sum, o) => sum + o.hours, 0);

    const payrolls = await db.payroll.findMany({ where: { month, year } });
    const monthlyPayrollCost = payrolls.reduce((sum, p) => sum + p.netSalary, 0);

    const pendingLeaves = await db.leave.count({ where: { status: 'pending' } });

    const deptCounts = await db.employee.groupBy({ by: ['department'], where: { status: 'active' }, _count: { department: true } });
    const departmentWiseCount = deptCounts.map(d => ({ department: d.department, count: d._count.department }));

    const recentNotifications = await db.notification.findMany({ take: 10, orderBy: { createdAt: 'desc' } });

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

    const payrollTrend = [];
    for (let i = 5; i >= 0; i--) {
      let m = month - i;
      let y = year;
      if (m <= 0) { m += 12; y--; }
      const p = await db.payroll.findMany({ where: { month: m, year: y } });
      payrollTrend.push({ month: m, year: y, total: p.reduce((sum, pr) => sum + pr.netSalary, 0) });
    }

    return NextResponse.json({
      totalEmployees, activeEmployees, presentToday, absentToday, lateToday,
      totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
      monthlyPayrollCost, pendingLeaves, departmentWiseCount,
      recentNotifications: recentNotifications, attendanceTrend, payrollTrend,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
