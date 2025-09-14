import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    const { id } = await context.params;
    const { data: playlist, error } = await supabase
      .from('Playlist')
      .select(`
        id,
        name,
        description,
        isPublic,
        createdAt,
        updatedAt,
        createdBy,
        creator:User!Playlist_createdBy_fkey(
          id,
          name,
          email,
          image
        )
      `)
      .eq('id', id)
      .single();
    if (error || !playlist) {
      return NextResponse.json({ error: 'Playlist não encontrada' }, { status: 404 });
    }
    // Buscar contagem de músicas
    const { count: songCount } = await supabase
      .from('PlaylistSong')
      .select('id', { count: 'exact', head: true })
      .eq('playlistId', id);
    return NextResponse.json({ ...playlist, songCount: songCount || 0 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}


export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.isPublic !== undefined) updateData.isPublic = !!body.isPublic;
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum dado para atualizar' }, { status: 400 });
    }
    const { data: updated, error } = await supabase
      .from('Playlist')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error || !updated) {
      return NextResponse.json({ error: 'Erro ao atualizar playlist' }, { status: 500 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
