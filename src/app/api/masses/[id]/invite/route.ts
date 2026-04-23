import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase } from '@/lib/supabase-admin';
import { getClerkSession } from '@/lib/api-middleware';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Invite user to mass by email
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getClerkSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: massId } = await params;
  const { email } = await request.json();

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  const { data: mass } = await supabase
    .from('Mass')
    .select('userId, name')
    .eq('id', massId)
    .single();

  if (!mass) {
    return NextResponse.json({ error: 'Missa não encontrada' }, { status: 404 });
  }

  const isOwnerOrAdmin = session.user.id === mass.userId || session.user.role === 'ADMIN';
  if (!isOwnerOrAdmin) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  // Check target user exists in the system
  const { data: invitedUser } = await supabase
    .from('User')
    .select('id, name, email')
    .eq('email', email.toLowerCase())
    .single();

  if (!invitedUser) {
    return NextResponse.json(
      { error: 'Utilizador não encontrado. O utilizador precisa de ter conta no Cantólico.' },
      { status: 404 }
    );
  }

  // Can't invite the owner
  if (invitedUser.id === mass.userId) {
    return NextResponse.json({ error: 'Não podes convidar o dono da missa' }, { status: 400 });
  }

  // Check if already invited/member
  const { data: existing } = await supabase
    .from('MassMember')
    .select('id, status')
    .eq('massId', massId)
    .eq('userEmail', email.toLowerCase())
    .single();

  if (existing) {
    if (existing.status === 'PENDING') {
      return NextResponse.json({ error: 'Convite já enviado para este utilizador' }, { status: 409 });
    }
    if (existing.status === 'ACCEPTED') {
      return NextResponse.json({ error: 'Utilizador já é membro desta missa' }, { status: 409 });
    }
    // DECLINED — allow re-invite by deleting old record and creating new
    await supabase.from('MassMember').delete().eq('id', existing.id);
  }

  const { data: invite, error: insertError } = await supabase
    .from('MassMember')
    .insert({
      massId,
      userEmail: email.toLowerCase(),
      role: 'EDITOR',
      status: 'ACCEPTED', // direct access — no email flow needed
      invitedBy: session.user.id,
      invitedAt: new Date().toISOString(),
      acceptedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    console.error('[MASS INVITE]', insertError);
    return NextResponse.json({ error: 'Erro ao criar convite' }, { status: 500 });
  }

  return NextResponse.json({ success: true, member: invite });
}
