import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { withAuthApiProtection, withApiProtection } from '@/lib/api-middleware';

export const POST = withAuthApiProtection(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await getServerSession(authOptions);
    
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
    const { data: songs, error: songError } = await supabase
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

    // Verificar se já tem star
    const { data: existingStars, error: starError } = await supabase
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
    const { error: createError } = await supabase
      .from('Star')
      .insert({
        userId,
        songId
      });

    if (createError) {
      throw createError;
    }

    // Retornar contagem atualizada
    const { count: starCount, error: countError } = await supabase
      .from('Star')
      .select('*', { count: 'exact', head: true })
      .eq('songId', songId);

    if (countError) {
      throw countError;
    }

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
    const session = await getServerSession(authOptions);
    
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
    const { data: songs, error: songError } = await supabase
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

    // Remover star se existir
    const { error: deleteError } = await supabase
      .from('Star')
      .delete()
      .eq('userId', userId)
      .eq('songId', songId);

    if (deleteError) {
      throw deleteError;
    }

    // Retornar contagem atualizada
    const { count: starCount, error: countError } = await supabase
      .from('Star')
      .select('*', { count: 'exact', head: true })
      .eq('songId', songId);

    if (countError) {
      throw countError;
    }

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
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const songIdOrSlug = id;

    // Buscar música por ID ou slug
    const { data: songs, error: songError } = await supabase
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
    const { count: starCount, error: countError } = await supabase
      .from('Star')
      .select('*', { count: 'exact', head: true })
      .eq('songId', songId);

    if (countError) {
      throw countError;
    }

    // Verificar se o usuário atual deu star (se logado)
    let isStarred = false;
    if (session?.user?.id) {
      const userId = session.user.id;
      const { data: userStars, error: userStarError } = await supabase
        .from('Star')
        .select('userId')
        .eq('userId', userId)
        .eq('songId', songId)
        .limit(1);

      if (userStarError) {
        throw userStarError;
      }

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
