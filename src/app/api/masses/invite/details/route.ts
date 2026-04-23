import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token || token.length < 37) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
  }

  const memberId = token.substring(0, 36);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(memberId)) {
    return NextResponse.json({ error: 'Token com formato inválido' }, { status: 400 });
  }

  const { data: member, error } = await supabase
    .from('MassMember')
    .select('id, massId, userEmail, status, invitedAt, invitedBy')
    .eq('id', memberId)
    .single();

  if (error || !member) {
    return NextResponse.json({ error: 'Convite não encontrado' }, { status: 404 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (new Date(member.invitedAt) < sevenDaysAgo) {
    return NextResponse.json({ error: 'Convite expirado' }, { status: 400 });
  }

  const [{ data: mass }, { data: inviter }] = await Promise.all([
    supabase
      .from('Mass')
      .select('id, name, date, parish, celebration')
      .eq('id', member.massId)
      .single(),
    supabase
      .from('User')
      .select('id, name, image, email')
      .eq('id', member.invitedBy)
      .single(),
  ]);

  return NextResponse.json({
    member,
    mass,
    invitedBy: inviter,
    invitedAt: member.invitedAt,
    status: member.status,
  });
}
