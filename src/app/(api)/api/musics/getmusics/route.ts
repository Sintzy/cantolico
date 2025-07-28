import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 

export async function GET() {
  try {
    const songs = await prisma.song.findMany({
      select: {
        id: true,
        title: true,
        moments: true,
        type: true,
        mainInstrument: true,
        tags: true,
        currentVersionId: true,
        createdAt: true,
        updatedAt: true,
        versions: {
          select: {
            id: true,
            songId: true,
            versionNumber: true,
            sourceType: true,
            sourcePdfKey: true,
            sourceText: true,
            renderedHtml: true,
            keyOriginal: true,
            lyricsPlain: true,
            mediaUrl: true,
            youtubeLink: true,
            spotifyLink: true,
            createdAt: true,
            createdById: true,
          },
          orderBy: { versionNumber: "desc" },
        },
      },
      orderBy: {
        title: 'asc',
      },
    });

    return NextResponse.json(songs);
  } catch (error) {
    console.error("[GET_MUSICS]", error);
    return NextResponse.json({ error: "Erro ao buscar músicas." }, { status: 500 });
  }
}