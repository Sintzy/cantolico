import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { findSongBySlug } from "@/lib/slugs";

interface MusicLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  
  try {
    // Tentar encontrar por ID primeiro, depois por slug
    let song = await prisma.song.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        tags: true,
        moments: true,
        mainInstrument: true,
        currentVersion: {
          select: {
            sourceText: true,
            createdBy: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    // Se não encontrou por ID, tentar por slug
    if (!song) {
      const songBySlug = await findSongBySlug(id);
      if (songBySlug) {
        song = {    
          id: songBySlug.id,
          title: songBySlug.title,
          slug: songBySlug.slug,
          tags: songBySlug.tags,
          moments: songBySlug.moments,
          mainInstrument: songBySlug.mainInstrument,
          currentVersion: songBySlug.currentVersion ? {
            sourceText: songBySlug.currentVersion.sourceText,
            createdBy: songBySlug.currentVersion.createdBy
          } : null
        };
      }
    }

    if (!song) {
      return {
        title: "Música não encontrada",
        description: "Esta música não existe no nosso cancioneiro.",
      };
    }

    const momentos = song.moments.join(", ");
    const tags = song.tags.slice(0, 5).join(", ");
    const autor = song.currentVersion?.createdBy?.name || "Autor desconhecido";
    
    // Usar slug se disponível, senão usar ID
    const urlPath = song.slug || song.id;

    return {
      title: song.title,
      description: `${song.title} - Cântico católico para ${momentos}. ${tags ? `Tags: ${tags}.` : ""} Partilhado por ${autor} no Can♱ólico!`,
      keywords: [song.title, ...song.tags, ...song.moments, "cântico", "católico", "liturgia", song.mainInstrument],
      openGraph: {
        title: `${song.title} | Cantólico!`,
        description: `${song.title} - Cântico católico para ${momentos}. Descobre este e outros cânticos no Can♱ólico!`,
        type: "article",
        locale: "pt_PT",
        url: `https://cantolico.pt/musics/${urlPath}`,
      },
      twitter: {
        card: "summary",
        title: `${song.title} | Can♱ólico!`,
        description: `${song.title} - Cântico católico para ${momentos}`,
      },
      alternates: {
        canonical: `https://cantolico.pt/musics/${urlPath}`,
      },
    };
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
