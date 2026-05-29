import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || '';
    const type = searchParams.get('type') || '';

    const where: any = {};
    if (type) where.type = type;
    if (year) {
      const y = parseInt(year);
      const start = new Date(y, 0, 1);
      const end = new Date(y + 1, 0, 1);
      where.date = { gte: start, lt: end };
    }

    const holidays = await db.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
    });
    return NextResponse.json(holidays);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check for duplicate holiday on same date
    const d = new Date(body.date);
    const existing = await db.holiday.findFirst({
      where: {
        date: {
          gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
          lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
        },
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'A holiday already exists on this date' }, { status: 409 });
    }

    const holiday = await db.holiday.create({
      data: {
        name: body.name,
        date: d,
        type: body.type || 'national',
        description: body.description || null,
      },
    });

    await db.notification.create({
      data: {
        title: 'New Holiday Added',
        message: `${body.name} on ${d.toLocaleDateString('en-IN')} - ${body.type || 'national'} holiday`,
        type: 'holiday',
      },
    });

    return NextResponse.json(holiday, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await db.holiday.delete({ where: { id } });
    return NextResponse.json({ message: 'Holiday deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
