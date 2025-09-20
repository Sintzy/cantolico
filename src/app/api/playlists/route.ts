import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { withUserProtection, withPublicMonitoring, logPlaylistAction } from '@/lib/enhanced-api-protection';
import { randomUUID } from 'crypto';
import { logGeneral, logErrors } from '@/lib/logs';

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
      
      // Se não é o próprio usuário, só mostrar públicas
      if (!session || session.user.id !== parseInt(userId)) {
        whereClause.isPublic = true;
      }
    } else if (session?.user?.id) {
      // Se logado mas não especificou userId, buscar próprias playlists
      whereClause.userId = session.user.id;
    } else if (includePublic) {
      // Se não logado mas quer ver públicas
      whereClause.isPublic = true;
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
        userId,
        createdAt,
        updatedAt,
        User!Playlist_userId_fkey (
          id,
          name,
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
      
      // Se não é o próprio usuário, só mostrar públicas
      if (!session || session.user.id !== parseInt(userId)) {
        query = query.eq('isPublic', true);
      }
    } else if (session?.user?.id) {
      // Se logado mas não especificou userId, buscar próprias playlists
      query = query.eq('userId', session.user.id);
    } else if (includePublic) {
      // Se não logado mas quer ver públicas
      query = query.eq('isPublic', true);
    } else {
      return NextResponse.json([]);
    }

    const { data: playlists, error } = await query;

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    // Reformatar dados para manter compatibilidade
    const formattedPlaylists = (playlists || []).map(playlist => ({
      ...playlist,
      user: playlist.User || null,
      items: (playlist.PlaylistItem || [])
        .sort((a, b) => a.order - b.order)
        .map(item => ({
          ...item,
          song: item.Song || null
        })),
      _count: {
        items: (playlist.PlaylistItem || []).length
      }
    }));

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
  const { name, description, isPublic } = body;

  // Obter informações de IP e User-Agent para logs
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

    await logGeneral('INFO', 'Criação de playlist iniciada', 'Utilizador iniciou criação de nova playlist', {
      userId: session.user.id,
      userEmail: session.user.email,
      playlistName: name,
      isPublic: !!isPublic,
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
        isPublic: !!isPublic,
        userId: session.user.id
      })
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
      isPublic: playlist.isPublic,
      hasDescription: !!playlist.description,
      ipAddress: ip,
      userAgent: userAgent,
      action: 'playlist_created',
      entity: 'playlist'
    });

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
