import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  try {
    const { employeeId } = await params;
    const employee = await db.employee.findUnique({
      where: { employeeId },
      include: {
        attendance: { orderBy: { date: 'desc' }, take: 30 },
        payrolls: { orderBy: [{ year: 'desc' }, { month: 'desc' }] },
        leaves: { orderBy: { createdAt: 'desc' } },
        overtimes: { orderBy: { date: 'desc' } },
        salaryHistory: { orderBy: [{ year: 'desc' }, { month: 'desc' }] },
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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  try {
    const { employeeId } = await params;
    const body = await request.json();

    const sh = body.shiftHours || 9;
    const daysInMonth = 31;
    const monthlySalary = body.monthlySalary || body.basicSalary || 0;
    const hourlyRate = body.salaryType === 'hourly'
      ? Math.round((monthlySalary / (sh * daysInMonth)) * 100) / 100
      : Math.round(((body.dailyRate || monthlySalary / 30) / sh) * 100) / 100;
    const overtimeRate = Math.round(hourlyRate * 1.5 * 100) / 100;

    const employee = await db.employee.update({
      where: { employeeId },
      data: {
        fullName: body.fullName?.trim(),
        mobile: body.mobile,
        email: body.email,
        firm: body.firm || body.department,
        location: body.location,
        salaryType: body.salaryType,
        monthlySalary,
        dailyRate: body.dailyRate || Math.round(monthlySalary / 30),
        hourlyRate,
        overtimeRate,
        employmentType: body.employmentType,
        shiftStart: body.shiftStart,
        shiftEnd: body.shiftEnd,
        shiftHours: sh,
        designation: body.designation,
        department: body.firm || body.department,
        address: body.address,
        bankName: body.bankName,
        bankAccount: body.bankAccount,
        bankIfsc: body.bankIfsc,
        panNumber: body.panNumber,
        aadhaarNumber: body.aadhaarNumber,
        pfNumber: body.pfNumber,
        esiNumber: body.esiNumber,
        status: body.status,
        reportingManager: body.reportingManager,
        emergencyContact: body.emergencyContact,
      },
    });

    return NextResponse.json(employee);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  try {
    const { employeeId } = await params;
    await db.employee.update({
      where: { employeeId },
      data: { status: 'inactive' },
    });
    return NextResponse.json({ message: 'Employee deactivated' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
