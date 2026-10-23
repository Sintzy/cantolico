import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { adminSupabase } from '@/lib/supabase-admin';
import { getHideableMassMoments, normalizeHiddenMoments } from '@/types/mass';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) return authError;

    const { id } = await context.params;
    const { error } = await adminSupabase.from('Mass').delete().eq('id', id);
    if (error) {
      console.error('Error deleting admin mass:', error);
      return NextResponse.json({ error: 'Erro ao apagar missa' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in admin mass deletion:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) return authError;

    const { id } = await context.params;
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) return NextResponse.json({ error: 'O nome da missa é obrigatório' }, { status: 400 });
      updateData.name = name;
    }
    for (const field of ['description', 'parish', 'celebrant', 'celebration'] as const) {
      if (body[field] !== undefined) {
        updateData[field] = typeof body[field] === 'string' ? body[field].trim() || null : null;
      }
    }
    if (body.date !== undefined) updateData.date = body.date || null;
    if (body.liturgicalColor !== undefined) updateData.liturgicalColor = body.liturgicalColor || null;
    if (['PUBLIC', 'PRIVATE', 'NOT_LISTED'].includes(body.visibility)) updateData.visibility = body.visibility;

    if (body.hiddenMoments !== undefined) {
      const { data: mass, error } = await adminSupabase
        .from('Mass')
        .select('MassItem(moment)')
        .eq('id', id)
        .single();
      if (error || !mass) return NextResponse.json({ error: 'Missa não encontrada' }, { status: 404 });

      const hiddenMoments = normalizeHiddenMoments(body.hiddenMoments);
      const hideableMoments = new Set(getHideableMassMoments(mass.MassItem || []));
      if (hiddenMoments.some((moment) => !hideableMoments.has(moment))) {
        return NextResponse.json({ error: 'Não é possível ocultar momentos que já têm cânticos' }, { status: 400 });
      }
      updateData.hiddenMoments = hiddenMoments;
    }

    if (!Object.keys(updateData).length) {
      return NextResponse.json({ error: 'Nenhum dado para atualizar' }, { status: 400 });
    }

    const { data, error } = await adminSupabase
      .from('Mass')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error || !data) {
      console.error('Error updating admin mass:', error);
      return NextResponse.json({ error: 'Erro ao atualizar missa' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in admin mass update:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
