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

    const salaryType = (body.salaryType || '').toLowerCase();
    const sh = body.shiftHours || 9;
    const monthlySalary = body.monthlySalary || body.basicSalary || 0;

    // Hourly rate = monthlySalary / (daysInMonth × shiftHours)
    // User's formula: daysInMonth is total calendar days (28, 29, 30, or 31)
    //   30 days × 9 hrs = 270 hrs → ₹20,000 / 270 = ₹74.07
    //   31 days × 9 hrs = 279 hrs → ₹20,000 / 279 = ₹71.68
    //   28 days × 9 hrs = 252 hrs → ₹20,000 / 252 = ₹79.37
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    let totalWorkingDays = daysInMonth;
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(now.getFullYear(), now.getMonth(), d).getDay() === 0) totalWorkingDays--;
    }
    const holidays = await db.holiday.findMany({
      where: { date: { gte: new Date(now.getFullYear(), now.getMonth(), 1), lt: new Date(now.getFullYear(), now.getMonth() + 1, 1) } },
    });
    totalWorkingDays -= holidays.length;
    if (totalWorkingDays < 1) totalWorkingDays = 26;

    const hourlyRate = Math.round((monthlySalary / (sh * daysInMonth)) * 100) / 100;
    // OT at normal hourly rate (1x), NOT 1.5x — user explicitly confirmed
    const overtimeRate = Math.round(hourlyRate * 100) / 100;

    const employee = await db.employee.update({
      where: { employeeId },
      data: {
        fullName: body.fullName?.trim(),
        mobile: body.mobile,
        email: body.email,
        firm: body.firm || body.department,
        location: body.location,
        salaryType,
        monthlySalary,
        dailyRate: body.dailyRate || Math.round(monthlySalary / daysInMonth),
        hourlyRate,
        overtimeRate,
        employmentType: body.employmentType,
        shiftStart: body.shiftStart,
        shiftEnd: body.shiftEnd,
        shiftHours: sh,
        designation: body.designation,
        gender: body.gender,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
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
    const { searchParams } = new URL(request.url);
    const hard = searchParams.get('hard') === 'true';

    if (hard) {
      // HARD DELETE: permanently remove the employee and all related records
      // Order matters due to foreign key constraints
      // 1. Delete overtime records (references attendance via id pattern, also direct employeeId)
      await db.overtime.deleteMany({ where: { employeeId } });
      // 2. Delete attendance records
      await db.attendance.deleteMany({ where: { employeeId } });
      // 3. Delete salary history
      await db.salaryHistory.deleteMany({ where: { employeeId } });
      // 4. Delete leaves
      await db.leave.deleteMany({ where: { employeeId } });
      // 5. Delete payrolls
      await db.payroll.deleteMany({ where: { employeeId } });
      // 6. Delete advances
      await db.advance.deleteMany({ where: { employeeId } });
      // 7. Delete notifications
      await db.notification.deleteMany({ where: { employeeId } });
      // 8. Finally, delete the employee
      await db.employee.delete({ where: { employeeId } });
      return NextResponse.json({ message: 'Employee permanently deleted' });
    }

    // SOFT DELETE (default): mark employee as inactive
    await db.employee.update({
      where: { employeeId },
      data: { status: 'inactive' },
    });
    return NextResponse.json({ message: 'Employee deactivated' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
