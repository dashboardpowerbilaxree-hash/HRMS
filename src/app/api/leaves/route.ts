import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || '';
    const status = searchParams.get('status') || '';

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const leaves = await db.leave.findMany({
      where,
      include: { employee: { select: { fullName: true, employeeId: true, department: true } } },
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
        title: 'New Leave Request',
        message: `Leave request from ${body.employeeId}: ${body.type}`,
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
    const leave = await db.leave.update({
      where: { id: body.id },
      data: { status: body.status, approvedBy: body.approvedBy || null },
    });
    return NextResponse.json(leave);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
