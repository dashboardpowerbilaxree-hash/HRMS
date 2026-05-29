import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params;
    const employee = await db.employee.findUnique({
      where: { employeeId },
      include: {
        attendance: { orderBy: { date: 'desc' }, take: 30 },
        payrolls: { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 12 },
        leaves: { orderBy: { createdAt: 'desc' }, take: 20 },
        overtimes: { orderBy: { date: 'desc' }, take: 20 },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params;
    const body = await request.json();

    const perDaySalary = body.salaryType === 'monthly'
      ? (body.basicSalary || 0) / 30
      : body.perDaySalary || 0;

    const employee = await db.employee.update({
      where: { employeeId },
      data: {
        ...body,
        perDaySalary,
        joiningDate: body.joiningDate ? new Date(body.joiningDate) : undefined,
      },
    });

    return NextResponse.json(employee);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params;
    const employee = await db.employee.update({
      where: { employeeId },
      data: { status: 'archived' },
    });

    return NextResponse.json({ message: 'Employee archived', employee });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
