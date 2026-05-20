import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

const startTime = Date.now();

export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {};

  try {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from('User').select('id').limit(1).single();
    checks.database = error && error.code !== 'PGRST116' ? 'error' : 'ok';
  } catch {
    checks.database = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  const status = allOk ? 'ok' : 'degraded';
  const httpStatus = allOk ? 200 : 503;

  return NextResponse.json(
    {
      status,
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: httpStatus }
  );
}
