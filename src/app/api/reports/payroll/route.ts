import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const department = searchParams.get('department') || '';

    const where: any = { month, year };
    if (department) {
      const emps = await db.employee.findMany({ where: { department }, select: { employeeId: true } });
      where.employeeId = { in: emps.map(e => e.employeeId) };
    }

    const payrolls = await db.payroll.findMany({
      where,
      include: { employee: { select: { fullName: true, employeeId: true, department: true, designation: true } } },
    });

    const totals = {
      totalGross: payrolls.reduce((s, p) => s + p.grossSalary, 0),
      totalDeductions: payrolls.reduce((s, p) => s + p.totalDeductions, 0),
      totalNet: payrolls.reduce((s, p) => s + p.netSalary, 0),
      totalOT: payrolls.reduce((s, p) => s + p.overtimeAmount, 0),
      totalPF: payrolls.reduce((s, p) => s + p.pfDeduction, 0),
      totalESI: payrolls.reduce((s, p) => s + p.esiDeduction, 0),
    };

    const deptBreakdown: Record<string, { count: number; totalNet: number; totalGross: number }> = {};
    payrolls.forEach(p => {
      const dept = (p.employee as any)?.department || 'Unknown';
      if (!deptBreakdown[dept]) deptBreakdown[dept] = { count: 0, totalNet: 0, totalGross: 0 };
      deptBreakdown[dept].count++;
      deptBreakdown[dept].totalNet += p.netSalary;
      deptBreakdown[dept].totalGross += p.grossSalary;
    });

    return NextResponse.json({ payrolls, totals, deptBreakdown });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
