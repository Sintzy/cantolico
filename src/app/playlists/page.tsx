import { Metadata } from 'next';
import { getAuthenticatedUser } from '@/lib/clerk-auth';
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
  const user = await getAuthenticatedUser();

  if (!user?.supabaseUserId) {
    redirect('/sign-in?redirect_url=/playlists');
  }

  // Fetch user's playlists with counts and members in a single query
  const { data: playlistsData, error } = await adminSupabase
    .from('Playlist')
    .select(`
      id, name, description, visibility, isPublic, userId, createdAt, updatedAt,
      PlaylistItem(id),
      PlaylistMember(*)
    `)
    .eq('userId', user.supabaseUserId)
    .order('updatedAt', { ascending: false });

  let playlists: Playlist[] = [];
  
  if (playlistsData && Array.isArray(playlistsData)) {
    playlists = playlistsData.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      visibility: p.visibility,
      isPublic: p.isPublic,
      userId: p.userId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      songsCount: p.PlaylistItem?.length ?? 0,
      members: p.PlaylistMember ?? [],
      userRole: 'owner' as const
    }));
  }

  if (error) {
    console.error('Error fetching playlists:', error);
  }

  const initialPlaylists = Array.isArray(playlists) ? playlists : [];
  return <PlaylistsClient initialPlaylists={initialPlaylists} />;
}
