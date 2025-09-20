import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { withAuthApiProtection } from '@/lib/api-middleware';
import { logGeneral, logErrors } from '@/lib/logs';
import { parseTagsFromPostgreSQL, parseMomentsFromPostgreSQL } from '@/lib/utils';

export const GET = withAuthApiProtection(async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    console.log('Debug: Fetching starred songs for user:', userId);

    // Primeiro, vamos tentar uma query mais simples
    const { data: starData, error: starError } = await supabase
      .from('Star')
      .select('songId, createdAt')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (starError) {
      console.error('Error fetching stars:', starError);
      await logErrors('ERROR', 'Erro ao buscar stars', 'Falha na query inicial de stars', {
        userId,
        userEmail: session.user.email,
        error: starError.message,
        action: 'get_starred_songs_step1'
      });
      
      return NextResponse.json(
        { error: 'Failed to fetch starred songs', details: starError.message },
        { status: 500 }
      );
    }

    if (!starData || starData.length === 0) {
      console.log('Debug: No starred songs found for user');
      return NextResponse.json({
        songs: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      });
    }

    console.log('Debug: Found', starData.length, 'starred songs');

    // Buscar detalhes das músicas (sem relacionamento com User)
    const songIds = starData.map(star => star.songId);
    const { data: songsData, error: songsError } = await supabase
      .from('Song')
      .select(`
        id,
        title,
        slug,
        moments,
        type,
        mainInstrument,
        tags,
        createdAt,
        updatedAt
      `)
      .in('id', songIds);

    if (songsError) {
      console.error('Error fetching songs:', songsError);
      await logErrors('ERROR', 'Erro ao buscar detalhes das músicas', 'Falha na query de músicas', {
        userId,
        userEmail: session.user.email,
        error: songsError.message,
        songIds,
        action: 'get_starred_songs_step2'
      });
      
      return NextResponse.json(
        { error: 'Failed to fetch song details', details: songsError.message },
        { status: 500 }
      );
    }

    // Buscar detalhes dos usuários (criadores das músicas) - Simplificado
    // Como não temos acesso direto ao userId na tabela Song, vamos usar um fallback
    const usersData: any[] = [];

    // Contar total de músicas com star
    const { count, error: countError } = await supabase
      .from('Star')
      .select('songId', { count: 'exact', head: true })
      .eq('userId', userId);

    if (countError) {
      console.error('Error counting stars:', countError);
      await logErrors('ERROR', 'Erro ao contar músicas favoritas', 'Falha na query de contagem', {
        userId,
        userEmail: session.user.email,
        error: countError.message,
        action: 'count_starred_songs'
      });
    }

    // Combinar dados
    const songs = starData.map(star => {
      const song = songsData?.find(s => s.id === star.songId);
      if (!song) return null;
      
      console.log('Debug song data:', {
        id: song.id,
        title: song.title,
        moments: song.moments,
        tags: song.tags,
        momentsType: typeof song.moments,
        tagsType: typeof song.tags,
        parsedMoments: parseMomentsFromPostgreSQL(song.moments),
        parsedTags: parseTagsFromPostgreSQL(song.tags)
      });
      
      return {
        id: song.id,
        title: song.title,
        slug: song.slug,
        author: 'Cantólico', // Nome padrão por enquanto
        mainInstrument: song.mainInstrument,
        moments: parseMomentsFromPostgreSQL(song.moments),
        tags: parseTagsFromPostgreSQL(song.tags),
        created_at: song.createdAt,
        updated_at: song.updatedAt,
        starred_at: star.createdAt,
        User: { id: '0', name: 'Cantólico' } // Dados padrão
      };
    }).filter(Boolean);

    console.log('Debug: Returning', songs.length, 'songs');

    await logGeneral('INFO', 'Músicas favoritas listadas', 'Utilizador visualizou suas músicas favoritas', {
      userId,
      userEmail: session.user.email,
      count: songs.length,
      page,
      limit,
      action: 'list_starred_songs',
      entity: 'starred_songs'
    });

    return NextResponse.json({
      songs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Unexpected error in starred songs API:', error);
    const session = await getServerSession(authOptions);
    await logErrors('ERROR', 'Erro inesperado ao buscar músicas favoritas', error instanceof Error ? error.message : 'Unknown error', {
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      action: 'get_starred_songs_unexpected'
    });

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});