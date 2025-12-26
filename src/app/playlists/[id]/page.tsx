import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { adminSupabase } from '@/lib/supabase-admin';
import PlaylistPageClient from './page.client';

interface PlaylistPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: PlaylistPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const { data: playlist, error } = await adminSupabase
      .from('Playlist')
      .select(`
        name,
        description,
        isPublic,
        visibility,
        User!Playlist_userId_fkey (
          name
        )
      `)
      .eq('id', id)
      .single();

    if (error || !playlist) {
      return {
        title: 'Playlist não encontrada - Canções Católicas',
        description: 'A playlist que você procura não existe ou foi removida.',
      };
    }

    return {
      title: `${playlist.name} - Canções Católicas`,
      description: playlist.description || `Playlist: ${playlist.name}`,
      openGraph: {
        title: playlist.name,
        description: playlist.description || 'Uma playlist de canções católicas',
        type: 'website',
      },
    };
  } catch (error) {
    console.error('Error generating playlist metadata:', error);
    return {
      title: 'Playlist - Canções Católicas',
      description: 'Playlist de canções católicas',
    };
  }
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
    const { data: playlistItems, error: itemsError } = await adminSupabase
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
          tags: Array.isArray(song.tags) ? song.tags : []
        } : null
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
      items: items
    };

    return <PlaylistPageClient initialPlaylist={playlistData} />;

  } catch (error) {
    console.error('Error loading playlist:', error);
    notFound();
  }
}