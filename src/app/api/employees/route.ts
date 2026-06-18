import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // If requesting next employee code
    if (searchParams.get('nextCode') === 'true') {
      const allEmps = await db.employee.findMany({
        where: { employeeId: { startsWith: 'EMP-' } },
        select: { employeeId: true },
      });
      const codes = allEmps.map(e => parseInt(e.employeeId.replace('EMP-', ''))).filter(n => !isNaN(n));
      const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
      const nextNum = maxCode + 1;
      const nextCode = nextNum >= 100 ? `EMP-${nextNum}` : `EMP-${String(nextNum).padStart(3, '0')}`;
      return NextResponse.json({ nextCode, nextNum });
    }
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
      // Find the actual max numeric code across all employees
      const allEmps = await db.employee.findMany({
        where: { employeeId: { startsWith: 'EMP-' } },
        select: { employeeId: true },
      });
      const codes = allEmps.map(e => parseInt(e.employeeId.replace('EMP-', ''))).filter(n => !isNaN(n));
      const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
      const nextNum = maxCode + 1;
      employeeId = nextNum >= 100 ? `EMP-${nextNum}` : `EMP-${String(nextNum).padStart(3, '0')}`;
    }

    // Hourly rate = monthlySalary / (daysInMonth × shiftHours)
    // User's formula: daysInMonth is total calendar days (28, 29, 30, or 31)
    //   30 days × 9 hrs = 270 hrs → ₹20,000 / 270 = ₹74.07
    //   31 days × 9 hrs = 279 hrs → ₹20,000 / 279 = ₹71.68
    //   28 days × 9 hrs = 252 hrs → ₹20,000 / 252 = ₹79.37
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

    const hourlyRate = Math.round((monthlySalary / (sh * daysInMonth)) * 100) / 100;
    // OT at normal hourly rate (1x), NOT 1.5x — user explicitly confirmed
    const overtimeRate = Math.round(hourlyRate * 100) / 100;
    const dailyRate = body.dailyRate || Math.round(monthlySalary / daysInMonth);

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
          gender: body.gender ?? existing.gender,
          dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : existing.dateOfBirth,
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
          relievingDate: body.relievingDate ? new Date(body.relievingDate) : (body.relievingDate === null ? null : existing.relievingDate),
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
        gender: body.gender || null,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
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
        relievingDate: body.relievingDate ? new Date(body.relievingDate) : null,
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
