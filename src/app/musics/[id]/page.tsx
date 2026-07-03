import { notFound, permanentRedirect } from 'next/navigation';
import { adminSupabase } from '@/lib/supabase-admin';
import { parseMomentsFromPostgreSQL, parseTagsFromPostgreSQL } from '@/lib/utils';
import SongPageClient from './page.client';

interface MusicPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

async function getSong(id: string) {
  const { data: songs, error } = await adminSupabase
    .from('Song')
    .select(`
      id,
      title,
      slug,
      moments,
      type,
      mainInstrument,
      capo,
      tags,
      author,
      currentVersionId,
      SongVersion!Song_currentVersionId_fkey (
        sourcePdfKey,
        sourceText,
        mediaUrl,
        youtubeLink,
        spotifyLink,
        createdBy:User!SongVersion_createdById_fkey (
          name
        )
      )
    `)
    .or(`id.eq.${id},slug.eq.${id}`)
    .limit(1);

  if (error || !songs || songs.length === 0) {
    return null;
  }

  const song = songs[0] as any;

  return {
    ...song,
    tags: parseTagsFromPostgreSQL(song.tags),
    moments: parseMomentsFromPostgreSQL(song.moments),
    currentVersion: Array.isArray(song.SongVersion) ? song.SongVersion[0] : song.SongVersion,
  };
}

function buildRedirectUrl(slug: string, searchParams?: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  const massId = searchParams?.massId;

  if (typeof massId === 'string' && massId) {
    query.set('massId', massId);
  }

  const suffix = query.toString();
  return suffix ? `/musics/${slug}?${suffix}` : `/musics/${slug}`;
}

export default async function MusicPage({ params, searchParams }: MusicPageProps) {
  const [{ id }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
  ]);
  const song = await getSong(id);

  if (!song) {
    notFound();
  }

  if (song.slug && song.slug !== id) {
    permanentRedirect(buildRedirectUrl(song.slug, resolvedSearchParams));
  }

  return <SongPageClient initialSong={song} songId={id} />;
}
