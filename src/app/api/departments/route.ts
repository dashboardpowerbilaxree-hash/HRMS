import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const departments = await db.department.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(departments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dept = await db.department.create({
      data: { name: body.name, code: body.code, description: body.description || null, head: body.head || null },
    });
    return NextResponse.json(dept, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
