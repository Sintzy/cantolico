import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

interface Params {
  id: string;
  itemId: string;
}

// PUT - Atualizar nota de um item da playlist
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: playlistId, itemId } = await params;
    const body = await request.json();
    const { note } = body;

    // Verificar se o item existe e pegar a playlist
    const { data: item, error: itemError } = await supabase
      .from('PlaylistItem')
      .select('id, playlistId')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Verificar se o user tem permissão para editar a playlist
    const { data: playlist, error: playlistError } = await supabase
      .from('Playlist')
      .select('userId')
      .eq('id', item.playlistId)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    const isOwner = playlist.userId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      // Verificar se é editor
      const { data: memberAccess } = await supabase
        .from('PlaylistMember')
        .select('role')
        .eq('playlistId', item.playlistId)
        .eq('userEmail', session.user.email)
        .eq('role', 'EDITOR')
        .single();

      if (!memberAccess) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Atualizar a nota (permitir null para remover)
    const { data: updatedItem, error: updateError } = await supabase
      .from('PlaylistItem')
      .update({ note: note || null })
      .eq('id', itemId)
      .select('id, note')
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedItem);

  } catch (error) {
    console.error('Error updating playlist item note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
