import { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { adminSupabase } from '@/lib/supabase-admin';
import { buildMetadata } from "@/lib/seo";

interface PlaylistLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  
  try {
    let { data: playlist, error: playlistError } : { data: any; error: any } = await supabase
      .from('Playlist')
      .select(`
        name,
        description,
        isPublic,
        visibility,
        User!Playlist_userId_fkey (
          name
        )
      `)
      .eq('id', id)
      .single();

    if (playlistError || !playlist) {
      // If not found with the regular client, try to fetch full data with the
      // admin/service role client. That way we avoid returning notFound when
      // the playlist exists but the current request is blocked by RLS.
      try {
        const { data: adminPlaylist, error: adminError } = await adminSupabase
          .from('Playlist')
          .select(`
            name,
            description,
            isPublic,
            visibility,
            User!Playlist_userId_fkey (
              name
            )
          `)
          .eq('id', id)
          .single();

        if (adminError || !adminPlaylist) {
          console.warn(`generateMetadata: playlist not found for id=${id}`);
          return buildMetadata({
            title: "Playlist não encontrada",
            description: "A playlist que você procura não existe ou foi removida.",
            path: `/playlists/${id}`,
            index: false,
          });
        }

        // Use the adminPlaylist as the playlist for metadata generation
        playlist = adminPlaylist as any;
      } catch (err) {
        console.warn('generateMetadata: admin fetch failed', err);
        return buildMetadata({
          title: "Playlist",
          description: "Informações da playlist indisponíveis no momento.",
          path: `/playlists/${id}`,
          index: false,
        });
      }
    }

    // Get song count separately
    const { count: songCount } = await supabase
      .from('PlaylistItem')
      .select('*', { count: 'exact', head: true })
      .eq('playlistId', id);

    return buildMetadata({
      title: `${playlist.name} | Playlist`,
      description: playlist.description || `Playlist ${playlist.name} com ${songCount || "várias"} músicas selecionadas.`,
      path: `/playlists/${id}`,
      type: "article",
    });
  } catch (error) {
    // If an error occurs while fetching metadata (permissions, RLS, network),
    // avoid returning a not-found, but surface a neutral metadata object so the
    // client can decide how to render. Log the error for diagnostics.
    console.warn('generateMetadata: error fetching playlist metadata', error);
    return buildMetadata({
      title: "Playlist",
      description: "Informações da playlist indisponíveis no momento.",
      path: `/playlists/${await params.then(p => p.id)}`,
      index: false,
    });
  }
}

export default function PlaylistLayout({ children }: PlaylistLayoutProps) {
  return children;
}
