import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

const startTime = Date.now();
const DATABASE_CHECK_TIMEOUT_MS = 1500;

export async function GET(request: NextRequest) {
  const checks: Record<string, 'ok' | 'error'> = {};
  const strict = request.nextUrl.searchParams.get('strict') === '1';

  try {
    const supabase = createAdminSupabaseClient();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DATABASE_CHECK_TIMEOUT_MS);

    try {
      const { error } = await supabase
        .from('User')
        .select('id', { head: true, count: 'exact' })
        .limit(1)
        .abortSignal(controller.signal);

      checks.database = error ? 'error' : 'ok';
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    checks.database = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  const status = allOk ? 'ok' : 'degraded';
  const httpStatus = strict && !allOk ? 503 : 200;

  return NextResponse.json(
    {
      status,
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
      checks,
      strict,
      timestamp: new Date().toISOString(),
    },
    { status: httpStatus }
  );
}
