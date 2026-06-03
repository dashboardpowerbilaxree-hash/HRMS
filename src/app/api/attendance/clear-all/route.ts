import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const firm = searchParams.get('firm') || '';
    const month = searchParams.get('month') || '';
    const year = searchParams.get('year') || '';

    const where: any = {};

    // Filter by firm if provided
    if (firm) {
      const employeeFilter: any = { department: firm };
      where.employee = employeeFilter;
    }

    // Filter by month/year if provided
    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 1);
      where.date = { gte: start, lt: end };
    }

    // Delete associated overtime records first
    const attendanceRecords = await db.attendance.findMany({
      where,
      select: { id: true },
    });

    const attendanceIds = attendanceRecords.map(r => r.id);

    // Delete overtime records with ot- prefix
    if (attendanceIds.length > 0) {
      await db.overtime.deleteMany({
        where: {
          id: { in: attendanceIds.map(id => `ot-${id}`) },
        },
      });
    }

    // Delete all matching attendance records
    const result = await db.attendance.deleteMany({ where });

    // Also delete all overtime records that don't have the ot- prefix pattern
    // but are linked to deleted attendance
    await db.overtime.deleteMany({
      where: {
        employeeId: { not: '' },
        ...(month && year ? {
          date: {
            gte: new Date(parseInt(year), parseInt(month) - 1, 1),
            lt: new Date(parseInt(year), parseInt(month), 1),
          },
        } : {}),
      },
    });

    return NextResponse.json({
      message: `Cleared ${result.count} attendance records`,
      deletedCount: result.count,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
