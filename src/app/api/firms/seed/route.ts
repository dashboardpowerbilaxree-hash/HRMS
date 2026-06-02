import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    const firms = [
      { code: 'LAPL', name: 'LAXREE AMENITIES PVT LTD', description: 'Laxree Amenities Private Limited' },
      { code: 'LRSL', name: 'LAXREE ROOFING SOLUTION', description: 'Laxree Roofing Solution LLP' },
      { code: 'SI', name: 'SMARTH INTERNATIONAL', description: 'Smarth International' },
      { code: 'SDF', name: 'SANGRAH DECOR & FURNITURE', description: 'Sangrah Decor & Furniture' },
    ];

    const results = [];
    for (const firm of firms) {
      const result = await db.firm.upsert({
        where: { code: firm.code },
        update: { name: firm.name, description: firm.description },
        create: firm,
      });
      results.push(result);
    }

    return NextResponse.json({ seeded: results.length, firms: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
