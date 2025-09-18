import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { withApiProtection, withAuthApiProtection } from '@/lib/api-middleware';
import { randomUUID } from 'crypto';

export const GET = withApiProtection(async (request: NextRequest) => {
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

export const POST = withAuthApiProtection(async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, isPublic } = body;

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
      throw new Error(`Supabase error: ${error.message}`);
    }

    // Reformatar dados para manter compatibilidade
    const formattedPlaylist = {
      ...playlist,
      user: playlist.User || null,
      _count: {
        items: 0
      }
    };

    return NextResponse.json(formattedPlaylist, { status: 201 });

  } catch (error) {
    console.error('Error creating playlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
