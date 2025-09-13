import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    // Buscar playlists com dados do criador
    let playlistsQuery = supabase
      .from('Playlist')
      .select(`
        id,
        name,
        description,
        isPublic,
        createdAt,
        updatedAt,
        createdBy,
        creator:User!Playlist_createdBy_fkey(
          id,
          name,
          email,
          image
        )
      `)
      .range(offset, offset + limit - 1)
      .order('createdAt', { ascending: false });

    // Apply search filter
    if (search) {
      playlistsQuery = playlistsQuery.ilike('name', `%${search}%`);
    }

    const { data: playlists, error: playlistsError } = await playlistsQuery;

    if (playlistsError) {
      console.error('Error fetching playlists:', playlistsError);
      return NextResponse.json({ error: 'Erro ao carregar playlists' }, { status: 500 });
    }

    // Para cada playlist, buscar contagem de músicas
    const playlistsWithData = await Promise.all(
      (playlists || []).map(async (playlist: any) => {
        const { count: songCount } = await supabase
          .from('PlaylistSong')
          .select('id', { count: 'exact', head: true })
          .eq('playlistId', playlist.id);

        return {
          ...playlist,
          songCount: songCount || 0
        };
      })
    );

    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('Playlist')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting playlists:', countError);
    }

    const totalPages = Math.ceil((totalCount || 0) / limit);

    return NextResponse.json({
      playlists: playlistsWithData,
      totalCount: totalCount || 0,
      totalPages,
      currentPage: page
    });

  } catch (error) {
    console.error('Error in admin playlists API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const { playlistId } = body;

    if (!playlistId) {
      return NextResponse.json({ error: 'ID da playlist é obrigatório' }, { status: 400 });
    }

    // Delete playlist (cascade will handle playlist songs)
    const { error } = await supabase
      .from('Playlist')
      .delete()
      .eq('id', playlistId);

    if (error) {
      console.error('Error deleting playlist:', error);
      return NextResponse.json({ error: 'Erro ao eliminar playlist' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
