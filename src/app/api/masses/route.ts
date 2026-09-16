import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase } from '@/lib/supabase-admin';
import { getClerkSession } from '@/lib/api-middleware';
import { withUserProtection, withPublicMonitoring } from '@/lib/enhanced-api-protection';
import { randomUUID } from 'crypto';
import { requireEmailVerification } from '@/lib/email';
import { Mass, MassVisibility, LiturgicalColor } from '@/types/mass';
import { canCreateMass, premiumRequiredResponse } from '@/lib/premium';
import { escapeLikePattern, findMembershipByEmail } from '@/lib/mass-collaboration';

// GET - List masses
export const GET = withPublicMonitoring<any>(async (request: NextRequest) => {
  try {
    const session = await getClerkSession();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const includePublic = searchParams.get('includePublic') === 'true';
    const upcoming = searchParams.get('upcoming') === 'true';

    let query = supabase
      .from('Mass')
      .select(`
        id,
        name,
        description,
        date,
        parish,
        celebrant,
        celebration,
        liturgicalColor,
        visibility,
        userId,
        createdAt,
        updatedAt,
        User!Mass_userId_fkey (
          id,
          name,
          email,
          image
        ),
        MassItem (id)
      `)
      .order('date', { ascending: true, nullsFirst: false });

    // Apply filters. A signed-in user's list includes both owned and accepted
    // collaborative masses; public profile listings intentionally do not.
    let includeCollaboratedMasses = false;
    if (userId) {
      const requestedUserId = parseInt(userId, 10);
      if (!Number.isInteger(requestedUserId)) {
        return NextResponse.json({ error: 'userId inválido' }, { status: 400 });
      }
      query = query.eq('userId', requestedUserId);
      if (!session || session.user.id !== requestedUserId) {
        query = query.in('visibility', ['PUBLIC', 'NOT_LISTED']);
      } else {
        includeCollaboratedMasses = true;
      }
    } else if (session?.user?.id) {
      query = query.eq('userId', session.user.id);
      includeCollaboratedMasses = true;
    } else if (includePublic) {
      query = query.eq('visibility', 'PUBLIC');
    } else {
      return NextResponse.json([]);
    }

    if (upcoming) {
      query = query.gte('date', new Date().toISOString());
    }

    const { data: ownedMasses, error } = await query;

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    let masses = ownedMasses || [];
    if (includeCollaboratedMasses && session?.user?.email) {
      const { data: memberships, error: membershipError } = await supabase
        .from('MassMember')
        .select('massId, userEmail, status')
        .ilike('userEmail', escapeLikePattern(session.user.email));

      if (membershipError) {
        throw new Error(`Supabase error: ${membershipError.message}`);
      }

      const collaboratedIds = (memberships || [])
        .filter(membership => findMembershipByEmail([membership], session.user.email)?.status === 'ACCEPTED')
        .map(membership => membership.massId)
        .filter(massId => !masses.some(mass => mass.id === massId));

      if (collaboratedIds.length > 0) {
        const { data: collaboratedMasses, error: collaboratedError } = await supabase
          .from('Mass')
          .select(`
            id, name, description, date, parish, celebrant, celebration,
            liturgicalColor, visibility, userId, createdAt, updatedAt,
            User!Mass_userId_fkey (id, name, email, image),
            MassItem (id)
          `)
          .in('id', collaboratedIds)
          .order('date', { ascending: true, nullsFirst: false });

        if (collaboratedError) {
          throw new Error(`Supabase error: ${collaboratedError.message}`);
        }
        masses = [...masses, ...(collaboratedMasses || [])];
      }
    }

    const formattedMasses = (masses || []).map(mass => ({
      ...mass,
      user: mass.User || null,
      items: [],
      _count: {
        items: mass.MassItem ? mass.MassItem.length : 0
      }
    }));

    return NextResponse.json(formattedMasses);

  } catch (error) {
    console.error('Error fetching masses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// POST - Create a new mass
export const POST = withUserProtection<any>(async (request: NextRequest, session: any) => {
  try {
    const body = await request.json();
    const {
      name,
      description,
      date,
      parish,
      celebrant,
      celebration,
      liturgicalColor,
      visibility = 'PRIVATE'
    }: {
      name: string;
      description?: string;
      date?: string;
      parish?: string;
      celebrant?: string;
      celebration?: string;
      liturgicalColor?: LiturgicalColor;
      visibility?: MassVisibility;
    } = body;

    // Verify email
    const emailVerificationResult = await requireEmailVerification(session.user.id);
    if (!emailVerificationResult.success) {
      return NextResponse.json(
        { error: emailVerificationResult.error },
        { status: 403 }
      );
    }

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Nome da missa é obrigatório' },
        { status: 400 }
      );
    }

    const createGate = await canCreateMass(session.user.id);
    if (!createGate.allowed) {
      return premiumRequiredResponse(
        'unlimited_masses',
        `O plano gratuito permite criar até ${createGate.limit} missas/repertórios.`
      );
    }

    const massId = randomUUID();
    const { data: mass, error } = await supabase
      .from('Mass')
      .insert({
        id: massId,
        name: name.trim(),
        description: description?.trim() || null,
        date: date || null,
        parish: parish?.trim() || null,
        celebrant: celebrant?.trim() || null,
        celebration: celebration?.trim() || null,
        liturgicalColor: liturgicalColor || null,
        visibility,
        userId: session.user.id
      })
      .select(`
        id,
        name,
        description,
        date,
        parish,
        celebrant,
        celebration,
        liturgicalColor,
        visibility,
        userId,
        createdAt,
        updatedAt,
        User!Mass_userId_fkey (
          id,
          name,
          email,
          image
        )
      `)
      .single();

    if (error) {
      console.error('Error creating mass:', error);
      throw new Error(`Supabase error: ${error.message}`);
    }

    return NextResponse.json({
      ...mass,
      user: mass.User || null,
      items: [],
      _count: { items: 0 }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating mass:', error);
    return NextResponse.json(
      { error: 'Failed to create mass' },
      { status: 500 }
    );
  }
});
