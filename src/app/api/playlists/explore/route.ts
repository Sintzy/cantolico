import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    // Buscar playlists públicas
    const { data: playlists, error } = await supabase
      .from('Playlist')
      .select(`
        id,
        name,
        description,
        isPublic,
        userId,
        createdAt,
        updatedAt,
        User:userId (
          id,
          name,
          image
        )
      `)
      .eq('isPublic', true)
      .order('updatedAt', { ascending: false });

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    // Buscar contagem de músicas para cada playlist
    const playlistsWithCounts = await Promise.all(
      (playlists || []).map(async (playlist) => {
        const { count } = await supabase
          .from('PlaylistItem')
          .select('*', { count: 'exact', head: true })
          .eq('playlistId', playlist.id);

        return {
          ...playlist,
          songsCount: count || 0
        };
      })
    );

    return NextResponse.json(playlistsWithCounts);
  } catch (error) {
    console.error('Error fetching public playlists:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar playlists públicas' },
      { status: 500 }
    );
  }
}