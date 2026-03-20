import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";
import { logApiRequestError, toErrorContext } from "@/lib/logging-helpers";
import { protectApiRoute, applySecurityHeaders } from "@/lib/api-protection";
import { parseTagsFromPostgreSQL, parseMomentsFromPostgreSQL } from "@/lib/utils";
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// In-memory cache with TTL (5 minutes)
let cachedSongsData: any = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const unauthorizedResponse = protectApiRoute(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }
  
  try {
    const now = Date.now();
    
    // Return cached data if valid (public endpoint - can use aggressive cache)
    if (cachedSongsData && (now - cacheTime) < CACHE_TTL) {
      const response = NextResponse.json({ songs: cachedSongsData, cached: true });
      response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      return applySecurityHeaders(response, request);
    }
    
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Fetch minimal data using admin client with Stars included directly
    const { data: songs, error } = await adminSupabase
      .from('Song')
      .select('id,title,slug,moments,type,mainInstrument,tags, Star(id, userId)')
      .order('title', { ascending: true });

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!songs || songs.length === 0) {
      const response = NextResponse.json({ songs: [] });
      response.headers.set('Cache-Control', 'public, max-age=300');
      return applySecurityHeaders(response, request);
    }

    const formattedSongs = songs.map(song => {
      const songStars = song.Star || [];
      const starCount = songStars.length;
      const isStarred = userId ? songStars.some((s: any) => s.userId === userId) : false;

      return {
        id: song.id,
        title: song.title,
        slug: song.slug,
        type: song.type,
        mainInstrument: song.mainInstrument,
        tags: parseTagsFromPostgreSQL(song.tags),
        moments: parseMomentsFromPostgreSQL(song.moments),
        starCount,
        isStarred
      };
    });

    // Update cache
    cachedSongsData = formattedSongs;
    cacheTime = now;

    const response = NextResponse.json({ songs: formattedSongs });
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
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
    const response = NextResponse.json({ error: "Erro ao buscar músicas." }, { status: 500 });
    return applySecurityHeaders(response, request);
  }
}