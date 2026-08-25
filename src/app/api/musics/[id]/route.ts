import { NextRequest, NextResponse } from "next/server";
import { adminSupabase as supabase } from "@/lib/supabase-admin";
import { logSongViewed, logApiRequestError, toErrorContext, logUserAction } from "@/lib/logging-helpers";
import { protectApiRoute, applySecurityHeaders } from "@/lib/api-protection";
import { formatTagsForPostgreSQL, parseTagsFromPostgreSQL, parseMomentsFromPostgreSQL } from "@/lib/utils";
import { withSongLogging } from "@/lib/api-route-wrapper";
import { isPremiumState } from "@/lib/premium";
import { isLikelySongId, normalizeSongIdentifier } from "@/lib/song-identifier";

const songSelect = `
  id,
  title,
  slug,
  moments,
  type,
  mainInstrument,
  capo,
  tags,
  author,
  currentVersionId,
  SongVersion!Song_currentVersionId_fkey (
    sourcePdfKey,
    sourceText,
    mediaUrl,
    spotifyLink,
    youtubeLink,
    createdBy:User!SongVersion_createdById_fkey (
      name,
      plan,
      planStatus,
      premiumUntil
    )
  )
`;

async function findSongByIdOrSlug(id: string) {
  const songIdOrSlug = normalizeSongIdentifier(id);
  const looksLikeId = isLikelySongId(songIdOrSlug);
  let idLookupError: any = null;

  if (looksLikeId) {
    const { data, error } = await supabase
      .from('Song')
      .select(songSelect)
      .eq('id', songIdOrSlug)
      .limit(1);

    if (error) {
      idLookupError = error;
    } else if (data?.[0]) {
      return { song: data[0], error: null };
    }
  }

  const { data, error } = await supabase
    .from('Song')
    .select(songSelect)
    .eq('slug', songIdOrSlug)
    .limit(1);

  if (error) {
    return { song: null, error };
  }

  if (!data?.[0] && idLookupError) {
    return { song: null, error: idLookupError };
  }

  return { song: data?.[0] ?? null, error: null };
}

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { song, error } = await findSongByIdOrSlug(id);

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!song) {
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

    const currentVersion = Array.isArray(song.SongVersion)
      ? song.SongVersion[0]
      : song.SongVersion as any;
    const createdBy = Array.isArray(currentVersion?.createdBy)
      ? currentVersion.createdBy[0]
      : currentVersion?.createdBy;
    const songFields = { ...(song as any) };
    delete songFields.SongVersion;

    // Reformatar dados para manter compatibilidade
    const formattedSong = {
      ...songFields,
      // Processar tags usando a função utilitária
      tags: parseTagsFromPostgreSQL(song.tags),
      // Processar moments usando a função utilitária
      moments: parseMomentsFromPostgreSQL(song.moments),
      currentVersion: currentVersion
        ? {
            ...currentVersion,
            createdBy: createdBy
              ? {
                  name: createdBy.name,
                  isPremium: isPremiumState({
                    plan: createdBy.plan,
                    status: createdBy.planStatus,
                    premiumUntil: createdBy.premiumUntil,
                  }),
                }
              : null,
          }
        : null
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

async function PUTHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    await logUserAction('song.updated', { song_id: id, title: body.title });
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

export const GET = withSongLogging(GETHandler as any);
export const PUT = withSongLogging(PUTHandler as any);
