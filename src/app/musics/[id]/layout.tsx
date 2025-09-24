import { Metadata } from 'next';
import { supabase } from '@/lib/supabase-client';
import { findSongBySlug } from '@/lib/slugs';
import { createMusicMetadata } from '@/lib/metadata';

interface MusicLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  
  try {
    // Primeiro tentar por ID
    let { data: song } = await supabase
      .from('Song')
      .select(`
        id,
        title,
        slug,
        tags,
        moments,
        mainInstrument,
        currentVersion:SongVersion!Song_currentVersionId_fkey(
          sourceText,
          createdBy:User!SongVersion_createdById_fkey(name)
        )
      `)
      .eq('id', id)
      .single();

    // Se não encontrou por ID, tentar por slug
    if (!song) {
      const songBySlug = await findSongBySlug(id);
      if (songBySlug) {
        song = songBySlug as any;
      }
    }

    if (!song) {
      return {
        title: 'Música não encontrada | Cantolico',
        description: 'A música que você está procurando não foi encontrada.',
      };
    }

    // Sempre usar slug para URL canônica se disponível
    const canonicalSlug = song.slug || id;
    
    return createMusicMetadata({
      title: song.title,
      tags: song.tags || [],
      moments: song.moments || [],
      author: (song.currentVersion as any)?.createdBy?.name,
      slug: canonicalSlug, // Usar slug para canonical
    });
    
  } catch (error) {
    console.error('Erro ao gerar metadata:', error);
    return {
      title: 'Erro | Cantolico',
      description: 'Ocorreu um erro ao carregar a música.',
    };
  }
}

export default function MusicLayout({ children }: MusicLayoutProps) {
  return children;
}