import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminSupabase } from '@/lib/supabase-admin';
import { buildMetadata } from '@/lib/seo';
import { redirect } from 'next/navigation';
import PlaylistsClient from './page.client';

export const metadata: Metadata = buildMetadata({
  title: 'Minhas Playlists - Cantólico',
  description: 'Gere as tuas playlists de cânticos católicos.',
  path: '/playlists',
  index: false,
});

interface PlaylistMember {
  id: string;
  email: string;
  name: string | null;
  role: 'owner' | 'editor';
  status: 'accepted' | 'pending';
  joinedAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  visibility: 'PUBLIC' | 'PRIVATE' | 'NOT_LISTED';
  isPublic: boolean;
  userId: number;
  createdAt: string;
  updatedAt: string;
  songsCount: number;
  members?: PlaylistMember[];
  userRole?: 'owner' | 'editor' | 'admin';
}

export default async function PlaylistsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/playlists');
  }

  // Fetch user's playlists from database (Server Component)
  const { data: playlistsData, error } = await adminSupabase
    .from('Playlist')
    .select('id, name, description, visibility, isPublic, userId, createdAt, updatedAt')
    .eq('userId', session.user.id)
    .order('updatedAt', { ascending: false });

  let playlists: Playlist[] = [];
  
  if (playlistsData && Array.isArray(playlistsData) && playlistsData.length > 0) {
    // Get song counts for each playlist
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

    // Get members for each playlist
    const { data: members } = await adminSupabase
      .from('PlaylistMember')
      .select('*')
      .in('playlistId', playlistIds);

    const membersMap = new Map<string, PlaylistMember[]>();
    members?.forEach(member => {
      const existing = membersMap.get(member.playlistId) || [];
      membersMap.set(member.playlistId, [...existing, member]);
    });

    playlists = playlistsData.map(p => ({
      ...p,
      songsCount: countsMap.get(p.id) || 0,
      members: membersMap.get(p.id) || [],
      userRole: 'owner' as const
    }));
  }

  if (error) {
    console.error('Error fetching playlists:', error);
  }

  const initialPlaylists = Array.isArray(playlists) ? playlists : [];
  return <PlaylistsClient initialPlaylists={initialPlaylists} />;
}
