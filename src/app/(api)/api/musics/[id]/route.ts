import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { logGeneral, logErrors } from "@/lib/logs";
import { findSongBySlug } from "@/lib/slugs";
import { protectApiRoute, applySecurityHeaders } from "@/lib/api-protection";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Verifica se a requisição vem de uma origem autorizada
  const unauthorizedResponse = protectApiRoute(req);
  if (unauthorizedResponse) {
    await logGeneral('WARN', 'Tentativa de acesso não autorizado à API', 'Acesso negado por origem inválida', {
      action: 'unauthorized_api_access',
      origin: req.headers.get('origin'),
      referer: req.headers.get('referer'),
      endpoint: '/api/musics/[id]'
    });
    return unauthorizedResponse;
  }

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
      const response = NextResponse.json({ error: "Música não encontrada" }, { status: 404 });
      return applySecurityHeaders(response);
    }

    await logGeneral('SUCCESS', 'Música carregada com sucesso', 'Dados da música enviados ao utilizador', {
      musicId: id,
      musicTitle: song.title,
      action: 'music_loaded'
    });

    const response = NextResponse.json(song);
    return applySecurityHeaders(response);
  } catch (error) {
    await logErrors('ERROR', 'Erro ao carregar música', 'Falha na consulta de música individual', {
      musicId: id,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'fetch_single_music_error'
    });
    console.error("[GET_MUSIC_BY_ID]", error);
    const response = NextResponse.json({ error: "Erro ao carregar música" }, { status: 500 });
    return applySecurityHeaders(response);
  }
}
