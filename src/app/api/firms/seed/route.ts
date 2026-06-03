import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    const firms = [
      { code: 'LAPL', name: 'LAXREE AMENITIES PVT LTD', description: 'Laxree Amenities Private Limited', address: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001', contactPhone: '+919251683663', contactEmail: 'hr@laxree.com' },
      { code: 'LRSL', name: 'LAXREE ROOFING SOLUTION', description: 'Laxree Roofing Solution LLP', address: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001', contactPhone: '+919251683663', contactEmail: 'hr@laxree.com' },
      { code: 'SI', name: 'SMARTH INTERNATIONAL', description: 'Smarth International', address: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001', contactPhone: '+919251683663', contactEmail: 'hr@laxree.com' },
      { code: 'SDF', name: 'SANGRAH DECOR & FURNITURE', description: 'Sangrah Decor & Furniture', address: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001', contactPhone: '+919251683663', contactEmail: 'hr@laxree.com' },
    ];

    const results = [];
    for (const firm of firms) {
      const result = await db.firm.upsert({
        where: { code: firm.code },
        update: { name: firm.name, description: firm.description, address: firm.address, contactPhone: firm.contactPhone, contactEmail: firm.contactEmail },
        create: firm,
      });
      results.push(result);
    }

    return NextResponse.json({ seeded: results.length, firms: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
