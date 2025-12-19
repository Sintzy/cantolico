import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { withApiProtection } from '@/lib/api-middleware';

/**
 * OTIMIZAÇÃO: Endpoint batch para obter stars de múltiplas músicas de uma vez
 * Reduz N requests individuais para 1 único request
 * 
 * POST /api/songs/stars/batch
 * Body: { songIds: string[] }
 * Response: { stars: { [songId: string]: { starCount: number, isStarred: boolean } } }
 */
export const POST = withApiProtection(async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Parse body
    const body = await request.json();
    const { songIds } = body;

    if (!Array.isArray(songIds) || songIds.length === 0) {
      return NextResponse.json(
        { error: 'songIds array is required' },
        { status: 400 }
      );
    }

    // Limitar a 100 músicas por request para evitar overload
    if (songIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 songs per request' },
        { status: 400 }
      );
    }

    // OTIMIZADO: Buscar contagens de stars para todas as músicas de uma vez
    const { data: starCounts, error: countError } = await supabase
      .from('Star')
      .select('songId')
      .in('songId', songIds);

    if (countError) {
      throw countError;
    }

    // Contar stars por música
    const starCountMap: { [key: string]: number } = {};
    (starCounts || []).forEach((star) => {
      starCountMap[star.songId] = (starCountMap[star.songId] || 0) + 1;
    });

    // Se usuário está logado, buscar quais músicas ele deu star
    let userStarredSongs: Set<string> = new Set();
    if (userId) {
      const { data: userStars, error: userStarError } = await supabase
        .from('Star')
        .select('songId')
        .eq('userId', userId)
        .in('songId', songIds);

      if (userStarError) {
        throw userStarError;
      }

      userStarredSongs = new Set((userStars || []).map(s => s.songId));
    }

    // Montar resultado
    const stars: { [key: string]: { starCount: number; isStarred: boolean } } = {};
    songIds.forEach((songId) => {
      stars[songId] = {
        starCount: starCountMap[songId] || 0,
        isStarred: userStarredSongs.has(songId)
      };
    });

    return NextResponse.json({ stars });

  } catch (error) {
    console.error('Error in batch star fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
