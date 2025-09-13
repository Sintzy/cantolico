import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";
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
      .order('title', { ascending: true });

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    // Reformatar dados para manter compatibilidade
    const formattedSongs = (songs || []).map(song => ({
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
      versions: song.SongVersion ? [song.SongVersion] : []
    }));

    await logGeneral('SUCCESS', 'Músicas carregadas com sucesso', `${formattedSongs.length} músicas encontradas`, {
      action: 'musics_fetched',
      musicCount: formattedSongs.length
    });

    const response = NextResponse.json({ songs: formattedSongs });
    return applySecurityHeaders(response, request);
  } catch (error) {
    await logErrors('ERROR', 'Erro ao buscar músicas', 'Falha na consulta de músicas', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'fetch_musics_error'
    });
    console.error("[GET_MUSICS]", error);
    const response = NextResponse.json({ error: "Erro ao buscar músicas." }, { status: 500 });
    return applySecurityHeaders(response, request);
  }
}