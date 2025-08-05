import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Buscar banners ativos para uma página específica
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || 'ALL';
    
    const now = new Date();
    
    const banners = await prisma.banner.findMany({
      where: {
        isActive: true,
        OR: [
          { pages: { has: page } },
          { pages: { has: 'ALL' } }
        ],
        AND: [
          {
            OR: [
              { startDate: null },
              { startDate: { lte: now } }
            ]
          },
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } }
            ]
          }
        ]
      },
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        position: true,
        priority: true
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json(banners);
  } catch (error) {
    console.error('Erro ao buscar banners ativos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
