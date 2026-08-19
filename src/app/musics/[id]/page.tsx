import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import { adminSupabase } from '@/lib/supabase-admin';
import { parseMomentsFromPostgreSQL, parseTagsFromPostgreSQL } from '@/lib/utils';
import { isLikelySongId, normalizeSongIdentifier } from '@/lib/song-identifier';
import { getInstrumentLabel, getLiturgicalMomentLabel } from '@/lib/constants';

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

function stripMicMarker(text: string | null | undefined) {
  return (text || '').replace(/^#mic#\s*\n?/, '').trim();
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

  const currentVersion = song.currentVersion;
  const sourceText = stripMicMarker(currentVersion?.sourceText);
  const moments = Array.isArray(song.moments) ? song.moments : [];
  const tags = Array.isArray(song.tags) ? song.tags : [];

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <Link href="/musics" className="text-sm font-medium text-rose-700 hover:text-rose-800">
            Voltar ao cancioneiro
          </Link>
        </div>

        <header className="border-b border-stone-200 pb-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
            <span>{song.type === 'PARTITURA' ? 'Partitura' : 'Acordes'}</span>
            {song.mainInstrument ? <span>{getInstrumentLabel(song.mainInstrument)}</span> : null}
            {typeof song.capo === 'number' && song.capo > 0 ? <span>Capo {song.capo}</span> : null}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-stone-950 sm:text-5xl">
            {song.title}
          </h1>
          {song.author ? <p className="mt-3 text-base text-stone-600">{song.author}</p> : null}
        </header>

        {moments.length || tags.length ? (
          <section className="flex flex-wrap gap-2">
            {moments.map((moment: string) => (
              <span key={`moment-${moment}`} className="rounded border border-rose-200 bg-rose-50 px-2.5 py-1 text-sm text-rose-800">
                {getLiturgicalMomentLabel(moment)}
              </span>
            ))}
            {tags.map((tag: string) => (
              <span key={`tag-${tag}`} className="rounded border border-stone-200 bg-white px-2.5 py-1 text-sm text-stone-700">
                {tag}
              </span>
            ))}
          </section>
        ) : null}

        {(currentVersion?.youtubeLink || currentVersion?.spotifyLink) ? (
          <section className="flex flex-wrap gap-3">
            {currentVersion.youtubeLink ? (
              <a
                href={currentVersion.youtubeLink}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100"
              >
                YouTube
              </a>
            ) : null}
            {currentVersion.spotifyLink ? (
              <a
                href={currentVersion.spotifyLink}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100"
              >
                Spotify
              </a>
            ) : null}
          </section>
        ) : null}

        <article className="rounded border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          {sourceText ? (
            <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-7 text-stone-900 sm:text-base">
              {sourceText}
            </pre>
          ) : (
            <p className="text-stone-600">Esta música ainda não tem texto disponível.</p>
          )}
        </article>
      </div>
    </main>
  );
}
