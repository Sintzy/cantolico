import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase } from '@/lib/supabase-admin';
import { getClerkSession } from '@/lib/api-middleware';
import {
  canManageMassMembers,
  escapeLikePattern,
  emailsMatch,
  findMembershipByEmail,
  normalizeEmail,
} from '@/lib/mass-collaboration';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - List mass members
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getClerkSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: massId } = await params;

  const { data: mass } = await supabase
    .from('Mass')
    .select('id, userId, name')
    .eq('id', massId)
    .single();

  if (!mass) {
    return NextResponse.json({ error: 'Missa não encontrada' }, { status: 404 });
  }

  const isOwnerOrAdmin = canManageMassMembers(mass.userId, session.user.id, session.user.role);

  // Also allow members to see the list
  const { data: selfMembershipRows, error: selfMembershipError } = await supabase
    .from('MassMember')
    .select('userEmail, status')
    .eq('massId', massId);

  if (selfMembershipError) {
    console.error('[MASS MEMBERS] membership lookup failed', selfMembershipError);
    return NextResponse.json({ error: 'Erro ao verificar permissões' }, { status: 500 });
  }

  const selfMembership = findMembershipByEmail(selfMembershipRows, session.user.email);

  if (!isOwnerOrAdmin && selfMembership?.status !== 'ACCEPTED') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { data: memberRows, error: membersError } = await supabase
    .from('MassMember')
    .select('id, userEmail, role, status, invitedAt, acceptedAt')
    .eq('massId', massId)
    .order('invitedAt', { ascending: true });

  if (membersError) {
    console.error('[MASS MEMBERS] list failed', membersError);
    return NextResponse.json({ error: 'Erro ao obter colaboradores' }, { status: 500 });
  }

  // Fetch user data for all member emails + owner
  const { data: owner, error: ownerError } = await supabase
    .from('User')
    .select('id, name, email, image')
    .eq('id', mass.userId)
    .single();

  if (ownerError) {
    console.error('[MASS MEMBERS] owner lookup failed', ownerError);
    return NextResponse.json({ error: 'Erro ao obter colaboradores' }, { status: 500 });
  }

  const memberEmails = [...new Set((memberRows || [])
    .map((member: any) => normalizeEmail(member.userEmail))
    .filter((email): email is string => email !== null))];
  const userResults = await Promise.all(memberEmails.map(async (email) => {
    const { data, error } = await supabase
      .from('User')
      .select('id, name, email, image')
      .ilike('email', escapeLikePattern(email));
    if (error) {
      console.error('[MASS MEMBERS] collaborator lookup failed', error);
      return null;
    }
    return (data || []).find((user: any) => emailsMatch(user.email, email)) || null;
  }));

  const userMap: Record<string, any> = {};
  for (const user of userResults) {
    const email = normalizeEmail(user?.email);
    if (user && email) userMap[email] = user;
  }

  const ownerEntry = {
    id: `owner-${mass.userId}`,
    massId,
    userEmail: owner?.email || '',
    name: owner?.name || null,
    image: owner?.image || null,
    role: 'OWNER',
    status: 'ACCEPTED',
    invitedAt: null,
    acceptedAt: null,
  };

  const members = [
    ownerEntry,
    ...(memberRows || []).map((m: any) => {
      const u = userMap[normalizeEmail(m.userEmail) || ''];
      return {
        id: m.id,
        massId,
        userEmail: m.userEmail,
        name: u?.name || null,
        image: u?.image || null,
        role: m.role,
        status: m.status,
        invitedAt: m.invitedAt,
        acceptedAt: m.acceptedAt,
      };
    }),
  ];

  return NextResponse.json({ members });
}
