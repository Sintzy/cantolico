import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase-admin';
import { withAuthApiProtection, withApiProtection, getClerkSession } from '@/lib/api-middleware';
import { logSongStarred } from '@/lib/logging-helpers';

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
    const songIdOrSlug = id;
    const userId = session.user.id;

    // Buscar música por ID ou slug
    const { data: songs, error: songError } = await adminSupabase
      .from('Song')
      .select('id, title, slug')
      .or(`id.eq.${songIdOrSlug},slug.eq.${songIdOrSlug}`)
      .limit(1);

    if (songError || !songs || songs.length === 0) {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      );
    }

    const song = songs[0];
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
    const songIdOrSlug = id;
    const userId = session.user.id;

    // Buscar música por ID ou slug
    const { data: songs, error: songError } = await adminSupabase
      .from('Song')
      .select('id, title, slug')
      .or(`id.eq.${songIdOrSlug},slug.eq.${songIdOrSlug}`)
      .limit(1);

    if (songError || !songs || songs.length === 0) {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      );
    }

    const song = songs[0];
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
    const songIdOrSlug = id;

    // Buscar música por ID ou slug
    const { data: songs, error: songError } = await adminSupabase
      .from('Song')
      .select('id')
      .or(`id.eq.${songIdOrSlug},slug.eq.${songIdOrSlug}`)
      .limit(1);

    if (songError || !songs || songs.length === 0) {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      );
    }

    const songId = songs[0].id;

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
