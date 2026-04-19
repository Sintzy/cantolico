import { Metadata } from 'next';
import { getAuthenticatedUser } from '@/lib/clerk-auth';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { buildMetadata } from '@/lib/seo';
import { redirect } from 'next/navigation';
import StarredSongsClient from './page.client';

export const metadata: Metadata = buildMetadata({
  title: 'Músicas Favoritas - Cantólico',
  description: 'As tuas músicas católicas favoritas num só lugar.',
  path: '/starred-songs',
  index: false,
});

export default async function StarredSongsPage() {
  const user = await getAuthenticatedUser();

  if (!user?.supabaseUserId) {
    redirect('/sign-in?redirect_url=/starred-songs');
  }

  const supabase = createAdminSupabaseClient();

  // Fetch starred songs with song data
  const { data: starredData, error } = await supabase
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
        tags
      )
    `)
    .eq('userId', user.supabaseUserId)
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('Error fetching starred songs:', error);
  }

  // Get star counts for all starred songs
  const songIds = (starredData || [])
    .filter((s: any) => s.Song)
    .map((s: any) => s.Song.id);

  let starCounts: Record<string, number> = {};

  if (songIds.length > 0) {
    // Fetch star counts in batches if needed
    const { data: countData } = await supabase
      .from('Star')
      .select('songId')
      .in('songId', songIds);

    if (countData) {
      for (const row of countData) {
        starCounts[row.songId] = (starCounts[row.songId] || 0) + 1;
      }
    }
  }

  const parseTags = (tags: any): string[] => {
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string' && tags.startsWith('{') && tags.endsWith('}')) {
      return tags.slice(1, -1).split(',').map((t: string) => t.trim()).filter(Boolean);
    }
    return [];
  };

  const songs = (starredData || [])
    .filter((star: any) => star.Song)
    .map((star: any) => ({
      id: star.Song.id,
      title: star.Song.title,
      slug: star.Song.slug,
      author: star.Song.author || '',
      mainInstrument: star.Song.mainInstrument || '',
      moments: Array.isArray(star.Song.moments) ? star.Song.moments : [],
      tags: parseTags(star.Song.tags),
      starredAt: star.createdAt,
      starCount: starCounts[star.Song.id] || 0,
    }));

  return <StarredSongsClient songs={songs} />;
}
