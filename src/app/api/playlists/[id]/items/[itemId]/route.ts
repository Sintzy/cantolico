import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase } from '@/lib/supabase-admin';
import { getClerkSession } from '@/lib/api-middleware';
import { logUserAction } from '@/lib/logging-helpers';
import { withPlaylistLogging } from '@/lib/api-route-wrapper';
interface Params {
  id: string;
  itemId: string;
}

// PUT - Atualizar nota de um item da playlist
async function PUTHandler(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const session = await getClerkSession();

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

// DELETE - Remover item da playlist
async function DELETEHandler(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const session = await getClerkSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: playlistId, itemId } = await params;

    // Verificar propriedade da playlist
    const { data: playlist, error: playlistError } = await supabase
      .from('Playlist')
      .select('userId')
      .eq('id', playlistId)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json({ error: 'Playlist não encontrada' }, { status: 404 });
    }

    const isOwner = playlist.userId === session.user.id;

    let isEditor = false;
    if (!isOwner) {
      const { data: membership } = await supabase
        .from('PlaylistMember')
        .select('role')
        .eq('playlistId', playlistId)
        .eq('userEmail', session.user.email)
        .eq('status', 'ACCEPTED')
        .eq('role', 'EDITOR')
        .single();

      isEditor = !!membership;
    }

    if (!isOwner && !isEditor) {
      return NextResponse.json(
        { error: 'Não autorizado. Apenas o proprietário ou editores podem remover músicas.' },
        { status: 403 }
      );
    }

    // Verificar se o item existe e pertence à playlist
    const { data: item, error: itemError } = await supabase
      .from('PlaylistItem')
      .select('id, songId')
      .eq('id', itemId)
      .eq('playlistId', playlistId)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item não encontrado na playlist' }, { status: 404 });
    }

    // Remover o item
    const { error: deleteError } = await supabase
      .from('PlaylistItem')
      .delete()
      .eq('id', itemId);

    if (deleteError) {
      throw new Error(`Supabase error: ${deleteError.message}`);
    }

    // Reordenar itens restantes
    const { data: remainingItems } = await supabase
      .from('PlaylistItem')
      .select('id, order')
      .eq('playlistId', playlistId)
      .order('order', { ascending: true });

    if (remainingItems && remainingItems.length > 0) {
      for (let i = 0; i < remainingItems.length; i++) {
        await supabase
          .from('PlaylistItem')
          .update({ order: i + 1 })
          .eq('id', remainingItems[i].id);
      }
    }

    await logUserAction('playlist.song.deleted', { playlist_id: playlistId, item_id: itemId, song_id: item.songId });

    return NextResponse.json({ message: 'Música removida da playlist com sucesso' });

  } catch (error) {
    console.error('Erro ao remover item da playlist:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export const PUT = withPlaylistLogging(PUTHandler as any);
export const DELETE = withPlaylistLogging(DELETEHandler as any);
