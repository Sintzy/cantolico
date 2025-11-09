import { Metadata } from "next";
import { supabase } from "@/lib/supabase-client";
import { generatePlaylistSEO } from "@/lib/seo";

interface PlaylistLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const { data: playlist } = await supabase
      .from('Playlist')
      .select(`
        name,
        description,
        isPublic,
        User!Playlist_userId_fkey (
          name
        ),
        PlaylistSong!Playlist_id_fkey (
          id
        )
      `)
      .eq('id', id)
      .single();

    if (!playlist) {
      return {
        title: "Playlist não encontrada",
        description: "Esta playlist não existe ou foi removida.",
      };
    }

    const songCount = (playlist as any).PlaylistSong?.length || 0;

    return generatePlaylistSEO({
      name: playlist.name,
      description: playlist.description,
      id: id,
      songCount: songCount
    });
  } catch (error) {
    return {
      title: "Erro ao carregar playlist",
      description: "Ocorreu um erro ao carregar esta playlist.",
    };
  }
}

export default function PlaylistLayout({ children }: PlaylistLayoutProps) {
  return children;
}
