import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

interface Params {
  id: string;
}

interface ReorderRequest {
  items: Array<{
    id: string;
    order: number;
  }>;
}

// PUT - Reordenar músicas na playlist
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

    const { id: playlistId } = await params;
    const body = await request.json();
    const { items } = body as ReorderRequest;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Verificar se o user tem permissão para editar a playlist
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

    const isOwner = playlist.userId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      // Verificar se é editor
      const { data: memberAccess } = await supabase
        .from('PlaylistMember')
        .select('role')
        .eq('playlistId', playlistId)
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

    // Atualizar a ordem de cada item
    const updatePromises = items.map(item =>
      supabase
        .from('PlaylistItem')
        .update({ order: item.order })
        .eq('id', item.id)
        .eq('playlistId', playlistId)
    );

    const results = await Promise.all(updatePromises);

    // Verificar erros
    const hasError = results.some(result => result.error);
    if (hasError) {
      return NextResponse.json(
        { error: 'Error updating order' },
        { status: 500 }
      );
    }

    // Retornar os items reordenados
    return NextResponse.json({
      success: true,
      message: 'Ordem atualizada com sucesso'
    });

  } catch (error) {
    console.error('Error reordering playlist items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
