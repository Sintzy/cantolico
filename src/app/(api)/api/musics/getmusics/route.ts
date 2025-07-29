import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 
import { logGeneral, logErrors } from "@/lib/logs";

export async function GET() {
  try {
    await logGeneral('INFO', 'Busca de músicas iniciada', 'Utilizador a consultar lista de músicas', {
      action: 'fetch_musics_attempt'
    });

    const songs = await prisma.song.findMany({
      select: {
        id: true,
        title: true,
        moments: true,
        type: true,
        mainInstrument: true,
        tags: true,
        currentVersionId: true,
        createdAt: true,
        updatedAt: true,
        versions: {
          select: {
            id: true,
            songId: true,
            versionNumber: true,
            sourceType: true,
            sourcePdfKey: true,
            sourceText: true,
            renderedHtml: true,
            keyOriginal: true,
            lyricsPlain: true,
            mediaUrl: true,
            youtubeLink: true,
            spotifyLink: true,
            createdAt: true,
            createdById: true,
          },
          orderBy: { versionNumber: "desc" },
        },
      },
      orderBy: {
        title: 'asc',
      },
    });

    await logGeneral('SUCCESS', 'Músicas carregadas com sucesso', `${songs.length} músicas encontradas`, {
      action: 'musics_fetched',
      musicCount: songs.length
    });

    return NextResponse.json(songs);
  } catch (error) {
    await logErrors('ERROR', 'Erro ao buscar músicas', 'Falha na consulta de músicas', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'fetch_musics_error'
    });
    console.error("[GET_MUSICS]", error);
    return NextResponse.json({ error: "Erro ao buscar músicas." }, { status: 500 });
  }
}