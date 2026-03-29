import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { withUserProtection } from '@/lib/enhanced-api-protection';
import { randomUUID } from 'crypto';
import { LiturgicalMoment } from '@/types/mass';

import { getClerkSession } from '@/lib/api-middleware';
interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper to check if user can edit mass
async function canEditMass(massId: string, userId: number, userEmail: string, userRole: string): Promise<boolean> {
  const { data: mass } = await supabase
    .from('Mass')
    .select('userId')
    .eq('id', massId)
    .single();

  if (!mass) return false;

  const isOwner = userId === mass.userId;
  const isAdmin = userRole === 'ADMIN';

  if (isOwner || isAdmin) return true;

  // Check membership
  const { data: membership } = await supabase
    .from('MassMember')
    .select('role, status')
    .eq('massId', massId)
    .eq('userEmail', userEmail)
    .single();

  return membership?.status === 'ACCEPTED' && membership?.role === 'EDITOR';
}

// POST - Add a song to the mass
export const POST = withUserProtection<any>(async (request: NextRequest, session: any, context: RouteParams) => {
  try {
    const { id: massId } = await context.params;
    const body = await request.json();

    const {
      songId,
      moment,
      note,
      transpose = 0
    }: {
      songId: string;
      moment: LiturgicalMoment;
      note?: string;
      transpose?: number;
    } = body;

    if (!songId || !moment) {
      return NextResponse.json(
        { error: 'songId e moment são obrigatórios' },
        { status: 400 }
      );
    }

    // Check permissions
    const canEdit = await canEditMass(massId, session.user.id, session.user.email, session.user.role);
    if (!canEdit) {
      return NextResponse.json(
        { error: 'Não tens permissão para editar esta missa' },
        { status: 403 }
      );
    }

    // Verify song exists
    const { data: song, error: songError } = await supabase
      .from('Song')
      .select('id, title')
      .eq('id', songId)
      .single();

    if (songError || !song) {
      return NextResponse.json(
        { error: 'Música não encontrada' },
        { status: 404 }
      );
    }

    // Get the next order value for this moment
    const { data: existingItems } = await supabase
      .from('MassItem')
      .select('order')
      .eq('massId', massId)
      .eq('moment', moment)
      .order('order', { ascending: false })
      .limit(1);

    const nextOrder = (existingItems?.[0]?.order ?? -1) + 1;

    // Insert the item
    const itemId = randomUUID();
    const { data: newItem, error: insertError } = await supabase
      .from('MassItem')
      .insert({
        id: itemId,
        massId,
        songId,
        moment,
        order: nextOrder,
        note: note?.trim() || null,
        transpose,
        addedById: session.user.id
      })
      .select(`
        id,
        songId,
        moment,
        order,
        note,
        transpose,
        addedById,
        createdAt,
        Song!MassItem_songId_fkey (
          id,
          title,
          slug,
          tags,
          author,
          capo
        )
      `)
      .single();

    if (insertError) {
      // Check if it's a duplicate
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Esta música já está neste momento da missa' },
          { status: 409 }
        );
      }
      console.error('Error adding song to mass:', insertError);
      throw new Error(`Supabase error: ${insertError.message}`);
    }

    return NextResponse.json({
      ...newItem,
      song: newItem.Song || null
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding song to mass:', error);
    return NextResponse.json(
      { error: 'Failed to add song to mass' },
      { status: 500 }
    );
  }
});

// GET - Get all items in a mass
export const GET = async (request: NextRequest, context: RouteParams) => {
  try {
    const { id: massId } = await context.params;
    const session = await getClerkSession();

    // Check mass visibility
    const { data: mass } = await supabase
      .from('Mass')
      .select('visibility, userId')
      .eq('id', massId)
      .single();

    if (!mass) {
      return NextResponse.json(
        { error: 'Missa não encontrada' },
        { status: 404 }
      );
    }

    // Check access
    const isOwner = session?.user?.id === mass.userId;
    const isAdmin = session?.user?.role === 'ADMIN';

    if (mass.visibility === 'PRIVATE' && !isOwner && !isAdmin) {
      const { data: membership } = await supabase
        .from('MassMember')
        .select('status')
        .eq('massId', massId)
        .eq('userEmail', session?.user?.email || '')
        .single();

      if (membership?.status !== 'ACCEPTED') {
        return NextResponse.json(
          { error: 'Não tens permissão para ver esta missa' },
          { status: 403 }
        );
      }
    }

    // Get items
    const { data: items, error } = await supabase
      .from('MassItem')
      .select(`
        id,
        songId,
        moment,
        order,
        note,
        transpose,
        addedById,
        createdAt,
        Song!MassItem_songId_fkey (
          id,
          title,
          slug,
          tags,
          author,
          capo
        )
      `)
      .eq('massId', massId)
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching mass items:', error);
      throw new Error(`Supabase error: ${error.message}`);
    }

    const formattedItems = (items || []).map(item => ({
      ...item,
      song: item.Song || null
    }));

    return NextResponse.json(formattedItems);

  } catch (error) {
    console.error('Error fetching mass items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
