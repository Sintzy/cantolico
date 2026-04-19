import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase } from '@/lib/supabase-admin';
import { withUserProtection } from '@/lib/enhanced-api-protection';
import { LiturgicalMoment } from '@/types/mass';

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
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

  const { data: membership } = await supabase
    .from('MassMember')
    .select('role, status')
    .eq('massId', massId)
    .eq('userEmail', userEmail)
    .single();

  return membership?.status === 'ACCEPTED' && membership?.role === 'EDITOR';
}

// PUT - Update a mass item
export const PUT = withUserProtection<any>(async (request: NextRequest, session: any, context: RouteParams) => {
  try {
    const { id: massId, itemId } = await context.params;
    const body = await request.json();

    // Check permissions
    const canEdit = await canEditMass(massId, session.user.id, session.user.email, session.user.role);
    if (!canEdit) {
      return NextResponse.json(
        { error: 'Não tens permissão para editar esta missa' },
        { status: 403 }
      );
    }

    const {
      moment,
      order,
      note,
      transpose
    }: {
      moment?: LiturgicalMoment;
      order?: number;
      note?: string;
      transpose?: number;
    } = body;

    const updateData: any = {};
    if (moment !== undefined) updateData.moment = moment;
    if (order !== undefined) updateData.order = order;
    if (note !== undefined) updateData.note = note?.trim() || null;
    if (transpose !== undefined) updateData.transpose = transpose;

    const { data: updatedItem, error } = await supabase
      .from('MassItem')
      .update(updateData)
      .eq('id', itemId)
      .eq('massId', massId)
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

    if (error) {
      console.error('Error updating mass item:', error);
      throw new Error(`Supabase error: ${error.message}`);
    }

    return NextResponse.json({
      ...updatedItem,
      song: updatedItem.Song || null
    });

  } catch (error) {
    console.error('Error updating mass item:', error);
    return NextResponse.json(
      { error: 'Failed to update mass item' },
      { status: 500 }
    );
  }
});

// DELETE - Remove a song from the mass
export const DELETE = withUserProtection<any>(async (request: NextRequest, session: any, context: RouteParams) => {
  try {
    const { id: massId, itemId } = await context.params;

    // Check permissions
    const canEdit = await canEditMass(massId, session.user.id, session.user.email, session.user.role);
    if (!canEdit) {
      return NextResponse.json(
        { error: 'Não tens permissão para editar esta missa' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('MassItem')
      .delete()
      .eq('id', itemId)
      .eq('massId', massId);

    if (error) {
      console.error('Error deleting mass item:', error);
      throw new Error(`Supabase error: ${error.message}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting mass item:', error);
    return NextResponse.json(
      { error: 'Failed to delete mass item' },
      { status: 500 }
    );
  }
});
