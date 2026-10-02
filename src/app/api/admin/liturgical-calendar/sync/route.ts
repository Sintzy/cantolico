import { NextRequest, NextResponse } from 'next/server';
import { getClerkSession } from '@/lib/api-middleware';
import { syncLiturgicalCalendar } from '@/lib/liturgical-calendar-store';

async function authorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') === `Bearer ${cronSecret}`) return true;
  const session = await getClerkSession();
  return session?.user?.role === 'ADMIN';
}

async function sync(request: NextRequest) {
  if (!await authorized(request)) return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 });

  try {
    const result = await syncLiturgicalCalendar();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Erro ao sincronizar calendário litúrgico:', error);
    return NextResponse.json({ error: 'Não foi possível sincronizar o calendário litúrgico.' }, { status: 500 });
  }
}

export const GET = sync;
export const POST = sync;
