import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { randomUUID } from "crypto";

// ADMIN: Adicionar música à playlist
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    const { id: playlistId } = await context.params;
    const body = await request.json();
    const { songId } = body;
    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }
    // Verificar se a música existe
    const { data: song, error: songError } = await supabase
      .from('Song')
      .select('id')
      .or(`id.eq.${songId},slug.eq.${songId}`)
      .single();
    if (songError || !song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }
    const actualSongId = song.id;
    // Verificar se a música já está na playlist
    const { data: existingItem } = await supabase
      .from('PlaylistItem')
      .select('id')
      .eq('playlistId', playlistId)
      .eq('songId', actualSongId)
      .single();
    if (existingItem) {
      return NextResponse.json({ error: 'Song already in playlist' }, { status: 400 });
    }
    // Obter próxima ordem
    const { data: lastItem } = await supabase
      .from('PlaylistItem')
      .select('order')
      .eq('playlistId', playlistId)
      .order('order', { ascending: false })
      .limit(1)
      .single();
    const nextOrder = (lastItem?.order || 0) + 1;
    // Adicionar item à playlist
    const playlistItemId = randomUUID();
    const { data: playlistItem, error: createError } = await supabase
      .from('PlaylistItem')
      .insert({
        id: playlistItemId,
        playlistId,
        songId: actualSongId,
        order: nextOrder,
        addedById: session.user.id
      })
      .select()
      .single();
    if (createError || !playlistItem) {
      throw new Error(`Supabase error: ${createError?.message}`);
    }
    return NextResponse.json(playlistItem, { status: 201 });
  } catch (error) {
    console.error('Error adding song to playlist (admin):', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ADMIN: Remover música da playlist
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    const { id: playlistId } = await context.params;
    const { searchParams } = new URL(request.url);
    const songIdOrSlug = searchParams.get('songId');
    if (!songIdOrSlug) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }
    // Buscar música por ID ou slug
    const { data: song, error: songError } = await supabase
      .from('Song')
      .select('id')
      .or(`id.eq.${songIdOrSlug},slug.eq.${songIdOrSlug}`)
      .single();
    if (songError || !song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }
    const songId = song.id;
    // Remover item da playlist
    const { error: deleteError } = await supabase
      .from('PlaylistItem')
      .delete()
      .eq('playlistId', playlistId)
      .eq('songId', songId);
    if (deleteError) {
      throw new Error(`Supabase error: ${deleteError.message}`);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing song from playlist (admin):', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
