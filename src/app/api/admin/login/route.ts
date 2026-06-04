import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Check if admin table exists by trying to query it
    let admin;
    try {
      admin = await db.admin.findUnique({
        where: { username },
      });
    } catch (dbError: any) {
      console.error('Database query error:', dbError?.message);
      // If table doesn't exist, try seeding first
      if (dbError?.message?.includes('does not exist') || dbError?.code === 'P2021') {
        return NextResponse.json(
          { success: false, message: 'Database not initialized. Please seed the database first by visiting /api/seed', needsSeed: true },
          { status: 503 }
        );
      }
      throw dbError;
    }

    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (admin.password !== password) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error?.message || error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}
