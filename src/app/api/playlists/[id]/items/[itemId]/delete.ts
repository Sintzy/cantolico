import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

interface Params {
  id: string;
  itemId: string;
}

// DELETE - Remover item da playlist usando o itemId
export async function DELETE(
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

    // Verificar se a playlist existe e se o usuário tem permissão
    const { data: playlist, error: playlistError } = await supabase
      .from('Playlist')
      .select('userId')
      .eq('id', playlistId)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    // Verificar se é o dono
    const isOwner = playlist.userId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    // Se não é o dono, verificar se é colaborador editor
    let isEditor = false;
    if (!isOwner && !isAdmin) {
      const { data: membership } = await supabase
        .from('PlaylistMember')
        .select('role, status')
        .eq('playlistId', playlistId)
        .eq('userEmail', session.user.email)
        .eq('status', 'ACCEPTED')
        .eq('role', 'EDITOR')
        .single();

      isEditor = !!membership;
    }

    if (!isOwner && !isEditor && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Verificar se o item existe
    const { data: playlistItem, error: itemError } = await supabase
      .from('PlaylistItem')
      .select('id, order')
      .eq('id', itemId)
      .eq('playlistId', playlistId)
      .single();

    if (itemError || !playlistItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Remover o item
    const { error: deleteError } = await supabase
      .from('PlaylistItem')
      .delete()
      .eq('id', itemId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    // Atualizar a ordem dos itens restantes
    const { data: remainingItems, error: remainingError } = await supabase
      .from('PlaylistItem')
      .select('id, order')
      .eq('playlistId', playlistId)
      .order('order', { ascending: true });

    if (!remainingError && remainingItems && remainingItems.length > 0) {
      const updatePromises = remainingItems.map((item, index) =>
        supabase
          .from('PlaylistItem')
          .update({ order: index + 1 })
          .eq('id', item.id)
      );

      await Promise.all(updatePromises);
    }

    return NextResponse.json({
      success: true,
      message: 'Item removido da playlist com sucesso'
    });

  } catch (error) {
    console.error('Error removing playlist item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
