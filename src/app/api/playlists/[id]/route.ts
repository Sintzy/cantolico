import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logApiRequestError, logUnauthorizedAccess, logForbiddenAccess, toErrorContext, logPlaylistUpdated } from '@/lib/logging-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const playlistId = id;

    // Buscar playlist básica primeiro
    const { data: playlist, error: playlistError } = await supabase
      .from('Playlist')
      .select(`
        id,
        name,
        description,
        isPublic,
        visibility,
        userId,
        createdAt,
        updatedAt
      `)
      .eq('id', playlistId)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    // Verificar permissões
  const isOwner = session?.user?.id === playlist.userId;
  const isAdmin = session?.user?.role === 'ADMIN';
    const visibility = playlist.visibility || (playlist.isPublic ? 'PUBLIC' : 'PRIVATE');
    const isAccessible = visibility === 'PUBLIC' || visibility === 'NOT_LISTED';

    // Para playlists privadas, verificar se é proprietário ou membro aceito
  if (visibility === 'PRIVATE' && !isOwner && !isAdmin) {
      // Verificar se o usuário é um membro aceito da playlist
      const { data: memberAccess } = await supabase
        .from('PlaylistMember')
        .select('status')
        .eq('playlistId', playlistId)
        .eq('userEmail', session?.user?.email)
        .eq('status', 'ACCEPTED')
        .single();

      if (!memberAccess) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
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
    let userStarredIds = new Set<string>();

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

      // Flag songs already starred by the current user to avoid client-side lookups
      if (session?.user?.id) {
        const { data: userStars } = await supabase
          .from('Star')
          .select('songId')
          .eq('userId', session.user.id)
          .in('songId', songIds);

        (userStars || []).forEach(star => userStarredIds.add(star.songId));
      }
    }

    // Get playlist members if user is owner or member
  let membersData: any[] = [];
  if (isOwner || isAdmin || (visibility === 'PRIVATE' && session?.user?.email)) {
      const { data: members } = await supabase
        .from('PlaylistMember')
        .select(`
          id,
          userEmail,
          role,
          status,
          invitedAt,
          acceptedAt
        `)
        .eq('playlistId', playlistId)
        .order('invitedAt', { ascending: false });
      
      membersData = members || [];
    }

    // Reformatar dados para manter compatibilidade
    const formattedPlaylist = {
      ...playlist,
      user: user || null,
      members: isOwner ? membersData : undefined, // Only include if owner
      items: (playlistItems || []).map(item => {
        const song = songsData.find(s => s.id === item.songId);
        const addedBy = usersData.find(u => u.id === item.addedById);
        
        return {
          ...item,
          song: song ? {
            ...song,
            _count: {
              stars: starCounts[item.songId] || 0
            },
            starCount: starCounts[item.songId] || 0,
            isStarred: userStarredIds.has(item.songId),
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
    const { name, description, isPublic, visibility } = body;

    // Obter informações de IP e User-Agent para logs
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Verificar se é o dono da playlist
    const { data: playlist, error: checkError } = await supabase
      .from('Playlist')
      .select('userId, name, description, isPublic, visibility')
      .eq('id', playlistId)
      .single();

    if (checkError || !playlist) {
      await logApiRequestError({
        method: request.method,
        url: request.url,
        path: `/api/playlists/${playlistId}`,
        status_code: 404,
        user: { user_id: session.user.id, user_email: session.user.email || undefined },
        error: toErrorContext(null),
        details: { playlistId, action: 'playlist_edit_not_found', entity: 'playlist' }
      });
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

  if (playlist.userId !== session.user.id && session.user.role !== 'ADMIN') {
      await logForbiddenAccess({
        event_type: 'forbidden_access',
        resource: `/api/playlists/${playlistId}`,
        user: { user_id: session.user.id, user_email: session.user.email || undefined, user_role: session.user.role },
        network: { ip_address: ip, user_agent: userAgent || undefined },
        details: { playlistId, playlistOwnerId: playlist.userId, action: 'playlist_edit_unauthorized' }
      });
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Determinar visibilidade final
    const finalVisibility = visibility || (isPublic !== undefined ? (isPublic ? 'PUBLIC' : 'PRIVATE') : playlist.visibility || 'PRIVATE');
    const finalIsPublic = finalVisibility === 'PUBLIC';

    // Criar objeto com as mudanças
    const changes = {
      name: playlist.name !== name ? { from: playlist.name, to: name } : null,
      description: playlist.description !== description ? { from: playlist.description, to: description } : null,
      visibility: playlist.visibility !== finalVisibility ? { from: playlist.visibility, to: finalVisibility } : null,
      isPublic: playlist.isPublic !== finalIsPublic ? { from: playlist.isPublic, to: finalIsPublic } : null
    };

    // Filtrar apenas mudanças válidas
    const actualChanges = Object.fromEntries(
      Object.entries(changes).filter(([_, value]) => value !== null)
    );

    await logApiRequestError({
      method: request.method,
      url: request.url,
      path: `/api/playlists/${playlistId}`,
      status_code: 200,
      user: { user_id: session.user.id, user_email: session.user.email || undefined },
      network: { ip_address: ip, user_agent: userAgent || undefined },
      error: toErrorContext(null),
      details: { playlistId, changes: actualChanges, action: 'playlist_edit_attempt' }
    });

    if (!name?.trim()) {
      await logApiRequestError({
          method: request.method,
          url: request.url,
          path: `/api/playlists/${playlistId}`,
          status_code: 400,
          user: { user_id: session.user.id, user_email: session.user.email || undefined },
          error: toErrorContext(null),
          details: { playlistId, action: 'playlist_edit_no_name' }
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
        visibility: finalVisibility,
        isPublic: finalIsPublic
      })
      .eq('id', playlistId)
      .select(`
        id,
        name,
        description,
        visibility,
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
      logApiRequestError({
        method: request.method,
        url: request.url,
        path: `/api/playlists/${playlistId}`,
        status_code: 500,
        user: { user_id: session.user.id, user_email: session.user.email || undefined },
        error: toErrorContext(updateError),
        details: { playlistId, action: 'playlist_edit_error', error: updateError?.message }
      });
      throw new Error(`Supabase error: ${updateError?.message}`);
    }

    // Log de sucesso
    logApiRequestError({
      method: request.method,
      url: request.url,
      path: `/api/playlists/${playlistId}`,
      status_code: 200,
      user: { user_id: session.user.id, user_email: session.user.email || undefined },
      network: { ip_address: ip, user_agent: userAgent || undefined },
      error: toErrorContext(null),
      details: { playlistId: updatedPlaylist.id, playlistName: updatedPlaylist.name, changes: actualChanges, action: 'playlist_updated' }
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
      await logApiRequestError({
        method: request.method,
        url: request.url,
        path: `/api/playlists/${playlistId}`,
        status_code: 404,
        user: { user_id: session.user.id, user_email: session.user.email || undefined },
        error: toErrorContext(null),
        details: { playlistId, action: 'playlist_delete_not_found', entity: 'playlist' }
      });
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

  if (playlist.userId !== session.user.id && session.user.role !== 'ADMIN') {
      await logForbiddenAccess({
        event_type: 'forbidden_access',
        resource: `/api/playlists/${playlistId}`,
        user: { user_id: session.user.id, user_email: session.user.email || undefined, user_role: session.user.role },
        network: { ip_address: ip, user_agent: userAgent || undefined },
        details: { playlistId, playlistOwnerId: playlist.userId, action: 'playlist_delete_unauthorized' }
      });
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    await logApiRequestError({
      method: request.method,
      url: request.url,
      path: `/api/playlists/${playlistId}`,
      status_code: 200,
      user: { user_id: session.user.id, user_email: session.user.email || undefined },
      network: { ip_address: ip, user_agent: userAgent || undefined },
      error: toErrorContext(null),
      details: { playlistId, playlistName: playlist.name, action: 'playlist_delete_attempt' }
    });

    const { error: deleteError } = await supabase
      .from('Playlist')
      .delete()
      .eq('id', playlistId);

    if (deleteError) {
      await logApiRequestError({
        method: request.method,
        url: request.url,
        path: `/api/playlists/${playlistId}`,
        status_code: 500,
        user: { user_id: session.user.id, user_email: session.user.email || undefined },
        error: toErrorContext(deleteError),
        details: { playlistId, playlistName: playlist.name, error: deleteError.message, action: 'playlist_delete_error' }
      });
      throw new Error(`Supabase error: ${deleteError.message}`);
    }

    // Log de sucesso
    await logApiRequestError({
      method: request.method,
      url: request.url,
      path: `/api/playlists/${playlistId}`,
      status_code: 200,
      user: { user_id: session.user.id, user_email: session.user.email || undefined },
      network: { ip_address: ip, user_agent: userAgent || undefined },
      error: toErrorContext(null),
      details: { playlistId, playlistName: playlist.name, action: 'playlist_deleted' }
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const playlistId = id;
    const body = await request.json();

    const {
      name,
      description,
      isPublic,
      isPrivate,
      isNotListed
    } = body;

    // Validar dados
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome da playlist é obrigatório' },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Nome da playlist deve ter no máximo 100 caracteres' },
        { status: 400 }
      );
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        { error: 'Descrição deve ter no máximo 500 caracteres' },
        { status: 400 }
      );
    }

    // Verificar se a playlist existe e se o usuário é o dono
    const { data: playlist, error: checkError } = await supabase
      .from('Playlist')
      .select('userId, name')
      .eq('id', playlistId)
      .single();

    if (checkError || !playlist) {
      return NextResponse.json(
        { error: 'Playlist não encontrada' },
        { status: 404 }
      );
    }

    if (playlist.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Sem permissão para editar esta playlist' },
        { status: 403 }
      );
    }

    // Determinar visibilidade
    let visibility = 'PRIVATE';
    if (isPublic) {
      visibility = 'PUBLIC';
    } else if (isNotListed) {
      visibility = 'NOT_LISTED';
    }

    // Atualizar playlist
    const { data: updatedPlaylist, error: updateError } = await supabase
      .from('Playlist')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        isPublic: isPublic || false,
        visibility: visibility,
        updatedAt: new Date().toISOString()
      })
      .eq('id', playlistId)
      .select(`
        id,
        name,
        description,
        isPublic,
        visibility,
        userId,
        createdAt,
        updatedAt
      `)
      .single();

    if (updateError) {
      console.error('Error updating playlist:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar playlist' },
        { status: 500 }
      );
    }

    // Log da atualização
    logPlaylistUpdated({
      playlist_id: playlistId,
      name: updatedPlaylist.name,
      user: { user_id: session.user.id, user_email: session.user.email || undefined },
      details: {
        visibility: updatedPlaylist.visibility,
        action: 'playlist_updated',
        entity: 'playlist'
      }
    });

    return NextResponse.json(updatedPlaylist);

  } catch (error) {
    console.error('Error updating playlist:', error);
    logApiRequestError({
      method: 'PATCH',
      url: '',
      path: '/api/playlists/[id]',
      status_code: 500,
      error: toErrorContext(error),
      details: { action: 'playlist_update_error' }
    });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
