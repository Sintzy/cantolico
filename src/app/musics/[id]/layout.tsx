import { Metadata } from "next";
import { supabase } from "@/lib/supabase-client";
import { findSongBySlug } from "@/lib/slugs";
import { createMusicMetadata } from "@/lib/metadata";

interface MusicLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  
  try {
    // Tentar encontrar por ID primeiro, depois por slug
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
        song = {    
          id: (songBySlug as any).id,
          title: (songBySlug as any).title,
          slug: (songBySlug as any).slug,
          tags: (songBySlug as any).tags,
          moments: (songBySlug as any).moments,
          mainInstrument: (songBySlug as any).mainInstrument,
          currentVersion: (songBySlug as any).currentVersion ? {
            sourceText: (songBySlug as any).currentVersion.sourceText,
            createdBy: (songBySlug as any).currentVersion.createdBy
          } : null
        } as any;
      }
    }

    if (!song) {
      return {
        title: "Música não encontrada",
        description: "Esta música não existe no nosso cancioneiro.",
      };
    }

    const autor = (song as any)?.currentVersion?.createdBy?.name;
    
    return createMusicMetadata({
      title: (song as any)?.title,
      moments: (song as any)?.moments,
      tags: (song as any)?.tags,
      slug: (song as any)?.slug,
      id: (song as any)?.id,
      author: autor || undefined,
    });
  } catch (error) {
    return {
      title: "Erro ao carregar música",
      description: "Ocorreu um erro ao carregar esta música.",
    };
  }
}

export default function MusicLayout({ children }: MusicLayoutProps) {
  return children;
}
