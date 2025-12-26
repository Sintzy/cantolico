import { Metadata } from 'next';
import { adminSupabase } from '@/lib/supabase-admin';
import { buildMetadata } from '@/lib/seo';
import MusicsPageClient from './page.client';
import BannerDisplay from '@/components/BannerDisplay';

export const metadata: Metadata = buildMetadata({
  title: 'Cânticos Católicos - Biblioteca Completa',
  description: 'Descobre centenas de cânticos católicos organizados por momentos litúrgicos, instrumentos e tags.',
  path: '/musics',
});

interface Song {
  id: string;
  title: string;
  slug: string;
  moments: string[];
  tags: string[];
  mainInstrument: string;
}

export default async function MusicsPage() {
  // Fetch songs directly from database (Server Component)
  const { data: songs, error } = await adminSupabase
    .from('Song')
    .select('id, title, slug, moments, tags, mainInstrument')
    .order('title', { ascending: true });

  if (error) {
    console.error('Error fetching songs:', error);
  }

  return (
    <>
      <BannerDisplay page="MUSICS" />
      <MusicsPageClient initialSongs={songs || []} />
    </>
  );
}
