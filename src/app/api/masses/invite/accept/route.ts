import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase } from '@/lib/supabase-admin';
import { getClerkSession } from '@/lib/api-middleware';

export async function POST(request: NextRequest) {
  const session = await getClerkSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { token } = await request.json();

  if (!token || token.length < 37) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
  }

  const memberId = token.substring(0, 36);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(memberId)) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
  }

  const { data: member, error } = await supabase
    .from('MassMember')
    .select('id, massId, userEmail, status, invitedAt')
    .eq('id', memberId)
    .single();

  if (error || !member) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (new Date(member.invitedAt) < sevenDaysAgo) {
    return NextResponse.json({ error: 'Token expirado' }, { status: 400 });
  }

  if (member.status !== 'PENDING') {
    return NextResponse.json(
      { error: `Convite inválido. Status atual: ${member.status}` },
      { status: 400 }
    );
  }

  if (!session.user.email || session.user.email.toLowerCase() !== member.userEmail.toLowerCase()) {
    return NextResponse.json({ error: 'Email não corresponde ao convite' }, { status: 403 });
  }

  const { error: updateError } = await supabase
    .from('MassMember')
    .update({ status: 'ACCEPTED', acceptedAt: new Date().toISOString() })
    .eq('id', member.id);

  if (updateError) {
    console.error('[MASS INVITE ACCEPT]', updateError);
    return NextResponse.json({ error: 'Erro ao aceitar convite' }, { status: 500 });
  }

  return NextResponse.json({ success: true, massId: member.massId });
}
