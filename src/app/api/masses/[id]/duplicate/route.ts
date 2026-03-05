import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { withUserProtection } from '@/lib/enhanced-api-protection';
import { randomUUID } from 'crypto';
import { requireEmailVerification } from '@/lib/email';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Duplicate a mass
export const POST = withUserProtection<any>(async (request: NextRequest, session: any, context: RouteParams) => {
  try {
    const { id: massId } = await context.params;
    const body = await request.json();
    const { name, date } = body;

    // Verify email
    const emailVerificationResult = await requireEmailVerification(session.user.id);
    if (!emailVerificationResult.success) {
      return NextResponse.json(
        { error: emailVerificationResult.error },
        { status: 403 }
      );
    }

    // Fetch original mass
    const { data: originalMass, error: fetchError } = await supabase
      .from('Mass')
      .select(`
        id,
        name,
        description,
        parish,
        celebrant,
        celebration,
        liturgicalColor,
        visibility,
        userId,
        MassItem (
          songId,
          moment,
          order,
          note,
          transpose
        )
      `)
      .eq('id', massId)
      .single();

    if (fetchError || !originalMass) {
      return NextResponse.json(
        { error: 'Missa original não encontrada' },
        { status: 404 }
      );
    }

    // Check access - can duplicate public/unlisted or own masses
    const isOwner = session.user.id === originalMass.userId;
    const isAdmin = session.user.role === 'ADMIN';
    const canDuplicate = isOwner || isAdmin || originalMass.visibility !== 'PRIVATE';

    if (!canDuplicate) {
      return NextResponse.json(
        { error: 'Não tens permissão para duplicar esta missa' },
        { status: 403 }
      );
    }

    // Create new mass
    const newMassId = randomUUID();
    const { data: newMass, error: createError } = await supabase
      .from('Mass')
      .insert({
        id: newMassId,
        name: name || `${originalMass.name} (cópia)`,
        description: originalMass.description,
        date: date || null,
        parish: originalMass.parish,
        celebrant: originalMass.celebrant,
        celebration: originalMass.celebration,
        liturgicalColor: originalMass.liturgicalColor,
        visibility: 'PRIVATE', // Always private when duplicating
        userId: session.user.id
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating duplicated mass:', createError);
      throw new Error(`Supabase error: ${createError.message}`);
    }

    // Copy items
    if (originalMass.MassItem && originalMass.MassItem.length > 0) {
      const newItems = originalMass.MassItem.map((item: any) => ({
        id: randomUUID(),
        massId: newMassId,
        songId: item.songId,
        moment: item.moment,
        order: item.order,
        note: item.note,
        transpose: item.transpose || 0,
        addedById: session.user.id
      }));

      const { error: itemsError } = await supabase
        .from('MassItem')
        .insert(newItems);

      if (itemsError) {
        console.error('Error copying mass items:', itemsError);
        // Don't fail the whole operation, just log
      }
    }

    return NextResponse.json({
      ...newMass,
      items: [],
      message: 'Missa duplicada com sucesso'
    }, { status: 201 });

  } catch (error) {
    console.error('Error duplicating mass:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate mass' },
      { status: 500 }
    );
  }
});
