import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || '';
    const status = searchParams.get('status') || '';
    const department = searchParams.get('department') || '';

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (department) {
      const emps = await db.employee.findMany({
        where: { department },
        select: { employeeId: true },
      });
      where.employeeId = { in: emps.map(e => e.employeeId) };
    }

    const leaves = await db.leave.findMany({
      where,
      include: {
        employee: {
          select: {
            fullName: true,
            employeeId: true,
            department: true,
            location: true,
            designation: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(leaves);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify employee exists
    const employee = await db.employee.findUnique({ where: { employeeId: body.employeeId } });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const leave = await db.leave.create({
      data: {
        employeeId: body.employeeId,
        type: body.type,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        days: body.days || 1,
        reason: body.reason || null,
        status: 'pending',
      },
    });

    await db.notification.create({
      data: {
        employeeId: body.employeeId,
        title: 'New Leave Request',
        message: `Leave request from ${employee.fullName} (${body.employeeId}): ${body.type} for ${body.days || 1} day(s)`,
        type: 'leave',
      },
    });

    return NextResponse.json(leave, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Leave ID required' }, { status: 400 });
    }

    const leave = await db.leave.update({
      where: { id: body.id },
      data: { status: body.status, approvedBy: body.approvedBy || null },
    });

    // Get employee for notification
    const employee = await db.employee.findUnique({
      where: { employeeId: leave.employeeId },
      select: { fullName: true },
    });

    await db.notification.create({
      data: {
        employeeId: leave.employeeId,
        title: `Leave ${body.status}`,
        message: `${employee?.fullName || leave.employeeId}'s ${leave.type} request has been ${body.status}`,
        type: 'leave',
      },
    });

    return NextResponse.json(leave);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
