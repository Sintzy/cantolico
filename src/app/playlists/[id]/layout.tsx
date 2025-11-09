import { Metadata } from "next";
import { notFound } from "next/navigation";
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
      // If the playlist truly doesn't exist, return a 404 so Next shows the
      // standard not-found page. This ensures the server responds with the
      // correct HTTP status and metadata for missing resources.
      console.warn(`generateMetadata: playlist not found for id=${id}`);
      return notFound();
    }

    const songCount = (playlist as any).PlaylistSong?.length || 0;

    return generatePlaylistSEO({
      name: playlist.name,
      description: playlist.description,
      id: id,
      songCount: songCount
    });
  } catch (error) {
    // If an error occurs while fetching metadata (permissions, RLS, network),
    // avoid returning a not-found, but surface a neutral metadata object so the
    // client can decide how to render. Log the error for diagnostics.
    console.warn('generateMetadata: error fetching playlist metadata', error);
    return {
      title: "Playlist",
      description: "Informações da playlist indisponíveis no momento.",
    };
  }
}

export default function PlaylistLayout({ children }: PlaylistLayoutProps) {
  return children;
}
