import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const playlistId = id;
    const body = await request.json();
    const { songId } = body;

    if (!songId) {
      return NextResponse.json(
        { error: 'Song ID is required' },
        { status: 400 }
      );
    }

    // Verificar se é o dono da playlist
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      select: { userId: true }
    });

    if (!playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    if (playlist.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Verificar se a música existe
    const song = await prisma.song.findFirst({
      where: {
        OR: [
          { id: songId },
          { slug: songId }
        ]
      }
    });

    if (!song) {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      );
    }

    const actualSongId = song.id;

    // Verificar se a música já está na playlist
    const existingItem = await prisma.playlistItem.findUnique({
      where: {
        playlistId_songId: {
          playlistId,
          songId: actualSongId
        }
      }
    });

    if (existingItem) {
      return NextResponse.json(
        { error: 'Song already in playlist' },
        { status: 400 }
      );
    }

    // Obter próxima ordem
    const lastItem = await prisma.playlistItem.findFirst({
      where: { playlistId },
      orderBy: { order: 'desc' }
    });

    const nextOrder = (lastItem?.order || 0) + 1;

    // Adicionar item à playlist
    const playlistItem = await prisma.playlistItem.create({
      data: {
        playlistId,
        songId: actualSongId,
        order: nextOrder,
        addedById: session.user.id
      },
      include: {
        song: {
          include: {
            currentVersion: true,
            _count: {
              select: {
                stars: true
              }
            }
          }
        },
        addedBy: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });

    return NextResponse.json(playlistItem, { status: 201 });

  } catch (error) {
    console.error('Error adding song to playlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const playlistId = id;
    const { searchParams } = new URL(request.url);
    const songIdOrSlug = searchParams.get('songId');

    if (!songIdOrSlug) {
      return NextResponse.json(
        { error: 'Song ID is required' },
        { status: 400 }
      );
    }

    // Buscar música por ID ou slug
    const song = await prisma.song.findFirst({
      where: {
        OR: [
          { id: songIdOrSlug },
          { slug: songIdOrSlug }
        ]
      }
    });

    if (!song) {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      );
    }

    const songId = song.id;

    // Verificar se é o dono da playlist
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      select: { userId: true }
    });

    if (!playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    if (playlist.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Remover item da playlist
    await prisma.playlistItem.deleteMany({
      where: {
        playlistId,
        songId
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error removing song from playlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
