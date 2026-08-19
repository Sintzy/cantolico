"use client";

import Link from 'next/link';
import { getInstrumentLabel, getLiturgicalMomentLabel } from '@/lib/constants';

type SongFallbackData = {
  title: string;
  type?: string | null;
  mainInstrument?: string | null;
  capo?: number | null;
  author?: string | null;
  moments?: string[] | null;
  tags?: string[] | null;
  currentVersion?: {
    sourceText?: string | null;
    youtubeLink?: string | null;
    spotifyLink?: string | null;
  } | null;
};

function stripMicMarker(text: string | null | undefined) {
  return (text || '').replace(/^#mic#\s*\n?/, '').trim();
}

export default function SongPageFallback({ song }: { song: SongFallbackData }) {
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
            {moments.map((moment) => (
              <span key={`moment-${moment}`} className="rounded border border-rose-200 bg-rose-50 px-2.5 py-1 text-sm text-rose-800">
                {getLiturgicalMomentLabel(moment)}
              </span>
            ))}
            {tags.map((tag) => (
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
