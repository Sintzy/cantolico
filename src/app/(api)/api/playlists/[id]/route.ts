import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const playlistId = id;

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        items: {
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
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    if (!playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    // Verificar permissões
    const isOwner = session?.user?.id === playlist.userId;
    const isPublic = playlist.isPublic;

    if (!isPublic && !isOwner) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(playlist);

  } catch (error) {
    console.error('Error fetching playlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { name, description, isPublic } = body;

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

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Nome da playlist é obrigatório' },
        { status: 400 }
      );
    }

    const updatedPlaylist = await prisma.playlist.update({
      where: { id: playlistId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isPublic: !!isPublic
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        _count: {
          select: {
            items: true
          }
        }
      }
    });

    return NextResponse.json(updatedPlaylist);

  } catch (error) {
    console.error('Error updating playlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    await prisma.playlist.delete({
      where: { id: playlistId }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
