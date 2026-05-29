import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const department = searchParams.get('department') || '';
    const location = searchParams.get('location') || '';

    const where: any = { month, year };
    if (department || location) {
      const empFilter: any = {};
      if (department) empFilter.department = department;
      if (location) empFilter.location = location;
      const emps = await db.employee.findMany({ where: empFilter, select: { employeeId: true } });
      where.employeeId = { in: emps.map(e => e.employeeId) };
    }

    const payrolls = await db.payroll.findMany({
      where,
      include: {
        employee: {
          select: {
            fullName: true,
            employeeId: true,
            department: true,
            designation: true,
            location: true,
            salaryType: true,
          },
        },
      },
    });

    const round2 = (n: number) => Math.round(n * 100) / 100;

    const totals = {
      totalGross: round2(payrolls.reduce((s, p) => s + p.grossSalary, 0)),
      totalDeductions: round2(payrolls.reduce((s, p) => s + p.totalDeductions, 0)),
      totalNet: round2(payrolls.reduce((s, p) => s + p.netSalary, 0)),
      totalOT: round2(payrolls.reduce((s, p) => s + p.overtimeAmount, 0)),
      totalPF: round2(payrolls.reduce((s, p) => s + p.pfDeduction, 0)),
      totalESI: round2(payrolls.reduce((s, p) => s + p.esiDeduction, 0)),
      totalTDS: round2(payrolls.reduce((s, p) => s + p.tdsDeduction, 0)),
      totalLoan: round2(payrolls.reduce((s, p) => s + p.loanDeduction, 0)),
      totalAdvance: round2(payrolls.reduce((s, p) => s + p.advanceDeduction, 0)),
      totalSecurityDeposit: round2(payrolls.reduce((s, p) => s + p.securityDeposit, 0)),
      totalSundayAmount: round2(payrolls.reduce((s, p) => s + p.sundayAmount, 0)),
      totalPHAmount: round2(payrolls.reduce((s, p) => s + p.phAmount, 0)),
      totalWorkHours: round2(payrolls.reduce((s, p) => s + p.totalWorkHours, 0)),
      totalSundayHours: round2(payrolls.reduce((s, p) => s + p.sundayHours, 0)),
      totalPHHours: round2(payrolls.reduce((s, p) => s + p.phHours, 0)),
    };

    // Firm-wise payroll breakdown
    const firmBreakdown: Record<string, {
      count: number;
      totalGross: number;
      totalNet: number;
      totalDeductions: number;
      totalOT: number;
      totalSundayAmount: number;
      totalPHAmount: number;
    }> = {};
    payrolls.forEach(p => {
      const firm = (p.employee as any)?.department || 'Unknown';
      if (!firmBreakdown[firm]) {
        firmBreakdown[firm] = {
          count: 0, totalGross: 0, totalNet: 0, totalDeductions: 0,
          totalOT: 0, totalSundayAmount: 0, totalPHAmount: 0,
        };
      }
      firmBreakdown[firm].count++;
      firmBreakdown[firm].totalGross += p.grossSalary;
      firmBreakdown[firm].totalNet += p.netSalary;
      firmBreakdown[firm].totalDeductions += p.totalDeductions;
      firmBreakdown[firm].totalOT += p.overtimeAmount;
      firmBreakdown[firm].totalSundayAmount += p.sundayAmount;
      firmBreakdown[firm].totalPHAmount += p.phAmount;
    });

    // Round firm breakdown values
    Object.keys(firmBreakdown).forEach(firm => {
      const fb = firmBreakdown[firm];
      fb.totalGross = round2(fb.totalGross);
      fb.totalNet = round2(fb.totalNet);
      fb.totalDeductions = round2(fb.totalDeductions);
      fb.totalOT = round2(fb.totalOT);
      fb.totalSundayAmount = round2(fb.totalSundayAmount);
      fb.totalPHAmount = round2(fb.totalPHAmount);
    });

    // Location-wise payroll breakdown
    const locationBreakdown: Record<string, {
      count: number;
      totalGross: number;
      totalNet: number;
    }> = {};
    payrolls.forEach(p => {
      const loc = (p.employee as any)?.location || 'Unknown';
      if (!locationBreakdown[loc]) {
        locationBreakdown[loc] = { count: 0, totalGross: 0, totalNet: 0 };
      }
      locationBreakdown[loc].count++;
      locationBreakdown[loc].totalGross += p.grossSalary;
      locationBreakdown[loc].totalNet += p.netSalary;
    });

    // Round location breakdown values
    Object.keys(locationBreakdown).forEach(loc => {
      const lb = locationBreakdown[loc];
      lb.totalGross = round2(lb.totalGross);
      lb.totalNet = round2(lb.totalNet);
    });

    // Salary type breakdown
    const salaryTypeBreakdown: Record<string, { count: number; totalNet: number }> = {};
    payrolls.forEach(p => {
      const st = (p.employee as any)?.salaryType || 'Unknown';
      if (!salaryTypeBreakdown[st]) {
        salaryTypeBreakdown[st] = { count: 0, totalNet: 0 };
      }
      salaryTypeBreakdown[st].count++;
      salaryTypeBreakdown[st].totalNet += p.netSalary;
    });

    return NextResponse.json({
      payrolls,
      totals,
      firmBreakdown,
      locationBreakdown,
      salaryTypeBreakdown,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
