import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const firms = await db.firm.findMany({ orderBy: { code: 'asc' } });
    return NextResponse.json(firms);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const firm = await db.firm.upsert({
      where: { code: body.code },
      update: { name: body.name, description: body.description },
      create: body,
    });
    return NextResponse.json(firm, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
