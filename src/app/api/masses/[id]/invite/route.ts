import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase } from '@/lib/supabase-admin';
import { getClerkSession } from '@/lib/api-middleware';
import { sendEmail, createMassInviteEmailTemplate } from '@/lib/email';

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
    .select('userId, name, date')
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
    // DECLINED — allow re-invite
    await supabase.from('MassMember').delete().eq('id', existing.id);
  }

  const { data: invite, error: insertError } = await supabase
    .from('MassMember')
    .insert({
      massId,
      userEmail: email.toLowerCase(),
      role: 'EDITOR',
      status: 'PENDING',
      invitedBy: session.user.id,
      invitedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    console.error('[MASS INVITE]', insertError);
    return NextResponse.json({ error: 'Erro ao criar convite' }, { status: 500 });
  }

  // Send invite email
  try {
    const { data: inviter } = await supabase
      .from('User')
      .select('name')
      .eq('id', session.user.id)
      .single();

    const massDateFormatted = mass.date
      ? new Date(mass.date).toLocaleDateString('pt-PT', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        })
      : null;

    const inviteToken = `${invite.id}-${crypto.randomBytes(16).toString('hex')}`;
    const emailTemplate = createMassInviteEmailTemplate(
      invitedUser.name || email,
      mass.name,
      massDateFormatted,
      inviter?.name || session.user.email || 'Um utilizador',
      inviteToken,
      massId
    );

    await sendEmail({
      to: email,
      subject: `⛪ Convite para colaborar na missa "${mass.name}"`,
      html: emailTemplate,
    });
  } catch (emailErr) {
    console.error('[MASS INVITE EMAIL]', emailErr);
    // Non-fatal: record was created, email failure is logged
  }

  return NextResponse.json({ success: true, member: invite });
}
