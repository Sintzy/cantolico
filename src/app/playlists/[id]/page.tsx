import { notFound } from 'next/navigation';
import { adminSupabase } from '@/lib/supabase-admin';
import PlaylistPageClient from './page.client';

interface PlaylistPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PlaylistPage({ params }: PlaylistPageProps) {
  const { id } = await params;

  // Fetch playlist data on server
  try {
    const { data: playlist, error: playlistError } = await adminSupabase
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
      .eq('id', id)
      .single();

    if (playlistError || !playlist) {
      notFound();
    }

    // Fetch items with optimized queries
    const { data: playlistItems } = await adminSupabase
      .from('PlaylistItem')
      .select(`
        id,
        order,
        songId,
        note,
        createdAt
      `)
      .eq('playlistId', id)
      .order('order', { ascending: true });

    // Fetch only necessary song data
    let songsData: any[] = [];
    if (playlistItems && playlistItems.length > 0) {
      const songIds = playlistItems.map(item => item.songId);

      const { data: songs } = await adminSupabase
        .from('Song')
        .select(`
          id,
          title,
          slug,
          tags
        `)
        .in('id', songIds);

      if (songs) {
        songsData = songs;
      }
    }

    // Format items
    const items = (playlistItems || []).map(item => {
      const song = songsData.find(s => s.id === item.songId);
      return {
        id: item.id,
        order: item.order,
        songId: item.songId,
        note: item.note,
        song: song ? {
          id: song.id,
          title: song.title,
          slug: song.slug,
          tags: Array.isArray(song.tags) ? song.tags : [],
        } : null,
      };
    });

    // Fetch user info
    const { data: user } = await adminSupabase
      .from('User')
      .select('id, name, image')
      .eq('id', playlist.userId)
      .single();

    const playlistData = {
      ...playlist,
      user: user || null,
      items,
    };

    return <PlaylistPageClient initialPlaylist={playlistData} />;

  } catch (error) {
    console.error('Error loading playlist:', error);
    notFound();
  }
}
