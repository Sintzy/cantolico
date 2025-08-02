import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdmin, logErrors } from "@/lib/logs";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "REVIEWER")) {
      await logAdmin('WARN', 'Acesso não autorizado à gestão de músicas', 'Tentativa de acesso sem permissões', {
        userId: session?.user?.id,
        action: 'music_management_unauthorized'
      });
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const instrument = searchParams.get('instrument') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { 
          currentVersion: {
            createdBy: {
              name: { contains: search, mode: 'insensitive' }
            }
          }
        }
      ];
    }

    if (type && type !== 'all') {
      where.type = type;
    }

    // Get songs with pagination
    const [songs, totalSongs] = await Promise.all([
      prisma.song.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder as 'asc' | 'desc'
        },
        include: {
          currentVersion: {
            include: {
              createdBy: {
                select: { 
                  id: true,
                  name: true, 
                  email: true,
                  image: true,
                  role: true
                }
              }
            }
          },
          _count: {
            select: {
              versions: true,
              favorites: true
            }
          }
        }
      }),
      prisma.song.count({ where })
    ]);

    const totalPages = Math.ceil(totalSongs / limit);

    await logAdmin('INFO', 'Lista de músicas consultada', 'Admin/Reviewer a consultar gestão de músicas', {
      userId: session.user.id,
      action: 'music_management_fetch',
      filters: { page, limit, search, type },
      resultsCount: songs.length
    });

    return NextResponse.json({
      songs: songs.map(song => ({
        id: song.id,
        title: song.title,
        artist: song.currentVersion?.createdBy?.name || 'Desconhecido',
        type: song.type,
        lyrics: song.currentVersion?.lyricsPlain || '',
        createdAt: song.createdAt,
        author: song.currentVersion?.createdBy ? {
          id: song.currentVersion.createdBy.id.toString(),
          name: song.currentVersion.createdBy.name || 'Utilizador',
          profileImage: song.currentVersion.createdBy.image,
          role: song.currentVersion.createdBy.role,
          email: song.currentVersion.createdBy.email
        } : undefined
      })),
      totalCount: totalSongs,
      totalPages,
      currentPage: page
    });
  } catch (error) {
    await logErrors('ERROR', 'Erro na gestão de músicas', 'Falha na consulta de músicas', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'music_management_error'
    });
    console.error("Erro na gestão de músicas:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { songId } = await request.json();

    if (!session || session.user.role !== "ADMIN") {
      await logAdmin('WARN', 'Tentativa não autorizada de eliminar música', 'Acesso negado para eliminação de música', {
        userId: session?.user?.id,
        songId,
        action: 'music_delete_unauthorized'
      });
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (!songId) {
      return NextResponse.json({ error: "ID da música é obrigatório" }, { status: 400 });
    }

    // Get song details for logging
    const song = await prisma.song.findUnique({
      where: { id: songId },
      select: { 
        title: true, 
        type: true,
        _count: {
          select: {
            versions: true,
            favorites: true
          }
        }
      }
    });

    if (!song) {
      return NextResponse.json({ error: "Música não encontrada" }, { status: 404 });
    }

    // Delete in the correct order to avoid foreign key constraint violations
    // Use a transaction to ensure atomicity
    const deletionResult = await prisma.$transaction(async (tx) => {
      // 1. Delete favorites first
      const favoritesDeleted = await tx.favorite.deleteMany({
        where: { songId: songId }
      });

      // 2. Delete song versions
      const versionsDeleted = await tx.songVersion.deleteMany({
        where: { songId: songId }
      });

      // 3. Finally delete the song
      await tx.song.delete({
        where: { id: songId }
      });

      return {
        favoritesDeleted: favoritesDeleted.count,
        versionsDeleted: versionsDeleted.count
      };
    });

    await logAdmin('SUCCESS', 'Música eliminada', 'Música removida do sistema', {
      userId: session.user.id,
      songId,
      songTitle: song.title,
      songType: song.type,
      versionsDeleted: deletionResult.versionsDeleted,
      favoritesDeleted: deletionResult.favoritesDeleted,
      action: 'music_deleted'
    });

    return NextResponse.json({ 
      message: "Música eliminada com sucesso",
      details: {
        songTitle: song.title,
        versionsDeleted: deletionResult.versionsDeleted,
        favoritesDeleted: deletionResult.favoritesDeleted
      }
    });
  } catch (error) {
    await logErrors('ERROR', 'Erro ao eliminar música', 'Falha na eliminação de música', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'music_delete_error'
    });
    console.error("Erro ao eliminar música:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
