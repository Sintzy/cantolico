import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { protectApiRoute, applySecurityHeaders } from '@/lib/api-protection'

export async function GET(request: NextRequest) {
  // Verifica se a requisição vem de uma origem autorizada
  const unauthorizedResponse = protectApiRoute(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const skip = (page - 1) * limit

    const [playlists, total] = await Promise.all([
      prisma.playlist.findMany({
        where: {
          isPublic: true
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
        },
        orderBy: {
          updatedAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.playlist.count({
        where: {
          isPublic: true
        }
      })
    ])

    const response = NextResponse.json({
      playlists,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    return applySecurityHeaders(response);
  } catch (error) {
    console.error('Erro ao buscar playlists públicas:', error)
    const response = NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
    return applySecurityHeaders(response);
  }
}
