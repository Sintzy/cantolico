import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";
import { logApiRequestError, toErrorContext } from "@/lib/logging-helpers";
import { protectApiRoute, applySecurityHeaders } from "@/lib/api-protection";
import { parseTagsFromPostgreSQL, parseMomentsFromPostgreSQL } from "@/lib/utils";
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Verifica se a requisição vem de uma origem autorizada
  const unauthorizedResponse = protectApiRoute(request);
  if (unauthorizedResponse) {
    console.warn(`⚠️  [API] Unauthorized access attempt to /api/musics/getmusics`);
    return unauthorizedResponse;
  }
  try {
    console.log(`🎵 [GET MUSICS] Fetching music list with star counts`);
    
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

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

    if (!songs || songs.length === 0) {
      console.log(`✅ [GET MUSICS] No songs found`);
      const response = NextResponse.json({ songs: [] });
      return applySecurityHeaders(response, request);
    }

    // OTIMIZAÇÃO CRÍTICA: Buscar star counts de todas as músicas em 1 query
    const songIds = songs.map(s => s.id);
    
    const { data: starCounts, error: countError } = await supabase
      .from('Star')
      .select('songId')
      .in('songId', songIds);

    if (countError) {
      console.error('Error fetching star counts:', countError);
      // Continuar mesmo se houver erro, mas sem star counts
    }

    // Contar stars por música
    const starCountMap: { [key: string]: number } = {};
    (starCounts || []).forEach((star) => {
      starCountMap[star.songId] = (starCountMap[star.songId] || 0) + 1;
    });

    // Se usuário está logado, buscar quais músicas ele deu star (1 query)
    let userStarredSongs: Set<string> = new Set();
    if (userId) {
      const { data: userStars, error: userStarError } = await supabase
        .from('Star')
        .select('songId')
        .eq('userId', userId)
        .in('songId', songIds);

      if (userStarError) {
        console.error('Error fetching user stars:', userStarError);
      } else {
        userStarredSongs = new Set((userStars || []).map(s => s.songId));
      }
    }

    // Reformatar dados - incluir star counts
    const formattedSongs = songs.map(song => ({
      id: song.id,
      title: song.title,
      slug: song.slug,
      type: song.type,
      mainInstrument: song.mainInstrument,
      tags: parseTagsFromPostgreSQL(song.tags),
      moments: parseMomentsFromPostgreSQL(song.moments),
      starCount: starCountMap[song.id] || 0,
      isStarred: userStarredSongs.has(song.id)
    }));

    console.log(`✅ [GET MUSICS] Found ${formattedSongs.length} songs (with star data)`);

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