import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { withUserProtection, withPublicMonitoring, logPlaylistAction } from '@/lib/enhanced-api-protection';
import { randomUUID } from 'crypto';
import { logGeneral, logErrors } from '@/lib/logs';
import { requireEmailVerification } from '@/lib/email';
import { getVisibilityFlags, getVisibilityFromPlaylist } from '@/types/playlist';

export const GET = withPublicMonitoring<any>(async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const includePublic = searchParams.get('includePublic') === 'true';

    let whereClause: any = {};

    if (userId) {
      // Se especificou userId, buscar playlists desse usuário
      whereClause.userId = parseInt(userId);
      
      // Se não é o próprio usuário, só mostrar públicas e não listadas
      if (!session || session.user.id !== parseInt(userId)) {
        // Use visibility filter instead of isPublic
        // We'll handle this in the query filter
      }
    } else if (session?.user?.id) {
      // Se logado mas não especificou userId, buscar próprias playlists
      whereClause.userId = session.user.id;
    } else if (includePublic) {
      // Se não logado mas quer ver públicas e não listadas
      // We'll handle this in the query filter
    } else {
      return NextResponse.json([]);
    }

    let query = supabase
      .from('Playlist')
      .select(`
        id,
        name,
        description,
        isPublic,
        visibility,
        userId,
        createdAt,
        updatedAt,
        User!Playlist_userId_fkey (
          id,
          name,
          email,
          image
        ),
        PlaylistItem (
          id,
          order,
          Song!PlaylistItem_songId_fkey (
            id,
            title,
            slug
          )
        )
      `)
      .order('updatedAt', { ascending: false });

    if (userId) {
      // Se especificou userId, buscar playlists desse usuário
      query = query.eq('userId', parseInt(userId));
      
      // Se não é o próprio usuário, só mostrar públicas e não listadas
      if (!session || session.user.id !== parseInt(userId)) {
        query = query.in('visibility', ['PUBLIC', 'NOT_LISTED']);
      }
    } else if (session?.user?.id) {
      // Se logado mas não especificou userId, buscar próprias playlists
      query = query.eq('userId', session.user.id);
    } else if (includePublic) {
      // Se não logado mas quer ver públicas e não listadas
      query = query.in('visibility', ['PUBLIC', 'NOT_LISTED']);
    } else {
      return NextResponse.json([]);
    }

    const { data: playlists, error } = await query;

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    // Reformatar dados para manter compatibilidade
    const formattedPlaylists = (playlists || []).map(playlist => {
      const visibility = playlist.visibility || getVisibilityFromPlaylist({ isPublic: playlist.isPublic });
      return {
        ...playlist,
        // Add calculated visibility properties for backward compatibility
        isPrivate: visibility === 'PRIVATE',
        isNotListed: visibility === 'NOT_LISTED',
        user: playlist.User || null,
        items: (playlist.PlaylistItem || [])
          .sort((a, b) => a.order - b.order)
          .map(item => ({
            ...item,
            song: item.Song || null
          })),
        members: [], // Por enquanto vazio até resolver a relação
        _count: {
          items: (playlist.PlaylistItem || []).length,
          members: 0 // Por enquanto 0 até resolver a relação
        }
      };
    });

    return NextResponse.json(formattedPlaylists);

  } catch (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const POST = withUserProtection<any>(async (request: NextRequest, session: any) => {
  const body = await request.json();
  const { name, description, visibility = 'PRIVATE', memberEmails = [] }: {
    name: string;
    description?: string;
    visibility?: 'PUBLIC' | 'PRIVATE' | 'NOT_LISTED';
    memberEmails?: string[];
  } = body;

  // Verificar se email está verificado
  const emailVerificationResult = await requireEmailVerification(session.user.id);
  if (!emailVerificationResult.success) {
    return NextResponse.json(
      { error: emailVerificationResult.error },
      { status: 403 }
    );
  }

  // Obter informações de IP e User-Agent para logs
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

    await logGeneral('INFO', 'Criação de playlist iniciada', 'Utilizador iniciou criação de nova playlist', {
      userId: session.user.id,
      userEmail: session.user.email,
      playlistName: name,
      visibility: visibility,
      hasDescription: !!description?.trim(),
      ipAddress: ip,
      userAgent: userAgent,
      action: 'playlist_create_attempt',
      entity: 'playlist'
    });

    if (!name?.trim()) {
      await logGeneral('WARN', 'Tentativa de criar playlist sem nome', 'Nome da playlist é obrigatório mas não foi fornecido', {
        userId: session.user.id,
        userEmail: session.user.email,
        action: 'playlist_create_no_name',
        entity: 'playlist'
      });
      return NextResponse.json(
        { error: 'Nome da playlist é obrigatório' },
        { status: 400 }
      );
    }

    const playlistId = randomUUID();
    const { data: playlist, error } = await supabase
      .from('Playlist')
      .insert({
        id: playlistId,
        name: name.trim(),
        description: description?.trim() || null,
        isPublic: getVisibilityFlags(visibility).isPublic,
        visibility: visibility,
        userId: session.user.id
      })
      .select(`
        id,
        name,
        description,
        isPublic,
        visibility,
        userId,
        createdAt,
        updatedAt,
        User!Playlist_userId_fkey (
          id,
          name,
          email,
          image
        )
      `)
      .single();

    if (error) {
      await logErrors('ERROR', 'Erro ao criar playlist', 'Erro na base de dados ao criar playlist', {
        userId: session.user.id,
        userEmail: session.user.email,
        playlistName: name,
        error: error.message,
        action: 'playlist_create_error'
      });
      throw new Error(`Supabase error: ${error.message}`);
    }

    // Log de sucesso
    await logGeneral('SUCCESS', 'Playlist criada com sucesso', 'Nova playlist criada pelo utilizador', {
      userId: session.user.id,
      userEmail: session.user.email,
      playlistId: playlist.id,
      playlistName: playlist.name,
      visibility: getVisibilityFromPlaylist({ isPublic: playlist.isPublic }),
      hasDescription: !!playlist.description,
      ipAddress: ip,
      userAgent: userAgent,
      action: 'playlist_created',
      entity: 'playlist'
    });

    // Handle member invitations if provided
    if (memberEmails && memberEmails.length > 0) {
      const { sendEmail, createPlaylistInviteEmailTemplate } = await import('@/lib/email');
      const crypto = await import('crypto');
      
      const validEmails = memberEmails
        .filter((email: string) => email.trim() !== session.user.email); // Don't add creator as member

      for (const email of validEmails) {
        try {
          const inviteToken = crypto.randomBytes(32).toString('hex');
          
          // Create playlist member record
          const { data: invite, error: inviteError } = await supabase
            .from('PlaylistMember')
            .insert({
              playlistId: playlistId,
              userEmail: email.toLowerCase().trim(),
              role: 'EDITOR',
              status: 'PENDING',
              invitedBy: session.user.id,
              invitedAt: new Date().toISOString()
            })
            .select()
            .single();

          if (inviteError) {
            console.error(`Error creating invite for ${email}:`, inviteError);
            continue;
          }

          // Create token using member ID + random bytes (simpler approach)
          const emailToken = `${invite.id}-${crypto.randomBytes(16).toString('hex')}`;

          // Get invited user name
          const { data: invitedUser } = await supabase
            .from('User')
            .select('name')
            .eq('email', email.toLowerCase().trim())
            .single();

          const invitedUserName = invitedUser?.name || email;

          // Send invitation email
          const emailTemplate = createPlaylistInviteEmailTemplate(
            invitedUserName,
            playlist.name,
            playlist.description,
            session.user.name || 'Um utilizador',
            emailToken,
            playlistId.toString()
          );

          await sendEmail({
            to: email,
            subject: `🎵 Convite para colaborar na playlist "${playlist.name}"`,
            html: emailTemplate
          });

        } catch (error) {
          console.error(`Error processing invite for ${email}:`, error);
        }
      }
    }

    // Reformatar dados para manter compatibilidade
    const formattedPlaylist = {
      ...playlist,
    user: playlist.User || null,
    _count: {
      items: 0
    }
  };

  // Log da ação crítica de criação de playlist
  await logPlaylistAction(
    'create',
    playlist.id.toString(),
    playlist.name,
    session,
    request,
    {
      isPublic: playlist.isPublic,
      hasDescription: !!playlist.description
    }
  );

  return NextResponse.json(formattedPlaylist, { status: 201 });
}, {
  logAction: 'playlist_create',
  actionDescription: 'Criação de nova playlist'
});

export const DELETE = withUserProtection<any>(async (request: NextRequest, session: any) => {
  const { searchParams } = new URL(request.url);
  const deleteAll = searchParams.get('deleteAll') === 'true';

  if (!deleteAll) {
    return NextResponse.json({ error: 'Missing deleteAll parameter' }, { status: 400 });
  }

  try {
    // Primeiro, buscar todas as playlists do usuário
    const { data: userPlaylists, error: fetchError } = await supabase
      .from('Playlist')
      .select('id, name')
      .eq('userId', session.user.id);

    if (fetchError) {
      console.error('Error fetching user playlists:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 });
    }

    if (!userPlaylists || userPlaylists.length === 0) {
      return NextResponse.json({ 
        success: true, 
        deletedCount: 0,
        message: 'Nenhuma playlist encontrada para eliminar'
      });
    }

    const playlistIds = userPlaylists.map(p => p.id);

    // Deletar todos os itens das playlists
    const { error: itemsError } = await supabase
      .from('PlaylistItem')
      .delete()
      .in('playlistId', playlistIds);

    if (itemsError) {
      console.error('Error deleting playlist items:', itemsError);
      return NextResponse.json({ error: 'Failed to delete playlist items' }, { status: 500 });
    }

    // Deletar todos os membros das playlists (ignorar erro se tabela não existir)
    try {
      await supabase
        .from('PlaylistMember')
        .delete()
        .in('playlistId', playlistIds);
    } catch (error) {
      console.warn('Warning deleting playlist members:', error);
    }

    // Finalmente, deletar todas as playlists
    const { error: playlistsError } = await supabase
      .from('Playlist')
      .delete()
      .eq('userId', session.user.id);

    if (playlistsError) {
      console.error('Error deleting playlists:', playlistsError);
      return NextResponse.json({ error: 'Failed to delete playlists' }, { status: 500 });
    }

    // Log da ação
    await logGeneral('INFO', 'Playlists eliminadas em massa', 'Utilizador eliminou todas as suas playlists', {
      userId: session.user.id,
      userEmail: session.user.email,
      deletedCount: userPlaylists.length,
      deletedPlaylists: userPlaylists.map((p: any) => ({ id: p.id, name: p.name })),
      action: 'playlists_bulk_delete',
      entity: 'playlist'
    });

    return NextResponse.json({ 
      success: true, 
      deletedCount: userPlaylists.length,
      message: `${userPlaylists.length} playlists eliminadas com sucesso`
    });

  } catch (error) {
    console.error('Error in bulk delete:', error);
    await logErrors('ERROR', 'Erro ao eliminar playlists em massa', 'Erro na operação de eliminação em massa', {
      userId: session.user.id,
      userEmail: session.user.email,
      error: error instanceof Error ? error.message : 'Unknown error',
      action: 'playlists_bulk_delete_error'
    });
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, {
  logAction: 'playlists_bulk_delete',
  actionDescription: 'Eliminação em massa de playlists'
});
