import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { withAuthApiProtection } from '@/lib/api-middleware';
import { logApiRequestError, toErrorContext } from '@/lib/logging-helpers';
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



    // Primeiro, vamos tentar uma query mais simples
    const { data: starData, error: starError } = await supabase
      .from('Star')
      .select('songId, createdAt')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (starError) {
      console.error('Error fetching stars:', starError);
      logApiRequestError({
        method: request.method,
        url: request.url,
        path: '/api/user/starred-songs',
        status_code: 500,
        error: toErrorContext(starError)
      });
      
      return NextResponse.json(
        { error: 'Failed to fetch starred songs', details: starError.message },
        { status: 500 }
      );
    }

    if (!starData || starData.length === 0) {

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
      logApiRequestError({
        method: request.method,
        url: request.url,
        path: '/api/user/starred-songs',
        status_code: 500,
        error: toErrorContext(songsError)
      });
      
      return NextResponse.json(
        { error: 'Failed to fetch song details', details: songsError.message },
        { status: 500 }
      );
    }

    // Contar stars agregados por música para evitar N+1
    const { data: starAggregates } = await supabase
      .from('Star')
      .select('songId')
      .in('songId', songIds);

    const starCounts = (starAggregates || []).reduce((acc: Record<string, number>, row) => {
      acc[row.songId] = (acc[row.songId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

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
      // Não falha a requisição se a contagem falhar
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
        starCount: starCounts[song.id] || 0,
        isStarred: true,
        User: { id: '0', name: 'Cantólico' } // Dados padrão
      };
    }).filter(Boolean);

    // Remoção de log de sucesso redundante - apenas console
    console.log(`✅ Starred songs fetched: ${songs.length} songs for user ${userId}`);

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
    logApiRequestError({
      method: request.method,
      url: request.url,
      path: '/api/user/starred-songs',
      status_code: 500,
      error: toErrorContext(error)
    });

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});