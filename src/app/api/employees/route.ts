import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const firm = searchParams.get('firm') || searchParams.get('department') || '';
    const location = searchParams.get('location') || '';
    const status = searchParams.get('status') || '';
    const salaryType = searchParams.get('salaryType') || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { employeeId: { contains: search } },
        { mobile: { contains: search } },
      ];
    }
    if (firm) where.firm = firm;
    if (location) where.location = location;
    if (status) where.status = status;
    if (salaryType) where.salaryType = salaryType;

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
    const fullName = body.fullName;
    const firm = body.firm || body.department;
    const location = body.location;
    const salaryType = body.salaryType;
    const monthlySalary = body.monthlySalary || body.basicSalary || 0;
    const shiftStart = body.shiftStart;
    const shiftEnd = body.shiftEnd;
    const shiftHours = body.shiftHours;

    if (!fullName || !firm) {
      return NextResponse.json({ error: 'Name and firm are required' }, { status: 400 });
    }

    // Auto-generate employee ID
    const lastEmp = await db.employee.findFirst({
      where: { employeeId: { startsWith: 'EMP-' } },
      orderBy: { employeeId: 'desc' },
    });
    const nextNum = lastEmp ? parseInt(lastEmp.employeeId.replace('EMP-', '')) + 1 : 1;
    const employeeId = `EMP-${String(nextNum).padStart(3, '0')}`;

    const sh = shiftHours || 9;
    const daysInMonth = 31;
    const hourlyRate = salaryType === 'hourly'
      ? Math.round((monthlySalary / (sh * daysInMonth)) * 100) / 100
      : Math.round(((body.dailyRate || monthlySalary / 30) / sh) * 100) / 100;
    const overtimeRate = Math.round(hourlyRate * 1.5 * 100) / 100;
    const dailyRate = body.dailyRate || Math.round(monthlySalary / 30);

    const employee = await db.employee.create({
      data: {
        employeeId,
        fullName: fullName.trim(),
        mobile: body.mobile || null,
        email: body.email || null,
        firm,
        location: location || 'Ajmer',
        salaryType: salaryType || 'hourly',
        monthlySalary: monthlySalary || 0,
        dailyRate,
        hourlyRate,
        overtimeRate,
        employmentType: body.employmentType || 'Full Time',
        shiftStart: shiftStart || '10:00',
        shiftEnd: shiftEnd || '19:00',
        shiftHours: sh,
        designation: body.designation || null,
        department: firm,
        joiningDate: body.joiningDate ? new Date(body.joiningDate) : new Date(),
        address: body.address || null,
        bankName: body.bankName || null,
        bankAccount: body.bankAccount || null,
        bankIfsc: body.bankIfsc || null,
        panNumber: body.panNumber || null,
        aadhaarNumber: body.aadhaarNumber || null,
        pfNumber: body.pfNumber || null,
        esiNumber: body.esiNumber || null,
        status: body.status || 'Yes',
        reportingManager: body.reportingManager || null,
        emergencyContact: body.emergencyContact || null,
      },
    });

    await db.notification.create({
      data: {
        title: 'New Employee Added',
        message: `${fullName} (${employeeId}) joined ${firm} at ${location || 'Ajmer'}`,
        type: 'employee',
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
