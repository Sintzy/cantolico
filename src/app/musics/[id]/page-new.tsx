import { MusicPageClient } from './MusicPageClient';
import { notFound } from 'next/navigation';

type SongData = {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  moments: string[];
  mainInstrument: string;
  currentVersion: {
    sourceText: string | null;
    sourcePdfKey: string | null;
    mediaUrl?: string | null;
    youtubeLink?: string | null;
    spotifyLink?: string | null;
    createdBy: { name: string | null } | null;
  };
};

async function getSongData(idOrSlug: string): Promise<SongData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/musics/${idOrSlug}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar música:', error);
    return null;
  }
}

export default async function SongPage({ params }: { params: { id: string } }) {
  const songData = await getSongData(params.id);
  
  if (!songData) {
    notFound();
  }

  return <MusicPageClient songData={songData} />;
}
