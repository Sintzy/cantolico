import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logGeneral, logErrors } from "@/lib/logs";
import { findSongBySlug } from "@/lib/slugs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  try {
    await logGeneral('INFO', 'Consulta de música individual', 'Utilizador a consultar música específica', {
      musicId: id,
      action: 'fetch_single_music'
    });

    // Tentar encontrar por ID primeiro, depois por slug
    let song = await prisma.song.findUnique({
      where: { id },
      include: {
        currentVersion: {
          include: {
            createdBy: {
              select: { name: true }
            }
          }
        }
      }
    });

    // Se não encontrou por ID, tentar por slug
    if (!song) {
      song = await findSongBySlug(id);
    }

    if (!song) {
      await logGeneral('WARN', 'Música não encontrada', 'Tentativa de acesso a música inexistente', {
        musicId: id,
        action: 'music_not_found'
      });
      return NextResponse.json({ error: "Música não encontrada" }, { status: 404 });
    }

    await logGeneral('SUCCESS', 'Música carregada com sucesso', 'Dados da música enviados ao utilizador', {
      musicId: id,
      musicTitle: song.title,
      action: 'music_loaded'
    });

    return NextResponse.json(song);
  } catch (error) {
    await logErrors('ERROR', 'Erro ao carregar música', 'Falha na consulta de música individual', {
      musicId: id,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'fetch_single_music_error'
    });
    console.error("[GET_MUSIC_BY_ID]", error);
    return NextResponse.json({ error: "Erro ao carregar música" }, { status: 500 });
  }
}
