import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logGeneral, logErrors } from '@/lib/logs';

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

    // Obter informações de IP e User-Agent para logs
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Verificar se é o dono da playlist
    const { data: playlist, error: checkError } = await supabase
      .from('Playlist')
      .select('userId, name, description, isPublic')
      .eq('id', playlistId)
      .single();

    if (checkError || !playlist) {
      await logGeneral('WARN', 'Tentativa de editar playlist inexistente', 'Utilizador tentou editar playlist que não existe', {
        userId: session.user.id,
        userEmail: session.user.email,
        playlistId,
        action: 'playlist_edit_not_found',
        entity: 'playlist'
      });
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    if (playlist.userId !== session.user.id) {
      await logGeneral('WARN', 'Tentativa de editar playlist sem permissão', 'Utilizador tentou editar playlist de outro utilizador', {
        userId: session.user.id,
        userEmail: session.user.email,
        playlistId,
        playlistOwnerId: playlist.userId,
        action: 'playlist_edit_unauthorized',
        entity: 'playlist'
      });
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Criar objeto com as mudanças
    const changes = {
      name: playlist.name !== name ? { from: playlist.name, to: name } : null,
      description: playlist.description !== description ? { from: playlist.description, to: description } : null,
      isPublic: playlist.isPublic !== !!isPublic ? { from: playlist.isPublic, to: !!isPublic } : null
    };

    // Filtrar apenas mudanças válidas
    const actualChanges = Object.fromEntries(
      Object.entries(changes).filter(([_, value]) => value !== null)
    );

    await logGeneral('INFO', 'Edição de playlist iniciada', 'Utilizador iniciou edição de playlist', {
      userId: session.user.id,
      userEmail: session.user.email,
      playlistId,
      changes: actualChanges,
      ipAddress: ip,
      userAgent: userAgent,
      action: 'playlist_edit_attempt',
      entity: 'playlist'
    });

    if (!name?.trim()) {
      await logGeneral('WARN', 'Tentativa de editar playlist sem nome', 'Nome da playlist é obrigatório mas não foi fornecido', {
        userId: session.user.id,
        userEmail: session.user.email,
        playlistId,
        action: 'playlist_edit_no_name',
        entity: 'playlist'
      });
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
      await logErrors('ERROR', 'Erro ao editar playlist', 'Erro na base de dados ao editar playlist', {
        userId: session.user.id,
        userEmail: session.user.email,
        playlistId,
        error: updateError?.message,
        action: 'playlist_edit_error'
      });
      throw new Error(`Supabase error: ${updateError?.message}`);
    }

    // Log de sucesso
    await logGeneral('SUCCESS', 'Playlist editada com sucesso', 'Playlist foi editada pelo utilizador', {
      userId: session.user.id,
      userEmail: session.user.email,
      playlistId: updatedPlaylist.id,
      playlistName: updatedPlaylist.name,
      changes: actualChanges,
      wasPublic: changes.isPublic?.from,
      isNowPublic: updatedPlaylist.isPublic,
      ipAddress: ip,
      userAgent: userAgent,
      action: 'playlist_updated',
      entity: 'playlist'
    });

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

    // Obter informações de IP e User-Agent para logs
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Verificar se é o dono da playlist
    const { data: playlist, error: checkError } = await supabase
      .from('Playlist')
      .select('userId, name, isPublic')
      .eq('id', playlistId)
      .single();

    if (checkError || !playlist) {
      await logGeneral('WARN', 'Tentativa de eliminar playlist inexistente', 'Utilizador tentou eliminar playlist que não existe', {
        userId: session.user.id,
        userEmail: session.user.email,
        playlistId,
        action: 'playlist_delete_not_found',
        entity: 'playlist'
      });
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    if (playlist.userId !== session.user.id) {
      await logGeneral('WARN', 'Tentativa de eliminar playlist sem permissão', 'Utilizador tentou eliminar playlist de outro utilizador', {
        userId: session.user.id,
        userEmail: session.user.email,
        playlistId,
        playlistOwnerId: playlist.userId,
        action: 'playlist_delete_unauthorized',
        entity: 'playlist'
      });
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    await logGeneral('INFO', 'Eliminação de playlist iniciada', 'Utilizador iniciou eliminação de playlist', {
      userId: session.user.id,
      userEmail: session.user.email,
      playlistId,
      playlistName: playlist.name,
      wasPublic: playlist.isPublic,
      ipAddress: ip,
      userAgent: userAgent,
      action: 'playlist_delete_attempt',
      entity: 'playlist'
    });

    const { error: deleteError } = await supabase
      .from('Playlist')
      .delete()
      .eq('id', playlistId);

    if (deleteError) {
      await logErrors('ERROR', 'Erro ao eliminar playlist', 'Erro na base de dados ao eliminar playlist', {
        userId: session.user.id,
        userEmail: session.user.email,
        playlistId,
        playlistName: playlist.name,
        error: deleteError.message,
        action: 'playlist_delete_error'
      });
      throw new Error(`Supabase error: ${deleteError.message}`);
    }

    // Log de sucesso
    await logGeneral('SUCCESS', 'Playlist eliminada com sucesso', 'Playlist foi eliminada pelo utilizador', {
      userId: session.user.id,
      userEmail: session.user.email,
      playlistId,
      playlistName: playlist.name,
      wasPublic: playlist.isPublic,
      ipAddress: ip,
      userAgent: userAgent,
      action: 'playlist_deleted',
      entity: 'playlist'
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
