import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

interface MusicPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: MusicPageProps): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const song = await prisma.song.findUnique({
      where: { id },
      select: {
        title: true,
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

    if (!song) {
      return {
        title: "Música não encontrada",
        description: "Esta música não existe no nosso cancioneiro.",
      };
    }

    const momentos = song.moments.join(", ");
    const tags = song.tags.slice(0, 5).join(", ");
    const autor = song.currentVersion?.createdBy?.name || "Autor desconhecido";

    return {
      title: song.title,
      description: `${song.title} - Cântico católico para ${momentos}. ${tags ? `Tags: ${tags}.` : ""} Partilhado por ${autor} no Can♱ólico!`,
      keywords: [song.title, ...song.tags, ...song.moments, "cântico", "católico", "liturgia", song.mainInstrument],
      openGraph: {
        title: `${song.title} | Can♱ólico!`,
        description: `${song.title} - Cântico católico para ${momentos}. Descobre este e outros cânticos no Can♱ólico!`,
        type: "article",
        locale: "pt_PT",
      },
      twitter: {
        card: "summary",
        title: `${song.title} | Can♱ólico!`,
        description: `${song.title} - Cântico católico para ${momentos}`,
      }
    };
  } catch (error) {
    return {
      title: "Erro ao carregar música",
      description: "Ocorreu um erro ao carregar esta música.",
    };
  }
}
