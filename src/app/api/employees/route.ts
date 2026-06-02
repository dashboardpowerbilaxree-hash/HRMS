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
    const salaryType = (body.salaryType || '').toLowerCase();
    const monthlySalary = body.monthlySalary || body.basicSalary || 0;
    const shiftStart = body.shiftStart;
    const shiftEnd = body.shiftEnd;
    const shiftHours = body.shiftHours;

    if (!fullName || !firm) {
      return NextResponse.json({ error: 'Name and firm are required' }, { status: 400 });
    }

    // Use provided employeeId (for imports) or auto-generate
    let employeeId = body.employeeId;
    if (!employeeId) {
      const lastEmp = await db.employee.findFirst({
        where: { employeeId: { startsWith: 'EMP-' } },
        orderBy: { employeeId: 'desc' },
      });
      const nextNum = lastEmp ? parseInt(lastEmp.employeeId.replace('EMP-', '')) + 1 : 1;
      employeeId = `EMP-${String(nextNum).padStart(3, '0')}`;
    }

    // Hourly rate = monthlySalary / (shiftHours × totalWorkingDays)
    // Use current month's working days for calculation
    const sh = shiftHours || 9;
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
    if (totalWorkingDays < 1) totalWorkingDays = 26; // fallback

    const hourlyRate = Math.round((monthlySalary / (sh * totalWorkingDays)) * 100) / 100;
    // OT at normal hourly rate (1x), NOT 1.5x — user explicitly confirmed
    const overtimeRate = Math.round(hourlyRate * 100) / 100;
    const dailyRate = body.dailyRate || Math.round(monthlySalary / totalWorkingDays);

    // Check if employeeId already exists — if so, update instead
    const existing = await db.employee.findUnique({ where: { employeeId } });
    if (existing) {
      const updated = await db.employee.update({
        where: { employeeId },
        data: {
          fullName: fullName.trim(),
          mobile: body.mobile ?? existing.mobile,
          email: body.email ?? existing.email,
          firm,
          location: location || existing.location,
          salaryType: salaryType || existing.salaryType,
          monthlySalary: monthlySalary || existing.monthlySalary,
          dailyRate: dailyRate || existing.dailyRate,
          hourlyRate,
          overtimeRate,
          employmentType: body.employmentType || existing.employmentType,
          shiftStart: shiftStart || existing.shiftStart,
          shiftEnd: shiftEnd || existing.shiftEnd,
          shiftHours: sh || existing.shiftHours,
          designation: body.designation ?? existing.designation,
          department: firm,
          address: body.address ?? existing.address,
          bankName: body.bankName ?? existing.bankName,
          bankAccount: body.bankAccount ?? existing.bankAccount,
          bankIfsc: body.bankIfsc ?? existing.bankIfsc,
          panNumber: body.panNumber ?? existing.panNumber,
          aadhaarNumber: body.aadhaarNumber ?? existing.aadhaarNumber,
          pfNumber: body.pfNumber ?? existing.pfNumber,
          esiNumber: body.esiNumber ?? existing.esiNumber,
          status: body.status || existing.status,
          reportingManager: body.reportingManager ?? existing.reportingManager,
          emergencyContact: body.emergencyContact ?? existing.emergencyContact,
        },
      });
      return NextResponse.json(updated, { status: 200 });
    }

    const employee = await db.employee.create({
      data: {
        employeeId,
        fullName: fullName.trim(),
        mobile: body.mobile || null,
        email: body.email || null,
        firm,
        location: location || 'Ajmer',
        salaryType: salaryType?.toLowerCase() || 'hourly',
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
