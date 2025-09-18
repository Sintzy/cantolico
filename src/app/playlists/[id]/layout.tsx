import { Metadata } from "next";
import { supabase } from "@/lib/supabase-client";
import { PAGE_METADATA } from "@/lib/metadata";

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

    return PAGE_METADATA.playlistDetail(
      playlist.name,
      playlist.description || undefined
    );
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
