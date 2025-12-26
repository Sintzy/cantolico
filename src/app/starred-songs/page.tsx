import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminSupabase } from '@/lib/supabase-admin';
import { buildMetadata } from '@/lib/seo';
import { redirect } from 'next/navigation';
import StarredSongsClient from './page.client';

export const metadata: Metadata = buildMetadata({
  title: 'Músicas Favoritas - Cantólico',
  description: 'As tuas músicas católicas favoritas num só lugar.',
  path: '/starred-songs',
  index: false,
});

interface StarredSong {
  id: string;
  title: string;
  slug: string;
  author: string;
  mainInstrument?: string;
  moments: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
  starred_at: string;
  starCount?: number;
  isStarred?: boolean;
  User: {
    id: string;
    name: string;
  };
}

export default async function StarredSongsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/starred-songs');
  }

  // Fetch starred songs from database (Server Component)
  const { data: starredData, error } = await adminSupabase
    .from('Star')
    .select(`
      createdAt,
      Song:songId (
        id,
        title,
        slug,
        author,
        mainInstrument,
        moments,
        tags,
        createdAt,
        updatedAt,
        User:submitterId (
          id,
          name
        )
      )
    `)
    .eq('userId', session.user.id)
    .order('createdAt', { ascending: false });

  let songs: StarredSong[] = [];
  
  if (starredData && Array.isArray(starredData) && starredData.length > 0) {
    songs = starredData.map((star: any) => ({
      ...star.Song,
      starred_at: star.createdAt,
      created_at: star.Song.createdAt,
      updated_at: star.Song.updatedAt,
      isStarred: true,
      moments: Array.isArray(star.Song.moments) ? star.Song.moments : [],
      tags: Array.isArray(star.Song.tags) ? star.Song.tags : [],
      User: star.Song.User
    }));
  }

  if (error) {
    console.error('Error fetching starred songs:', error);
  }

  const initialSongs = Array.isArray(songs) ? songs : [];
  return <StarredSongsClient initialSongs={initialSongs} />;
}
