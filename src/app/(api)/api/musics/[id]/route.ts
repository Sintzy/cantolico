import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    const song = await prisma.song.findUnique({
      where: { id },
      include: {
        currentVersion: {
          include: {
            createdBy: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!song) {
      return NextResponse.json({ error: "Música não encontrada" }, { status: 404 });
    }

    return NextResponse.json(song);
  } catch (error) {
    console.error("[GET_MUSIC_BY_ID]", error);
    return NextResponse.json({ error: "Erro ao carregar música" }, { status: 500 });
  }
}
