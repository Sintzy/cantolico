import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";
import { logSongViewed, logApiRequestError, toErrorContext } from "@/lib/logging-helpers";
import { protectApiRoute, applySecurityHeaders } from "@/lib/api-protection";
import { formatTagsForPostgreSQL, parseTagsFromPostgreSQL, parseMomentsFromPostgreSQL } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Verifica se a requisição vem de uma origem autorizada
  const unauthorizedResponse = protectApiRoute(req);
  if (unauthorizedResponse) {
    logApiRequestError({
      method: req.method,
      url: req.url,
      path: '/api/musics/[id]',
      status_code: 401,
      error: toErrorContext(new Error('Acesso negado por origem inválida')),
      details: {
        action: 'unauthorized_api_access',
        origin: req.headers.get('origin'),
        referer: req.headers.get('referer'),
      } as any
    });
    return unauthorizedResponse;
  }

  const resolvedParams = await params;
  const { id } = resolvedParams;

  try {
    logSongViewed({
      song_id: id,
      details: {
        action: 'fetch_single_music',
      }
    });

    // Tentar encontrar por ID primeiro, depois por slug
    // OTIMIZADO: Retornar apenas campos necessários para o frontend
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
        author,
        currentVersionId,
        SongVersion!Song_currentVersionId_fkey (
          sourcePdfKey,
          sourceText,
          mediaUrl,
          youtubeLink,
          createdBy:User!SongVersion_createdById_fkey (
            name
          )
        )
      `)
      .or(`id.eq.${id},slug.eq.${id}`)
      .limit(1);

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!songs || songs.length === 0) {
      logApiRequestError({
        method: req.method,
        url: req.url,
        path: '/api/musics/[id]',
        status_code: 404,
        error: toErrorContext(new Error('Música não encontrada')),
        details: {
          song_id: id,
          action: 'music_not_found',
        } as any
      });
      const response = NextResponse.json({ error: "Música não encontrada" }, { status: 404 });
      return applySecurityHeaders(response, req);
    }

    const song = songs[0];

    // Reformatar dados para manter compatibilidade
    const formattedSong = {
      ...song,
      // Processar tags usando a função utilitária
      tags: parseTagsFromPostgreSQL(song.tags),
      // Processar moments usando a função utilitária
      moments: parseMomentsFromPostgreSQL(song.moments),
      currentVersion: song.SongVersion || null
    };

    logSongViewed({
      song_id: id,
      details: { action: 'music_loaded', title: formattedSong.title }
    });

    const response = NextResponse.json(formattedSong);
    return applySecurityHeaders(response, req);
  } catch (error) {
    logApiRequestError({
      method: req.method,
      url: req.url,
      path: '/api/musics/[id]',
      status_code: 500,
      error: toErrorContext(error),
      details: { song_id: id, action: 'fetch_single_music_error' } as any
    });
    console.error("[GET_MUSIC_BY_ID]", error);
    const response = NextResponse.json({ error: "Erro ao carregar música" }, { status: 500 });
    return applySecurityHeaders(response, req);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorizedResponse = protectApiRoute(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const resolvedParams = await params;
  const { id } = resolvedParams;

  try {
    const body = await req.json();
    // Processar tags usando a função utilitária
    const tags = formatTagsForPostgreSQL(body.tags);

    const { error } = await supabase
      .from('Song')
      .update({
        title: body.title,
        type: body.type,
        mainInstrument: body.mainInstrument,
        moments: body.moments,
        tags: tags,
        lyricsPlain: body.lyricsPlain,
        sourceText: body.sourceText,
        keyOriginal: body.keyOriginal,
        mediaUrl: body.mediaUrl,
        spotifyLink: body.spotifyLink,
        youtubeLink: body.youtubeLink
      })
      .eq('id', id);

    if (error) {
      logApiRequestError({
        method: req.method,
        url: req.url,
        path: '/api/musics/[id]',
        status_code: 500,
        error: toErrorContext(error),
        details: { song_id: id, action: 'update_music_error' } as any
      });
      return NextResponse.json({ error: 'Erro ao atualizar música' }, { status: 500 });
    }

    logSongViewed({
      song_id: id,
      details: { action: 'music_updated', title: body.title }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logApiRequestError({
      method: req.method,
      url: req.url,
      path: '/api/musics/[id]',
      status_code: 500,
      error: toErrorContext(error),
      details: { song_id: id, action: 'update_music_error' } as any
    });
    return NextResponse.json({ error: 'Erro ao atualizar música' }, { status: 500 });
  }
}
