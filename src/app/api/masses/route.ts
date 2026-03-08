import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { withUserProtection, withPublicMonitoring } from '@/lib/enhanced-api-protection';
import { randomUUID } from 'crypto';
import { requireEmailVerification } from '@/lib/email';
import { Mass, MassVisibility, LiturgicalColor } from '@/types/mass';

// GET - List masses
export const GET = withPublicMonitoring<any>(async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
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
        )
      `)
      .order('date', { ascending: true, nullsFirst: false });

    // Apply filters
    if (userId) {
      query = query.eq('userId', parseInt(userId));
      if (!session || session.user.id !== parseInt(userId)) {
        query = query.in('visibility', ['PUBLIC', 'NOT_LISTED']);
      }
    } else if (session?.user?.id) {
      query = query.eq('userId', session.user.id);
    } else if (includePublic) {
      query = query.eq('visibility', 'PUBLIC');
    } else {
      return NextResponse.json([]);
    }

    if (upcoming) {
      query = query.gte('date', new Date().toISOString());
    }

    const { data: masses, error } = await query;

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    // Bulk fetch items count to avoid N+1
    const massIds = (masses || []).map(m => m.id);
    let itemCountMap: { [key: string]: number } = {};
    
    if (massIds.length > 0) {
      const { data: itemCounts } = await supabase
        .from('MassItem')
        .select('massId')
        .in('massId', massIds);
      
      (itemCounts || []).forEach(item => {
        itemCountMap[item.massId] = (itemCountMap[item.massId] || 0) + 1;
      });
    }

    const formattedMasses = (masses || []).map(mass => ({
      ...mass,
      user: mass.User || null,
      items: [],
      _count: {
        items: itemCountMap[mass.id] || 0
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
