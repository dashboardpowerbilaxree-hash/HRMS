import { NextRequest, NextResponse } from 'next/server';

// ════════════════════════════════════════════════════════════════════════
// v24·0625 — HRMS-side proxy: PATCH /api/erp-bridge/attendance-queries/[id]/respond
// ════════════════════════════════════════════════════════════════════════
// Forwards HR's reply from the HRMS dashboard to ERP's external API:
//   PATCH {ERP_URL}/api/external/attendance-queries/{id}/respond
// with header `x-erp-api-key: <ERP_BRIDGE_API_KEY>`
// and body `{ hrReply, repliedBy, status }`.
//
// WHY A PROXY: keeps the shared API key on the server (browser never sees it).
//
// SAFETY: This endpoint does not touch the HRMS database. It only forwards
// the HR reply to ERP, where it is stored in ERP's AttendanceQuery table.
// ════════════════════════════════════════════════════════════════════════

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Query id is required' }, { status: 400 });
    }

    const erpUrl = process.env.ERP_BRIDGE_URL;
    const erpKey = process.env.ERP_BRIDGE_API_KEY;
    if (!erpUrl || !erpKey) {
      return NextResponse.json(
        { error: 'ERP bridge not configured. Set ERP_BRIDGE_URL and ERP_BRIDGE_API_KEY env vars on the HRMS server.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { hrReply, repliedBy, status } = body || {};

    if (!hrReply || !repliedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: hrReply, repliedBy' },
        { status: 400 }
      );
    }

    const targetUrl = `${erpUrl.replace(/\/$/, '')}/api/external/attendance-queries/${encodeURIComponent(id)}/respond`;

    const erpRes = await fetch(targetUrl, {
      method: 'PATCH',
      headers: {
        'x-erp-api-key': erpKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hrReply: String(hrReply).slice(0, 4000),
        repliedBy: String(repliedBy).slice(0, 100),
        status: status === 'CLOSED' ? 'CLOSED' : 'RESPONDED',
      }),
      cache: 'no-store',
    });

    if (!erpRes.ok) {
      const errTxt = await erpRes.text().catch(() => '');
      return NextResponse.json(
        { error: `ERP returned HTTP ${erpRes.status}: ${errTxt.slice(0, 300)}` },
        { status: erpRes.status }
      );
    }

    const data = await erpRes.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('erp-bridge/attendance-queries respond error:', error);
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}
