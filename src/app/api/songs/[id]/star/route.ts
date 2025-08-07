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
    const songIdOrSlug = id;
    const userId = session.user.id;

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

    // Verificar se já tem star
    const existingStar = await prisma.star.findUnique({
      where: {
        userId_songId: {
          userId,
          songId
        }
      }
    });

    if (existingStar) {
      return NextResponse.json(
        { error: 'Song already starred' },
        { status: 400 }
      );
    }

    // Criar star
    await prisma.star.create({
      data: {
        userId,
        songId
      }
    });

    // Retornar contagem atualizada
    const starCount = await prisma.star.count({
      where: { songId }
    });

    return NextResponse.json({
      success: true,
      starred: true,
      starCount
    });

  } catch (error) {
    console.error('Error starring song:', error);
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
    const songIdOrSlug = id;
    const userId = session.user.id;

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

    // Remover star se existir
    await prisma.star.deleteMany({
      where: {
        userId,
        songId
      }
    });

    // Retornar contagem atualizada
    const starCount = await prisma.star.count({
      where: { songId }
    });

    return NextResponse.json({
      success: true,
      starred: false,
      starCount
    });

  } catch (error) {
    console.error('Error unstarring song:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const songIdOrSlug = id;

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

    // Contagem total de stars
    const starCount = await prisma.star.count({
      where: { songId }
    });

    // Verificar se o usuário atual deu star (se logado)
    let isStarred = false;
    if (session?.user?.id) {
      const userId = session.user.id;
      const star = await prisma.star.findUnique({
        where: {
          userId_songId: {
            userId,
            songId
          }
        }
      });
      isStarred = !!star;
    }

    return NextResponse.json({
      starCount,
      isStarred
    });

  } catch (error) {
    console.error('Error getting star status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
