import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase } from '@/lib/supabase-admin';
import { getClerkSession } from '@/lib/api-middleware';
import { sendEmail, createMassInviteEmailTemplate } from '@/lib/email';
import { logUserAction } from '@/lib/logging-helpers';
import { withLogging } from '@/lib/api-route-wrapper';
import {
  canManageMassMembers,
  escapeLikePattern,
  findMembershipByEmail,
  findUsersByEmail,
  getInviteAction,
  normalizeEmail,
} from '@/lib/mass-collaboration';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Invite user to mass by email
async function POSTHandler(request: NextRequest, { params }: RouteParams) {
  const session = await getClerkSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: massId } = await params;
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 });
  }

  const email = normalizeEmail(body.email);

  if (!email) {
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

  if (!canManageMassMembers(mass.userId, session.user.id, session.user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  // `ilike` allows accounts created with mixed-case addresses. The pattern is
  // escaped and verified after querying so a valid email containing _ or %
  // cannot match a different account.
  const { data: users, error: userLookupError } = await supabase
    .from('User')
    .select('id, name, email')
    .ilike('email', escapeLikePattern(email));

  if (userLookupError) {
    console.error('[MASS INVITE USER LOOKUP]', userLookupError);
    return NextResponse.json({ error: 'Erro ao procurar utilizador' }, { status: 500 });
  }

  const matchedUsers = findUsersByEmail(users, email);
  if (matchedUsers.length > 1) {
    console.error('[MASS INVITE] Multiple accounts share the same canonical email', { email });
    return NextResponse.json({ error: 'Não foi possível identificar unicamente este utilizador' }, { status: 409 });
  }
  const invitedUser = matchedUsers[0];

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
  const { data: memberRows, error: memberLookupError } = await supabase
    .from('MassMember')
    .select('id, userEmail, status')
    .eq('massId', massId);

  if (memberLookupError) {
    console.error('[MASS INVITE MEMBER LOOKUP]', memberLookupError);
    return NextResponse.json({ error: 'Erro ao verificar colaboradores' }, { status: 500 });
  }

  const canonicalInvitedEmail = normalizeEmail(invitedUser.email)!;
  const existing = findMembershipByEmail(memberRows, canonicalInvitedEmail);

  const inviteAction = getInviteAction(existing);
  if (inviteAction === 'ALREADY_PENDING') {
    return NextResponse.json({ error: 'Convite já enviado para este utilizador' }, { status: 409 });
  }
  if (inviteAction === 'ALREADY_ACCEPTED') {
    return NextResponse.json({ error: 'Utilizador já é membro desta missa' }, { status: 409 });
  }
  if (inviteAction === 'REINVITE' && existing) {
    // A declined invitation may be renewed.
    const { error: deleteInviteError } = await supabase
      .from('MassMember')
      .delete()
      .eq('id', existing.id);
    if (deleteInviteError) {
      console.error('[MASS INVITE] failed to replace declined invitation', deleteInviteError);
      return NextResponse.json({ error: 'Erro ao renovar o convite' }, { status: 500 });
    }
  }

  const { data: invite, error: insertError } = await supabase
    .from('MassMember')
    .insert({
      massId,
      userEmail: canonicalInvitedEmail,
      role: 'EDITOR',
      status: 'PENDING',
      invitedBy: session.user.id,
      invitedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    console.error('[MASS INVITE]', insertError);
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'Já existe um convite ou colaboração para este utilizador' },
        { status: 409 },
      );
    }
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
      invitedUser.name || canonicalInvitedEmail,
      mass.name,
      massDateFormatted,
      inviter?.name || session.user.email || 'Um utilizador',
      inviteToken,
      massId
    );

    await sendEmail({
      to: canonicalInvitedEmail,
      subject: `⛪ Convite para colaborar na missa "${mass.name}"`,
      html: emailTemplate,
    });
  } catch (emailErr) {
    console.error('[MASS INVITE EMAIL]', emailErr);
    // Non-fatal: record was created, email failure is logged
  }

  await logUserAction('mass.invited', { mass_id: massId, invited_email: canonicalInvitedEmail });
  return NextResponse.json({ success: true, member: invite });
}

export const POST = withLogging(POSTHandler as any, { tags: ['masses'] });
