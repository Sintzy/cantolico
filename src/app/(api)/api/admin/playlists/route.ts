import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAdmin, logErrors } from '@/lib/logs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const visibility = searchParams.get('visibility') || '';
    
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (visibility === 'public') {
      where.isPublic = true;
    } else if (visibility === 'private') {
      where.isPublic = false;
    }

    const [playlists, totalCount] = await Promise.all([
      prisma.playlist.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              items: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.playlist.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    await logAdmin('INFO', 'Lista de playlists consultada', 'Admin a consultar gestão de playlists', {
      userId: session.user.id,
      action: 'playlist_management_fetch',
      filters: { page, limit, search, visibility },
      resultsCount: playlists.length
    });

    return NextResponse.json({
      playlists,
      totalCount,
      totalPages,
      currentPage: page
    });
  } catch (error) {
    await logErrors('ERROR', 'Erro na gestão de playlists', 'Falha na consulta de playlists', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'playlist_management_error'
    });
    console.error('Erro ao buscar playlists:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
