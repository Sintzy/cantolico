import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { withUserProtection, withPublicMonitoring } from '@/lib/enhanced-api-protection';
import { MassVisibility, LiturgicalColor } from '@/types/mass';

import { getClerkSession } from '@/lib/api-middleware';
interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get a single mass by ID
export const GET = withPublicMonitoring<any>(async (request: NextRequest, context: RouteParams) => {
  try {
    const { id } = await context.params;
    const session = await getClerkSession();

    const { data: mass, error } = await supabase
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
        ),
        MassMember (
          id,
          userEmail,
          role,
          status,
          invitedBy,
          invitedAt,
          acceptedAt
        )
      `)
      .eq('id', id)
      .single();

    if (error || !mass) {
      return NextResponse.json(
        { error: 'Missa não encontrada' },
        { status: 404 }
      );
    }

    // Check access permissions
    const isOwner = session?.user?.id === mass.userId;
    const isAdmin = session?.user?.role === 'ADMIN';
    const isMember = mass.MassMember?.some(
      (m: any) => m.userEmail === session?.user?.email && m.status === 'ACCEPTED'
    );

    if (mass.visibility === 'PRIVATE' && !isOwner && !isAdmin && !isMember) {
      return NextResponse.json(
        { error: 'Não tens permissão para ver esta missa' },
        { status: 403 }
      );
    }

    // Format response
    const formattedMass = {
      ...mass,
      user: mass.User || null,
      items: (mass.MassItem || [])
        .sort((a: any, b: any) => {
          // Sort by moment order first, then by item order
          const momentOrder: Record<string, number> = {
            ENTRADA: 1, ATO_PENITENCIAL: 2, GLORIA: 3, SALMO_RESPONSORIAL: 4,
            ACLAMACAO_EVANGELHO: 5, OFERENDAS: 6, SANTO: 7, PAI_NOSSO: 8,
            SAUDACAO_PAZ: 9, CORDEIRO_DEUS: 10, COMUNHAO: 11, ACAO_GRACAS: 12,
            FINAL: 13, OUTRO: 99
          };
          const orderA = momentOrder[a.moment] || 99;
          const orderB = momentOrder[b.moment] || 99;
          if (orderA !== orderB) return orderA - orderB;
          return a.order - b.order;
        })
        .map((item: any) => ({
          ...item,
          song: item.Song || null
        })),
      members: mass.MassMember || [],
      _count: {
        items: (mass.MassItem || []).length,
        members: (mass.MassMember || []).length
      },
      canEdit: isOwner || isAdmin || isMember,
      isOwner
    };

    return NextResponse.json(formattedMass);

  } catch (error) {
    console.error('Error fetching mass:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// PUT - Update a mass
export const PUT = withUserProtection<any>(async (request: NextRequest, session: any, context: RouteParams) => {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // Check ownership
    const { data: existingMass, error: fetchError } = await supabase
      .from('Mass')
      .select('userId')
      .eq('id', id)
      .single();

    if (fetchError || !existingMass) {
      return NextResponse.json(
        { error: 'Missa não encontrada' },
        { status: 404 }
      );
    }

    const isOwner = session.user.id === existingMass.userId;
    const isAdmin = session.user.role === 'ADMIN';

    // Check if user is a member with edit permissions
    const { data: membership } = await supabase
      .from('MassMember')
      .select('role, status')
      .eq('massId', id)
      .eq('userEmail', session.user.email)
      .single();

    const canEdit = isOwner || isAdmin || (membership?.status === 'ACCEPTED' && membership?.role === 'EDITOR');

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Não tens permissão para editar esta missa' },
        { status: 403 }
      );
    }

    const {
      name,
      description,
      date,
      parish,
      celebrant,
      celebration,
      liturgicalColor,
      visibility
    }: {
      name?: string;
      description?: string;
      date?: string;
      parish?: string;
      celebrant?: string;
      celebration?: string;
      liturgicalColor?: LiturgicalColor | null;
      visibility?: MassVisibility;
    } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (date !== undefined) updateData.date = date || null;
    if (parish !== undefined) updateData.parish = parish?.trim() || null;
    if (celebrant !== undefined) updateData.celebrant = celebrant?.trim() || null;
    if (celebration !== undefined) updateData.celebration = celebration?.trim() || null;
    if (liturgicalColor !== undefined) updateData.liturgicalColor = liturgicalColor || null;
    if (visibility !== undefined && isOwner) updateData.visibility = visibility; // Only owner can change visibility

    const { data: updatedMass, error: updateError } = await supabase
      .from('Mass')
      .update(updateData)
      .eq('id', id)
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

    if (updateError) {
      console.error('Error updating mass:', updateError);
      throw new Error(`Supabase error: ${updateError.message}`);
    }

    return NextResponse.json({
      ...updatedMass,
      user: updatedMass.User || null
    });

  } catch (error) {
    console.error('Error updating mass:', error);
    return NextResponse.json(
      { error: 'Failed to update mass' },
      { status: 500 }
    );
  }
});

// DELETE - Delete a mass
export const DELETE = withUserProtection<any>(async (request: NextRequest, session: any, context: RouteParams) => {
  try {
    const { id } = await context.params;

    // Check ownership
    const { data: existingMass, error: fetchError } = await supabase
      .from('Mass')
      .select('userId')
      .eq('id', id)
      .single();

    if (fetchError || !existingMass) {
      return NextResponse.json(
        { error: 'Missa não encontrada' },
        { status: 404 }
      );
    }

    const isOwner = session.user.id === existingMass.userId;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Não tens permissão para apagar esta missa' },
        { status: 403 }
      );
    }

    // Delete mass (cascade will delete items and members)
    const { error: deleteError } = await supabase
      .from('Mass')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting mass:', deleteError);
      throw new Error(`Supabase error: ${deleteError.message}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting mass:', error);
    return NextResponse.json(
      { error: 'Failed to delete mass' },
      { status: 500 }
    );
  }
});
