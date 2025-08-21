import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
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

    const autor = song.currentVersion?.createdBy?.name;
    
    return createMusicMetadata({
      title: song.title,
      moments: song.moments,
      tags: song.tags,
      slug: song.slug,
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
