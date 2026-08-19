import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase-admin';
import { withAuthApiProtection, withApiProtection, getClerkSession } from '@/lib/api-middleware';
import { logSongStarred, logUserAction } from '@/lib/logging-helpers';
import { isLikelySongId, normalizeSongIdentifier } from '@/lib/song-identifier';

type SongLookup = {
  id: string;
  title?: string | null;
  slug?: string | null;
};

async function findSongByIdOrSlug(identifier: string, select: string) {
  const songIdOrSlug = normalizeSongIdentifier(identifier);
  const looksLikeId = isLikelySongId(songIdOrSlug);
  let idLookupError: unknown = null;

  if (looksLikeId) {
    const { data, error } = await adminSupabase
      .from('Song')
      .select(select)
      .eq('id', songIdOrSlug)
      .limit(1);

    if (error) {
      idLookupError = error;
    } else if (data?.[0]) {
      return { song: data[0] as unknown as SongLookup, error: null };
    }
  }

  const { data, error } = await adminSupabase
    .from('Song')
    .select(select)
    .eq('slug', songIdOrSlug)
    .limit(1);

  if (error) {
    return { song: null, error };
  }

  if (!data?.[0] && idLookupError) {
    return { song: null, error: idLookupError };
  }

  return { song: (data?.[0] as unknown as SongLookup | undefined) ?? null, error: null };
}

export const POST = withAuthApiProtection(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await getClerkSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const userId = session.user.id;

    const { song, error: songError } = await findSongByIdOrSlug(id, 'id, title, slug');

    if (songError) {
      throw songError;
    }

    if (!song) {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      );
    }

    const songId = song.id;

    // Verificar se já tem star
    const { data: existingStars, error: starError } = await adminSupabase
      .from('Star')
      .select('userId')
      .eq('userId', userId)
      .eq('songId', songId)
      .limit(1);

    if (starError) {
      throw starError;
    }

    if (existingStars && existingStars.length > 0) {
      return NextResponse.json(
        { error: 'Song already starred' },
        { status: 400 }
      );
    }

    // Criar star
    const { error: createError } = await adminSupabase
      .from('Star')
      .insert({
        userId,
        songId
      });

    if (createError) {
      console.error('Error creating star:', createError);
      throw createError;
    }

    await logSongStarred({
      song_id: song.id,
      details: {
        song_title: song.title,
        song_slug: song.slug,
        user_id: userId
      }
    });
    await logUserAction('song.starred', { song_id: song.id, song_title: song.title, song_slug: song.slug });

    // Retornar contagem atualizada
    const { count: starCount } = await adminSupabase
      .from('Star')
      .select('*', { count: 'exact', head: true })
      .eq('songId', songId);

    return NextResponse.json({
      success: true,
      starred: true,
      starCount: starCount || 0
    });

  } catch (error) {
    console.error('Error starring song:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const DELETE = withAuthApiProtection(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await getClerkSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const userId = session.user.id;

    const { song, error: songError } = await findSongByIdOrSlug(id, 'id, title, slug');

    if (songError) {
      throw songError;
    }

    if (!song) {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      );
    }

    const songId = song.id;

    // Remover star
    const { error: deleteError } = await adminSupabase
      .from('Star')
      .delete()
      .eq('userId', userId)
      .eq('songId', songId);

    if (deleteError) {
      console.error('Error removing star:', deleteError);
      throw deleteError;
    }

    await logUserAction('song.unstarred', { song_id: song.id, song_title: song.title, song_slug: song.slug });

    // Retornar contagem atualizada
    const { count: starCount } = await adminSupabase
      .from('Star')
      .select('*', { count: 'exact', head: true })
      .eq('songId', songId);

    return NextResponse.json({
      success: true,
      starred: false,
      starCount: starCount || 0
    });

  } catch (error) {
    console.error('Error unstarring song:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const GET = withApiProtection(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await getClerkSession();
    const { id } = await params;

    const { song, error: songError } = await findSongByIdOrSlug(id, 'id');

    if (songError) {
      throw songError;
    }

    if (!song) {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      );
    }

    const songId = song.id;

    // Contagem total de stars
    const { count: starCount } = await adminSupabase
      .from('Star')
      .select('*', { count: 'exact', head: true })
      .eq('songId', songId);

    // Verificar se o usuário atual deu star (se logado)
    let isStarred = false;
    if (session?.user?.id) {
      const { data: userStars } = await adminSupabase
        .from('Star')
        .select('userId')
        .eq('userId', session.user.id)
        .eq('songId', songId)
        .limit(1);

      isStarred = !!(userStars && userStars.length > 0);
    }

    return NextResponse.json({
      starCount: starCount || 0,
      isStarred
    });

  } catch (error) {
    console.error('Error getting star status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
