import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PAGE_METADATA } from "@/lib/metadata";

interface PlaylistLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const playlist = await prisma.playlist.findUnique({
      where: { id },
      select: {
        name: true,
        description: true,
        isPublic: true,
        user: {
          select: {
            name: true
          }
        }
      }
    });

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
