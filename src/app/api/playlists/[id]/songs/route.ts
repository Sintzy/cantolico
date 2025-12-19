import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { randomUUID } from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const playlistId = id;
    const body = await request.json();
    const { songId } = body;

    if (!songId) {
      return NextResponse.json(
        { error: 'Song ID is required' },
        { status: 400 }
      );
    }

    // Verificar se é o dono da playlist ou colaborador editor
    const { data: playlist, error: playlistError } = await supabase
      .from('Playlist')
      .select('userId')
      .eq('id', playlistId)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    // Verificar se é o dono
    const isOwner = playlist.userId === session.user.id;
    
    // Se não é o dono, verificar se é colaborador editor
    let isEditor = false;
    if (!isOwner) {
      const { data: membership } = await supabase
        .from('PlaylistMember')
        .select('role, status')
        .eq('playlistId', playlistId)
        .eq('userEmail', session.user.email)
        .eq('status', 'ACCEPTED')
        .eq('role', 'EDITOR')
        .single();

      isEditor = !!membership;
    }

    if (!isOwner && !isEditor) {
      return NextResponse.json(
        { error: 'Access denied. Only playlist owner or editors can add songs.' },
        { status: 403 }
      );
    }

    // Verificar se a música existe
    const { data: song, error: songError } = await supabase
      .from('Song')
      .select('id')
      .or(`id.eq.${songId},slug.eq.${songId}`)
      .single();

    if (songError || !song) {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      );
    }

    const actualSongId = song.id;

    // Verificar se a música já está na playlist
    const { data: existingItem } = await supabase
      .from('PlaylistItem')
      .select('id')
      .eq('playlistId', playlistId)
      .eq('songId', actualSongId)
      .single();

    if (existingItem) {
      return NextResponse.json(
        { error: 'Song already in playlist' },
        { status: 400 }
      );
    }

    // Obter próxima ordem
    const { data: lastItem } = await supabase
      .from('PlaylistItem')
      .select('order')
      .eq('playlistId', playlistId)
      .order('order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (lastItem?.order || 0) + 1;

    // Adicionar item à playlist
    const playlistItemId = randomUUID();
    
    const { data: playlistItem, error: createError } = await supabase
      .from('PlaylistItem')
      .insert({
        id: playlistItemId,
        playlistId,
        songId: actualSongId,
        order: nextOrder,
        addedById: session.user.id
      })
      .select()
      .single();

    if (createError || !playlistItem) {
      throw new Error(`Supabase error: ${createError?.message}`);
    }

    // Buscar detalhes da música separadamente
    const { data: songDetails, error: songDetailsError } = await supabase
      .from('Song')
      .select(`
        id,
        title,
        slug,
        currentVersionId
      `)
      .eq('id', actualSongId)
      .single();

    if (songDetailsError || !songDetails) {
      console.warn('Could not fetch song details:', songDetailsError);
    }

    // Buscar versão atual se existir
    let versionDetails = null;
    if (songDetails?.currentVersionId) {
      const { data: version } = await supabase
        .from('SongVersion')
        .select(`
          id,
          versionNumber,
          sourceText,
          lyricsPlain,
          renderedHtml
        `)
        .eq('id', songDetails.currentVersionId)
        .single();
      
      versionDetails = version;
    }

    // Buscar detalhes do usuário
    const { data: userDetails } = await supabase
      .from('User')
      .select('id, name, image')
      .eq('id', session.user.id)
      .single();

    // Montar resposta completa
    const completePlaylistItem = {
      ...playlistItem,
      Song: songDetails ? {
        ...songDetails,
        SongVersion: versionDetails ? [versionDetails] : []
      } : null,
      User: userDetails
    };

    // Buscar contagem de stars para a música
    const { count: starCount } = await supabase
      .from('Star')
      .select('songId', { count: 'exact', head: true })
      .eq('songId', actualSongId);

    let isStarred = false;
    if (session?.user?.id) {
      const { data: userStar } = await supabase
        .from('Star')
        .select('songId')
        .eq('songId', actualSongId)
        .eq('userId', session.user.id)
        .maybeSingle();
      isStarred = !!userStar;
    }

    // Reformatar dados para manter compatibilidade
    const formattedItem = {
      ...playlistItem,
      song: {
        ...songDetails,
        currentVersion: versionDetails || null,
        _count: {
          stars: starCount || 0
        },
        starCount: starCount || 0,
        isStarred,
      },
      addedBy: userDetails || null
    };

    return NextResponse.json(formattedItem, { status: 201 });

  } catch (error) {
    console.error('Error adding song to playlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const playlistId = id;
    const { searchParams } = new URL(request.url);
    const songIdOrSlug = searchParams.get('songId');

    if (!songIdOrSlug) {
      return NextResponse.json(
        { error: 'Song ID is required' },
        { status: 400 }
      );
    }

    // Buscar música por ID ou slug
    const { data: song, error: songError } = await supabase
      .from('Song')
      .select('id')
      .or(`id.eq.${songIdOrSlug},slug.eq.${songIdOrSlug}`)
      .single();

    if (songError || !song) {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      );
    }

    const songId = song.id;

    // Verificar se é o dono da playlist ou colaborador editor
    const { data: playlist, error: playlistError } = await supabase
      .from('Playlist')
      .select('userId')
      .eq('id', playlistId)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    // Verificar se é o dono
    const isOwner = playlist.userId === session.user.id;
    
    // Se não é o dono, verificar se é colaborador editor
    let isEditor = false;
    if (!isOwner) {
      const { data: membership } = await supabase
        .from('PlaylistMember')
        .select('role, status')
        .eq('playlistId', playlistId)
        .eq('userEmail', session.user.email)
        .eq('status', 'ACCEPTED')
        .eq('role', 'EDITOR')
        .single();

      isEditor = !!membership;
    }

    if (!isOwner && !isEditor) {
      return NextResponse.json(
        { error: 'Access denied. Only playlist owner or editors can remove songs.' },
        { status: 403 }
      );
    }

    // Remover item da playlist
    const { error: deleteError } = await supabase
      .from('PlaylistItem')
      .delete()
      .eq('playlistId', playlistId)
      .eq('songId', songId);

    if (deleteError) {
      throw new Error(`Supabase error: ${deleteError.message}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error removing song from playlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
