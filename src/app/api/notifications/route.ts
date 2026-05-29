import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || '';
    const type = searchParams.get('type') || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (type) where.type = type;

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const unreadCount = await db.notification.count({
      where: { ...where, read: false },
    });
    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.markAll) {
      await db.notification.updateMany({
        where: { read: false },
        data: { read: true },
      });
      return NextResponse.json({ message: 'All marked as read' });
    }
    if (!body.id) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }
    const notification = await db.notification.update({
      where: { id: body.id },
      data: { read: true },
    });
    return NextResponse.json(notification);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
