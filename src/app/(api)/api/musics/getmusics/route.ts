import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 
import { logGeneral, logErrors } from "@/lib/logs";
import { protectApiRoute, applySecurityHeaders } from "@/lib/api-protection";

export async function GET(request: NextRequest) {
  // Verifica se a requisição vem de uma origem autorizada
  const unauthorizedResponse = protectApiRoute(request);
  if (unauthorizedResponse) {
    await logGeneral('WARN', 'Tentativa de acesso não autorizado à API', 'Acesso negado por origem inválida', {
      action: 'unauthorized_api_access',
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    });
    return unauthorizedResponse;
  }
  try {
    await logGeneral('INFO', 'Busca de músicas iniciada', 'Utilizador a consultar lista de músicas', {
      action: 'fetch_musics_attempt'
    });

    const songs = await prisma.song.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
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

    const response = NextResponse.json(songs);
    return applySecurityHeaders(response);
  } catch (error) {
    await logErrors('ERROR', 'Erro ao buscar músicas', 'Falha na consulta de músicas', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'fetch_musics_error'
    });
    console.error("[GET_MUSICS]", error);
    const response = NextResponse.json({ error: "Erro ao buscar músicas." }, { status: 500 });
    return applySecurityHeaders(response);
  }
}