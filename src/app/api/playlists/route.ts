import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const includePublic = searchParams.get('includePublic') === 'true';

    let whereClause: any = {};

    if (userId) {
      // Se especificou userId, buscar playlists desse usuário
      whereClause.userId = parseInt(userId);
      
      // Se não é o próprio usuário, só mostrar públicas
      if (!session || session.user.id !== parseInt(userId)) {
        whereClause.isPublic = true;
      }
    } else if (session?.user?.id) {
      // Se logado mas não especificou userId, buscar próprias playlists
      whereClause.userId = session.user.id;
    } else if (includePublic) {
      // Se não logado mas quer ver públicas
      whereClause.isPublic = true;
    } else {
      return NextResponse.json([]);
    }

    const playlists = await prisma.playlist.findMany({
      where: whereClause,
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
              select: {
                id: true,
                title: true,
                slug: true
              }
            }
          },
          orderBy: {
            order: 'asc'
          }
        },
        _count: {
          select: {
            items: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json(playlists);

  } catch (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, isPublic } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Nome da playlist é obrigatório' },
        { status: 400 }
      );
    }

    const playlist = await prisma.playlist.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isPublic: !!isPublic,
        userId: session.user.id
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

    return NextResponse.json(playlist, { status: 201 });

  } catch (error) {
    console.error('Error creating playlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
