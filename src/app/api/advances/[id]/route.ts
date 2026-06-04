import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// DELETE /api/advances/[id] - Delete an advance
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const advance = await db.advance.findUnique({ where: { id } });
    if (!advance) {
      return NextResponse.json({ error: 'Advance not found' }, { status: 404 });
    }

    await db.advance.delete({ where: { id } });

    // Recalculate payroll deductions
    const totalAdvances = await db.advance.aggregate({
      where: { 
        employeeId: advance.employeeId, 
        month: advance.month, 
        year: advance.year, 
        status: 'approved' 
      },
      _sum: { amount: true },
    });

    const payroll = await db.payroll.findFirst({
      where: { employeeId: advance.employeeId, month: advance.month, year: advance.year },
    });

    if (payroll) {
      const newAdvanceDeduction = totalAdvances._sum.amount || 0;
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Advance DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
