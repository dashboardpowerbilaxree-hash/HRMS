import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const status = searchParams.get('status') || 'active';

    const where: any = {};
    if (status) where.status = status;
    if (department) where.department = department;
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { employeeId: { contains: search } },
        { email: { contains: search } },
        { designation: { contains: search } },
      ];
    }

    const employees = await db.employee.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(employees);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const lastEmployee = await db.employee.findFirst({
      orderBy: { employeeId: 'desc' },
    });

    let nextNum = 1;
    if (lastEmployee) {
      const match = lastEmployee.employeeId.match(/EMP-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const employeeId = `EMP-${String(nextNum).padStart(3, '0')}`;

    const perDaySalary = body.salaryType === 'monthly'
      ? (body.basicSalary || 0) / 30
      : body.perDaySalary || 0;

    const employee = await db.employee.create({
      data: {
        employeeId,
        fullName: body.fullName,
        mobile: body.mobile || null,
        email: body.email || null,
        department: body.department,
        designation: body.designation,
        joiningDate: new Date(body.joiningDate),
        salaryType: body.salaryType || 'monthly',
        basicSalary: body.basicSalary || 0,
        perDaySalary,
        overtimeRate: body.overtimeRate || 0,
        shiftStart: body.shiftStart || '09:00',
        shiftEnd: body.shiftEnd || '18:00',
        shiftHours: body.shiftHours || 9,
        address: body.address || null,
        bankName: body.bankName || null,
        bankAccount: body.bankAccount || null,
        bankIfsc: body.bankIfsc || null,
        panNumber: body.panNumber || null,
        aadhaarNumber: body.aadhaarNumber || null,
        pfNumber: body.pfNumber || null,
        esiNumber: body.esiNumber || null,
        status: 'active',
        reportingManager: body.reportingManager || null,
        emergencyContact: body.emergencyContact || null,
        profilePhoto: body.profilePhoto || null,
      },
    });

    await db.notification.create({
      data: {
        title: 'New Employee Added',
        message: `${employee.fullName} (${employee.employeeId}) joined ${employee.department}`,
        type: 'employee',
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
