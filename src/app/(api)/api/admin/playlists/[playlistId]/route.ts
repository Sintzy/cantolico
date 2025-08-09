import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAdmin, logErrors } from '@/lib/logs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { isPublic } = await request.json();
    const { playlistId } = await params;

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: { user: { select: { name: true, email: true } } }
    });

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist não encontrada' }, { status: 404 });
    }

    const updatedPlaylist = await prisma.playlist.update({
      where: { id: playlistId },
      data: { isPublic },
    });

    await logAdmin('SUCCESS', 'Visibilidade de playlist alterada', `Playlist "${playlist.name}" tornada ${isPublic ? 'pública' : 'privada'}`, {
      userId: session.user.id,
      playlistId,
      playlistName: playlist.name,
      playlistOwner: playlist.user.name || playlist.user.email,
      visibilityFrom: playlist.isPublic,
      visibilityTo: isPublic,
      action: 'playlist_visibility_changed'
    });

    return NextResponse.json({
      message: 'Visibilidade alterada com sucesso',
      playlist: updatedPlaylist
    });
  } catch (error) {
    await logErrors('ERROR', 'Erro ao alterar visibilidade da playlist', 'Falha na alteração de visibilidade', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'playlist_visibility_error'
    });
    console.error('Erro ao alterar visibilidade:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { playlistId } = await params;

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: { 
        user: { select: { name: true, email: true } },
        _count: { select: { items: true } }
      }
    });

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist não encontrada' }, { status: 404 });
    }

    await prisma.playlist.delete({
      where: { id: playlistId },
    });

    await logAdmin('SUCCESS', 'Playlist eliminada', `Playlist "${playlist.name}" foi removida`, {
      userId: session.user.id,
      playlistId,
      playlistName: playlist.name,
      playlistOwner: playlist.user.name || playlist.user.email,
      playlistItemsCount: playlist._count.items,
      action: 'playlist_deleted'
    });

    return NextResponse.json({
      message: 'Playlist eliminada com sucesso'
    });
  } catch (error) {
    await logErrors('ERROR', 'Erro ao eliminar playlist', 'Falha na eliminação da playlist', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'playlist_delete_error'
    });
    console.error('Erro ao eliminar playlist:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
