import { NextRequest, NextResponse } from 'next/server';

// ════════════════════════════════════════════════════════════════════════
// v24·0625 — HRMS-side proxy: GET /api/erp-bridge/attendance-queries
// ════════════════════════════════════════════════════════════════════════
// Forwards HRMS dashboard requests to ERP's external API
//   GET {ERP_URL}/api/external/attendance-queries?status=OPEN
// with header `x-erp-api-key: <ERP_BRIDGE_API_KEY>`.
//
// WHY A PROXY (instead of calling ERP directly from the browser)?
//   - The browser must NEVER see the `ERP_BRIDGE_API_KEY` shared secret.
//   - This server-side route injects the key from env vars before forwarding.
//
// SAFETY: PURELY READ-ONLY. This endpoint does not touch the HRMS database.
// It only forwards the request to ERP and returns ERP's response unchanged.
// ════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const erpUrl = process.env.ERP_BRIDGE_URL;
    const erpKey = process.env.ERP_BRIDGE_API_KEY;
    if (!erpUrl || !erpKey) {
      return NextResponse.json(
        {
          error: 'ERP bridge not configured. Set ERP_BRIDGE_URL and ERP_BRIDGE_API_KEY env vars on the HRMS server.',
          queries: [],
        },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // OPEN | RESPONDED | CLOSED — optional

    const targetUrl = new URL(`${erpUrl.replace(/\/$/, '')}/api/external/attendance-queries`);
    if (status) targetUrl.searchParams.set('status', status);

    const erpRes = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'x-erp-api-key': erpKey,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!erpRes.ok) {
      const errTxt = await erpRes.text().catch(() => '');
      return NextResponse.json(
        {
          error: `ERP returned HTTP ${erpRes.status}: ${errTxt.slice(0, 300)}`,
          queries: [],
        },
        { status: erpRes.status }
      );
    }

    const data = await erpRes.json();
    // ERP returns { queries: [...] } — pass through unchanged
    return NextResponse.json({
      queries: Array.isArray(data?.queries) ? data.queries : [],
    });
  } catch (error: any) {
    console.error('erp-bridge/attendance-queries GET error:', error);
    return NextResponse.json(
      { error: error?.message || 'Server error', queries: [] },
      { status: 500 }
    );
  }
}
