"use client";

import * as React from 'react';
import dynamic from 'next/dynamic';
import SongPageFallback from './SongPageFallback';

const FullSongPageClient = dynamic(() => import('./page.client'), {
  ssr: false,
  loading: () => null,
});

type SongPageClientIslandProps = {
  initialSong: any;
  songId: string;
};

class ClientRenderBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

export default function SongPageClientIsland({ initialSong, songId }: SongPageClientIslandProps) {
  const [ready, setReady] = React.useState(false);
  const fallback = <SongPageFallback song={initialSong} />;

  return (
    <ClientRenderBoundary fallback={fallback}>
      {!ready ? fallback : null}
      <div hidden={!ready}>
        <FullSongPageClient initialSong={initialSong} songId={songId} onReady={() => setReady(true)} />
      </div>
    </ClientRenderBoundary>
  );
}
