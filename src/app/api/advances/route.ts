import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/advances - List all advances (optionally filter by month/year/employee)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const employeeId = searchParams.get('employeeId');

    const where: any = {};
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (employeeId) where.employeeId = employeeId;

    const advances = await db.advance.findMany({
      where,
      include: {
        employee: {
          select: {
            fullName: true,
            employeeId: true,
            firm: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(advances);
  } catch (error: any) {
    console.error('Advances GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/advances - Create a new advance
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, amount, reason, date, month, year } = body;

    if (!employeeId || !amount || !reason) {
      return NextResponse.json({ error: 'Employee, amount, and reason are required' }, { status: 400 });
    }

    const advanceDate = date ? new Date(date) : new Date();
    const advanceMonth = month || advanceDate.getMonth() + 1;
    const advanceYear = year || advanceDate.getFullYear();

    const advance = await db.advance.create({
      data: {
        employeeId,
        amount: parseFloat(amount),
        reason,
        date: advanceDate,
        month: advanceMonth,
        year: advanceYear,
        status: 'approved',
      },
      include: {
        employee: {
          select: {
            fullName: true,
            employeeId: true,
            firm: true,
          },
        },
      },
    });

    // Also update the payroll advanceDeduction for this employee/month/year
    const payroll = await db.payroll.findFirst({
      where: { employeeId, month: advanceMonth, year: advanceYear },
    });

    if (payroll) {
      const totalAdvances = await db.advance.aggregate({
        where: { employeeId, month: advanceMonth, year: advanceYear, status: 'approved' },
        _sum: { amount: true },
      });

      const newAdvanceDeduction = totalAdvances._sum.amount || 0;

      // Recalculate total deductions and net salary
      const totalDeductions = payroll.tdsDeduction + payroll.loanDeduction + newAdvanceDeduction + payroll.securityDeposit + payroll.otherDeductions;
      const netSalary = payroll.grossSalary + payroll.bonus + payroll.incentive + payroll.arrear - totalDeductions;

      await db.payroll.update({
        where: { id: payroll.id },
        data: {
          advanceDeduction: newAdvanceDeduction,
          totalDeductions: Math.round(totalDeductions * 100) / 100,
          netSalary: Math.round(netSalary * 100) / 100,
        },
      });
    }

    return NextResponse.json(advance);
  } catch (error: any) {
    console.error('Advances POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
