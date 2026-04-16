import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getClerkSession } from '@/lib/api-middleware';
import { withUserProtection, withPublicMonitoring, logPlaylistAction } from '@/lib/enhanced-api-protection';
import { randomUUID } from 'crypto';
import { requireEmailVerification } from '@/lib/email';
import { getVisibilityFlags, getVisibilityFromPlaylist } from '@/types/playlist';
import { extractUserContext, logUserCreate, logUserRead } from '@/lib/user-action-logger';

export const GET = withPublicMonitoring<any>(async (request: NextRequest) => {
  try {
    const session = await getClerkSession();
    const userContext = extractUserContext(request, session);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const includePublic = searchParams.get('includePublic') === 'true';

    // Log read action
    logUserRead(userContext, {
      action: 'list_playlists',
      resource: 'playlist',
      method: request.method,
      path: request.url,
      metadata: { userId, includePublic },
    });

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
        PlaylistItem(id)
      `)
      .order('updatedAt', { ascending: false });

    if (userId) {
      query = query.eq('userId', parseInt(userId));
      if (!session || session.user.id !== parseInt(userId)) {
        query = query.in('visibility', ['PUBLIC', 'NOT_LISTED']);
      }
    } else if (session?.user?.id) {
      query = query.eq('userId', session.user.id);
    } else if (includePublic) {
      query = query.in('visibility', ['PUBLIC', 'NOT_LISTED']);
    } else {
      return NextResponse.json([]);
    }

    const { data: playlists, error } = await query;

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    const formattedPlaylists = (playlists || []).map(playlist => {
      const visibility = playlist.visibility || getVisibilityFromPlaylist({ isPublic: playlist.isPublic });
      return {
        ...playlist,
        isPrivate: visibility === 'PRIVATE',
        isNotListed: visibility === 'NOT_LISTED',
        user: playlist.User || null,
        items: [],
        members: [],
        _count: {
          items: playlist.PlaylistItem ? playlist.PlaylistItem.length : 0,
          members: 0
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
  const userContext = extractUserContext(request, session);
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

  console.log(`Creating playlist: ${name} (visibility: ${visibility})`);

    if (!name?.trim()) {
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
      console.error('Error creating playlist:', error);
      throw new Error(`Supabase error: ${error.message}`);
    }

    // Log playlist creation
    logUserCreate(userContext, {
      action: 'create_playlist',
      resource: 'playlist',
      resourceId: playlist.id,
      method: request.method,
      path: request.url,
      newValue: {
        id: playlist.id,
        name: playlist.name,
        visibility,
      },
      metadata: {
        memberEmails: memberEmails.length > 0 ? memberEmails : undefined,
      },
    });

    console.log(`✅ Playlist created: ${playlist.id} (${playlist.name})`);

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

    // Remoção de logs desnecessários
    console.log(`✅ Bulk delete successful: ${userPlaylists.length} playlists deleted`);

    return NextResponse.json({ 
      success: true, 
      deletedCount: userPlaylists.length,
      message: `${userPlaylists.length} playlists eliminadas com sucesso`
    });

  } catch (error) {
    console.error('Error in bulk delete:', error);
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, {
  logAction: 'playlists_bulk_delete',
  actionDescription: 'Eliminação em massa de playlists'
});
