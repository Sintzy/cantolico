import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase } from '@/lib/supabase-admin';
import { getClerkSession } from '@/lib/api-middleware';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function canManageMass(massId: string, userId: number, userRole: string): Promise<{ allowed: boolean; mass: any }> {
  const { data: mass } = await supabase
    .from('Mass')
    .select('id, userId, name')
    .eq('id', massId)
    .single();

  if (!mass) return { allowed: false, mass: null };

  const isOwner = userId === mass.userId;
  const isAdmin = userRole === 'ADMIN';

  const { data: membership } = await supabase
    .from('MassMember')
    .select('role, status')
    .eq('massId', massId)
    .eq('invitedBy', userId)
    .single();

  return { allowed: isOwner || isAdmin, mass };
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

  const isOwnerOrAdmin = session.user.id === mass.userId || session.user.role === 'ADMIN';

  // Also allow members to see the list
  const { data: selfMembership } = await supabase
    .from('MassMember')
    .select('status')
    .eq('massId', massId)
    .eq('userEmail', session.user.email || '')
    .single();

  if (!isOwnerOrAdmin && selfMembership?.status !== 'ACCEPTED') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { data: memberRows } = await supabase
    .from('MassMember')
    .select('id, userEmail, role, status, invitedAt, acceptedAt')
    .eq('massId', massId)
    .order('invitedAt', { ascending: true });

  // Fetch user data for all member emails + owner
  const emails = (memberRows || []).map((m: any) => m.userEmail).filter(Boolean);
  const { data: users } = await supabase
    .from('User')
    .select('id, name, email, image')
    .or(`id.eq.${mass.userId}${emails.length ? `,email.in.(${emails.join(',')})` : ''}`);

  const userMap: Record<string, any> = {};
  for (const u of users || []) {
    userMap[u.email] = u;
    if (u.id === mass.userId) userMap['__owner__'] = u;
  }

  const owner = userMap['__owner__'];
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
      const u = userMap[m.userEmail];
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
