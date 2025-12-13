import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";
import { logApiRequestError, toErrorContext } from "@/lib/logging-helpers";
import { protectApiRoute, applySecurityHeaders } from "@/lib/api-protection";
import { parseTagsFromPostgreSQL, parseMomentsFromPostgreSQL } from "@/lib/utils";

export async function GET(request: NextRequest) {
  // Verifica se a requisição vem de uma origem autorizada
  const unauthorizedResponse = protectApiRoute(request);
  if (unauthorizedResponse) {
    console.warn(`⚠️  [API] Unauthorized access attempt to /api/musics/getmusics`);
    return unauthorizedResponse;
  }
  try {
    console.log(`🎵 [GET MUSICS] Fetching music list`);

    // OTIMIZADO: Retornar apenas campos necessários para listagem
    // Frontend usa: id, title, slug, moments, tags, mainInstrument
    const { data: songs, error } = await supabase
      .from('Song')
      .select(`
        id,
        title,
        slug,
        moments,
        type,
        mainInstrument,
        tags
      `)
      .order('title', { ascending: true });

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    // Reformatar dados - apenas processar tags e moments
    const formattedSongs = (songs || []).map(song => ({
      id: song.id,
      title: song.title,
      slug: song.slug,
      type: song.type,
      mainInstrument: song.mainInstrument,
      tags: parseTagsFromPostgreSQL(song.tags),
      moments: parseMomentsFromPostgreSQL(song.moments)
    }));

    console.log(`✅ [GET MUSICS] Found ${formattedSongs.length} songs`);

    const response = NextResponse.json({ songs: formattedSongs });
    return applySecurityHeaders(response, request);
  } catch (error) {
    logApiRequestError({
      method: request.method,
      url: request.url,
      path: '/api/musics/getmusics',
      status_code: 500,
      error: toErrorContext(error),
      details: { action: 'fetch_musics_error' } as any
    });
    console.error("[GET_MUSICS]", error);
    const response = NextResponse.json({ error: "Erro ao buscar músicas." }, { status: 500 });
    return applySecurityHeaders(response, request);
  }
}