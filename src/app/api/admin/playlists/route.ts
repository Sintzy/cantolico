import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { adminSupabase } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    // Buscar playlists com dados do criador (usando adminSupabase para performance)
    let playlistsQuery = adminSupabase
      .from('Playlist')
      .select(`
        id,
        name,
        description,
        isPublic,
        createdAt,
        updatedAt,
        userId,
        user:User!Playlist_userId_fkey(
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

    // Bulk fetch song counts for all playlists to avoid N+1
    const playlistIds = (playlists || []).map((p: any) => p.id);
    const { data: songCounts } = await adminSupabase
      .from('PlaylistSong')
      .select('playlistId')
      .in('playlistId', playlistIds);

    // Count songs per playlist
    const countMap = new Map();
    songCounts?.forEach((ps: any) => {
      countMap.set(ps.playlistId, (countMap.get(ps.playlistId) || 0) + 1);
    });

    // Enrich playlists with counts
    const playlistsWithData = (playlists || []).map((playlist: any) => ({
      ...playlist,
      _count: { items: countMap.get(playlist.id) || 0 }
    }));

    // Get total count
    const { count: totalCount, error: countError } = await adminSupabase
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
    const { error: authError } = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const { playlistId } = body;

    if (!playlistId) {
      return NextResponse.json({ error: 'ID da playlist é obrigatório' }, { status: 400 });
    }

    // Delete playlist (cascade will handle playlist songs)
    const { error } = await adminSupabase
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
