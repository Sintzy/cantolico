import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { withUserProtection, withPublicMonitoring } from '@/lib/enhanced-api-protection';
import { randomUUID } from 'crypto';
import { requireEmailVerification } from '@/lib/email';
import { Mass, MassVisibility, LiturgicalColor } from '@/types/mass';

import { getClerkSession } from '@/lib/api-middleware';
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
        MassItem (
          id,
          moment,
          order,
          Song!MassItem_songId_fkey (
            id,
            title,
            slug
          )
        )
      `)
      .order('date', { ascending: true, nullsFirst: false });

    // Apply filters based on access
    if (userId) {
      query = query.eq('userId', parseInt(userId));
      
      // If not the owner, only show public/unlisted
      if (!session || session.user.id !== parseInt(userId)) {
        query = query.in('visibility', ['PUBLIC', 'NOT_LISTED']);
      }
    } else if (session?.user?.id) {
      // Get own masses
      query = query.eq('userId', session.user.id);
    } else if (includePublic) {
      // Only public for non-logged users
      query = query.eq('visibility', 'PUBLIC');
    } else {
      return NextResponse.json([]);
    }

    // Filter for upcoming masses
    if (upcoming) {
      query = query.gte('date', new Date().toISOString());
    }

    const { data: masses, error } = await query;

    if (error) {
      console.error('Error fetching masses:', error);
      throw new Error(`Supabase error: ${error.message}`);
    }

    // Format response
    const formattedMasses = (masses || []).map(mass => ({
      ...mass,
      user: mass.User || null,
      items: (mass.MassItem || [])
        .sort((a: any, b: any) => a.order - b.order)
        .map((item: any) => ({
          ...item,
          song: item.Song || null
        })),
      _count: {
        items: (mass.MassItem || []).length
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
