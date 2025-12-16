import { NextResponse } from 'next/server';

import { testSupabaseConnection } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(
  status: number,
  body: Record<string, unknown>
): NextResponse<Record<string, unknown>> {
  return NextResponse.json(body, {
    status,
    headers: {
      // Don't cache health checks.
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function GET() {
  // Optional override to test maintenance UI locally.
  if (process.env.FORCE_SUPABASE_DOWN === '1') {
    return json(503, { ok: false, service: 'supabase', error: 'forced_down' });
  }

  // We want this to be VERY cheap and quick.
  // `testSupabaseConnection` already has a timeout (fetch abort) configured.
  const ok = await testSupabaseConnection();

  if (!ok) {
    return json(503, { ok: false, service: 'supabase' });
  }

  return json(200, { ok: true, service: 'supabase' });
}
