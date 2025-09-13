
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";
import { logGeneral, logErrors } from "@/lib/logs";
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
    const { data: songs, error } = await supabase
      .from('Song')
      .select(`
        id,
        title,
        slug,
        moments,
        type,
        mainInstrument,
        tags,
        currentVersionId,
        createdAt,
        updatedAt,
        SongVersion!Song_currentVersionId_fkey (
          id,
          songId,
          versionNumber,
          sourceType,
          sourcePdfKey,
          sourceText,
          renderedHtml,
          keyOriginal,
          lyricsPlain,
          mediaUrl,
          youtubeLink,
          spotifyLink,
          createdAt,
          createdById
        )
      `)
      .or(`id.eq.${id},slug.eq.${id}`)
      .limit(1);

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!songs || songs.length === 0) {
      await logGeneral('WARN', 'Música não encontrada', 'Tentativa de acesso a música inexistente', {
        musicId: id,
        action: 'music_not_found'
      });
      const response = NextResponse.json({ error: "Música não encontrada" }, { status: 404 });
      return applySecurityHeaders(response, req);
    }

    const song = songs[0];

    // Reformatar dados para manter compatibilidade
    const formattedSong = {
      ...song,
      // Processar tags de string para array
      tags: song.tags 
        ? song.tags.replace(/[{}]/g, '').split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
        : [],
      // Processar moments de string para array (se necessário)
      moments: song.moments 
        ? (typeof song.moments === 'string' 
           ? song.moments.replace(/[{}]/g, '').split(',').map((moment: string) => moment.trim()).filter((moment: string) => moment.length > 0)
           : song.moments)
        : [],
      currentVersion: song.SongVersion || null
    };

    await logGeneral('SUCCESS', 'Música carregada com sucesso', 'Dados da música enviados ao utilizador', {
      musicId: id,
      musicTitle: formattedSong.title,
      action: 'music_loaded'
    });

    const response = NextResponse.json(formattedSong);
    return applySecurityHeaders(response, req);
  } catch (error) {
    await logErrors('ERROR', 'Erro ao carregar música', 'Falha na consulta de música individual', {
      musicId: id,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'fetch_single_music_error'
    });
    console.error("[GET_MUSIC_BY_ID]", error);
    const response = NextResponse.json({ error: "Erro ao carregar música" }, { status: 500 });
    return applySecurityHeaders(response, req);
  }
}
