import { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { SITE_IMAGES } from "@/lib/site-images";
import { notFound } from "next/navigation";

interface MusicPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: MusicPageProps): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const { data: song, error } = await supabase
      .from('Song')
      .select(`
        title,
        tags,
        moments,
        mainInstrument,
        SongVersion!Song_currentVersionId_fkey (
          createdBy:User!SongVersion_createdById_fkey (
            name
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !song) {
      return {
        title: "Música não encontrada",
        description: "Esta música não existe no nosso cancioneiro.",
      };
    }

    const momentos = Array.isArray(song.moments) ? song.moments.join(", ") : song.moments;
    const tags = Array.isArray(song.tags) ? song.tags.slice(0, 5).join(", ") : song.tags;
    // Corrigir leitura do autor (compatível com o formato retornado pelo Supabase)
    let autor = "Autor desconhecido";
    if (song.SongVersion) {
      // SongVersion pode ser array ou objeto
      const sv = Array.isArray(song.SongVersion) ? song.SongVersion[0] : song.SongVersion;
      if (sv && sv.createdBy) {
        // createdBy pode ser array ou objeto
        const cb = Array.isArray(sv.createdBy) ? sv.createdBy[0] : sv.createdBy;
        if (cb && cb.name) {
          autor = cb.name;
        }
      }
    }

    return {
      title: song.title,
      description: `${song.title} - Cântico católico para ${momentos}. ${tags ? `Tags: ${tags}.` : ""} Partilhado por ${autor} no Can♱ólico!`,
      keywords: [song.title, ...(Array.isArray(song.tags) ? song.tags : []), ...(Array.isArray(song.moments) ? song.moments : []), "cântico", "católico", "liturgia", song.mainInstrument],
      openGraph: {
        title: `${song.title} | Can♱ólico!`,
        description: `${song.title} - Cântico católico para ${momentos}. Descobre este e outros cânticos no Can♱ólico!`,
        type: "article",
        locale: "pt_PT",
        images: [
          {
            url: SITE_IMAGES.ogImage,
            width: 1200,
            height: 630,
            alt: `${song.title} - Can♱ólico!`,
          }
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${song.title} | Can♱ólico!`,
        description: `${song.title} - Cântico católico para ${momentos}`,
        images: [SITE_IMAGES.twitterImage],
      }
    };
  } catch (error) {
    return {
      title: "Erro ao carregar música",
      description: "Ocorreu um erro ao carregar esta música.",
    };
  }
}
