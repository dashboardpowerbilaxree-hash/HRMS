import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const departments = await db.department.findMany({
      orderBy: { name: 'asc' },
    });

    // Get employee counts per department
    const deptCounts = await db.employee.groupBy({
      by: ['department'],
      where: { status: 'Yes' },
      _count: { department: true },
    });
    const countMap: Record<string, number> = {};
    deptCounts.forEach(d => { countMap[d.department] = d._count.department; });

    const result = departments.map(d => ({
      ...d,
      employeeCount: countMap[d.name] || 0,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check for duplicate code
    const existing = await db.department.findFirst({
      where: { OR: [{ name: body.name }, { code: body.code }] },
    });
    if (existing) {
      return NextResponse.json({ error: 'Department with this name or code already exists' }, { status: 409 });
    }

    const dept = await db.department.create({
      data: {
        name: body.name,
        code: body.code,
        description: body.description || null,
        head: body.head || null,
        location: body.location || null,
      },
    });

    return NextResponse.json(dept, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
