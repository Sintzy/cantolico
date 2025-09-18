import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const playlistId = id;

    console.log('Fetching playlist with ID:', playlistId);

    // Buscar playlist básica primeiro
    const { data: playlist, error: playlistError } = await supabase
      .from('Playlist')
      .select(`
        id,
        name,
        description,
        isPublic,
        userId,
        createdAt,
        updatedAt
      `)
      .eq('id', playlistId)
      .single();

    console.log('Playlist query result:', { playlist, playlistError });

    if (playlistError || !playlist) {
      console.log('Playlist not found:', playlistError);
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    // Verificar permissões
    const isOwner = session?.user?.id === playlist.userId;
    const isPublic = playlist.isPublic;

    if (!isPublic && !isOwner) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Buscar dados do usuário separadamente
    const { data: user } = await supabase
      .from('User')
      .select('id, name, image')
      .eq('id', playlist.userId)
      .single();

    // Buscar itens da playlist separadamente
    const { data: playlistItems } = await supabase
      .from('PlaylistItem')
      .select(`
        id,
        order,
        songId,
        addedById,
        createdAt
      `)
      .eq('playlistId', playlistId)
      .order('order', { ascending: true });

    // Buscar dados das músicas se houver itens
    let songsData: any[] = [];
    let usersData: any[] = [];
    let starCounts: { [key: string]: number } = {};

    if (playlistItems && playlistItems.length > 0) {
      const songIds = playlistItems.map(item => item.songId);
      const userIds = [...new Set(playlistItems.map(item => item.addedById))];

      // Buscar músicas
      const { data: songs } = await supabase
        .from('Song')
        .select(`
          id,
          title,
          slug,
          currentVersionId
        `)
        .in('id', songIds);

      if (songs) {
        songsData = songs;
        
        // Buscar versões das músicas
        const versionIds = songs.map(song => song.currentVersionId).filter(Boolean);
        if (versionIds.length > 0) {
          const { data: versions } = await supabase
            .from('SongVersion')
            .select(`
              id,
              versionNumber,
              sourceText,
              lyricsPlain,
              renderedHtml
            `)
            .in('id', versionIds);

          // Mapear versões para as músicas
          if (versions) {
            songsData = songsData.map(song => ({
              ...song,
              currentVersion: versions.find(v => v.id === song.currentVersionId) || null
            }));
          }
        }
      }

      // Buscar usuários que adicionaram as músicas
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('User')
          .select('id, name, image')
          .in('id', userIds);
        
        if (users) {
          usersData = users;
        }
      }

      // Buscar contagem de stars
      const { data: starData } = await supabase
        .from('Star')
        .select('songId')
        .in('songId', songIds);
      
      if (starData) {
        starData.forEach(star => {
          starCounts[star.songId] = (starCounts[star.songId] || 0) + 1;
        });
      }
    }

    // Reformatar dados para manter compatibilidade
    const formattedPlaylist = {
      ...playlist,
      user: user || null,
      items: (playlistItems || []).map(item => {
        const song = songsData.find(s => s.id === item.songId);
        const addedBy = usersData.find(u => u.id === item.addedById);
        
        return {
          ...item,
          song: song ? {
            ...song,
            _count: {
              stars: starCounts[item.songId] || 0
            }
          } : null, // Explicitly handle missing songs
          addedBy: addedBy || null
        };
      })
    };

    console.log('Returning formatted playlist:', formattedPlaylist.id);
    return NextResponse.json(formattedPlaylist);

  } catch (error) {
    console.error('Error fetching playlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const { name, description, isPublic } = body;

    // Verificar se é o dono da playlist
    const { data: playlist, error: checkError } = await supabase
      .from('Playlist')
      .select('userId')
      .eq('id', playlistId)
      .single();

    if (checkError || !playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    if (playlist.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Nome da playlist é obrigatório' },
        { status: 400 }
      );
    }

    const { data: updatedPlaylist, error: updateError } = await supabase
      .from('Playlist')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        isPublic: !!isPublic
      })
      .eq('id', playlistId)
      .select(`
        id,
        name,
        description,
        isPublic,
        userId,
        createdAt,
        updatedAt,
        User!Playlist_userId_fkey (
          id,
          name,
          image
        )
      `)
      .single();

    if (updateError || !updatedPlaylist) {
      throw new Error(`Supabase error: ${updateError?.message}`);
    }

    // Buscar contagem de itens
    const { count: itemCount } = await supabase
      .from('PlaylistItem')
      .select('*', { count: 'exact', head: true })
      .eq('playlistId', playlistId);

    // Reformatar dados para manter compatibilidade
    const formattedPlaylist = {
      ...updatedPlaylist,
      user: updatedPlaylist.User || null,
      _count: {
        items: itemCount || 0
      }
    };

    return NextResponse.json(formattedPlaylist);

  } catch (error) {
    console.error('Error updating playlist:', error);
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

    // Verificar se é o dono da playlist
    const { data: playlist, error: checkError } = await supabase
      .from('Playlist')
      .select('userId')
      .eq('id', playlistId)
      .single();

    if (checkError || !playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    if (playlist.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabase
      .from('Playlist')
      .delete()
      .eq('id', playlistId);

    if (deleteError) {
      throw new Error(`Supabase error: ${deleteError.message}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
