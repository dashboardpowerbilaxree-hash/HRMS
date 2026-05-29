import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const notifications = await db.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    const unreadCount = await db.notification.count({ where: { read: false } });
    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.markAll) {
      await db.notification.updateMany({ where: { read: false }, data: { read: true } });
      return NextResponse.json({ message: 'All marked as read' });
    }
    const notification = await db.notification.update({ where: { id: body.id }, data: { read: true } });
    return NextResponse.json(notification);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
