import { notFound, permanentRedirect } from 'next/navigation';
import { adminSupabase } from '@/lib/supabase-admin';
import { parseMomentsFromPostgreSQL, parseTagsFromPostgreSQL } from '@/lib/utils';
import { isLikelySongId, normalizeSongIdentifier } from '@/lib/song-identifier';
import SongPageClientIsland from './SongPageClientIsland';

interface MusicPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const songSelect = `
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
`;

function formatSong(song: any) {
  return {
    ...song,
    tags: parseTagsFromPostgreSQL(song.tags),
    moments: parseMomentsFromPostgreSQL(song.moments),
    currentVersion: Array.isArray(song.SongVersion) ? song.SongVersion[0] : song.SongVersion,
  };
}

async function getSong(id: string) {
  const songIdOrSlug = normalizeSongIdentifier(id);

  if (isLikelySongId(songIdOrSlug)) {
    const { data: songs, error } = await adminSupabase
      .from('Song')
      .select(songSelect)
      .eq('id', songIdOrSlug)
      .limit(1);

    if (!error && songs?.[0]) {
      return formatSong(songs[0]);
    }
  }

  const { data: songs, error } = await adminSupabase
    .from('Song')
    .select(songSelect)
    .eq('slug', songIdOrSlug)
    .limit(1);

  if (error || !songs || songs.length === 0) {
    return null;
  }

  return formatSong(songs[0]);
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

  return <SongPageClientIsland initialSong={song} songId={id} />;
}
