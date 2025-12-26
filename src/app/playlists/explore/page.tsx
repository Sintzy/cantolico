import { Metadata } from 'next';
import { adminSupabase } from '@/lib/supabase-admin';
import { buildMetadata } from '@/lib/seo';
import ExplorePlaylistsClient from './page.client';

export const metadata: Metadata = buildMetadata({
  title: 'Explorar Playlists Públicas - Cantólico',
  description: 'Descobre playlists públicas de cânticos católicos criadas pela comunidade.',
  path: '/playlists/explore',
});

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  userId: number;
  createdAt: string;
  updatedAt: string;
  User: {
    id: number;
    name: string;
    image?: string;
  };
  songsCount?: number;
}

export default async function ExplorePlaylistsPage() {
  // Fetch public playlists from database (Server Component)
  const { data: playlistsData, error } = await adminSupabase
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
      )
    `)
    .eq('isPublic', true)
    .order('updatedAt', { ascending: false });

  // Get song counts for each playlist
  let playlists: Playlist[] = [];
  if (playlistsData) {
    const playlistIds = playlistsData.map(p => p.id);
    
    const { data: itemCounts } = await adminSupabase
      .from('PlaylistItem')
      .select('playlistId')
      .in('playlistId', playlistIds);

    const countsMap = new Map<string, number>();
    itemCounts?.forEach(item => {
      const count = countsMap.get(item.playlistId) || 0;
      countsMap.set(item.playlistId, count + 1);
    });

    playlists = playlistsData.map(p => ({
      ...p,
      User: Array.isArray(p.User) ? p.User[0] : p.User,
      songsCount: countsMap.get(p.id) || 0
    }));
  }

  if (error) {
    console.error('Error fetching playlists:', error);
  }

  return <ExplorePlaylistsClient initialPlaylists={playlists} />;
}
