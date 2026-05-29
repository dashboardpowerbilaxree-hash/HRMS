import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const holidays = await db.holiday.findMany({ orderBy: { date: 'asc' } });
    return NextResponse.json(holidays);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const holiday = await db.holiday.create({
      data: {
        name: body.name,
        date: new Date(body.date),
        type: body.type || 'national',
        description: body.description || null,
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
