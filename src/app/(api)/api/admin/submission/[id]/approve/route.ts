import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { LiturgicalMoment, SourceType, Instrument } from "@prisma/client";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const submissionId = params.id;

  if (!submissionId) {
    return NextResponse.json({ error: "ID da submissão não fornecido" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const reviewer = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!reviewer || !["ADMIN", "REVIEWER"].includes(reviewer.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const submission = await prisma.songSubmission.findUnique({
    where: { id: submissionId },
  });

  if (!submission) {
    return NextResponse.json({ error: "Submissão não encontrada" }, { status: 404 });
  }

  try {
    const formData = await req.formData();
    console.log("FormData recebido:", formData);

    const markdown = formData.get("markdown") as string;
    const spotifyLink = formData.get("spotifyLink") as string;
    const youtubeLink = formData.get("youtubeLink") as string;
    const instrument = formData.get("instrument") as string || "OUTRO";
    const momentsRaw = formData.get("moments") as string;
    const tagsRaw = formData.get("tags") as string;

    const newPdfFile = formData.get("pdf") as File | null;
    const newMp3File = formData.get("mp3") as File | null;

    console.log("PDF recebido:", newPdfFile);
    console.log("MP3 recebido:", newMp3File);

    let finalPdfKey = submission.tempPdfKey || null;
    let finalMediaUrl = submission.mediaUrl || null;

    async function uploadToSupabase(path: string, buffer: Buffer, contentType: string) {
      console.log(`Tentando fazer upload para Supabase: ${path}`);
      const { error } = await supabase.storage.from("songs").upload(path, buffer, {
        contentType,
        upsert: true,
      });
      if (error) {
        console.error(`Erro ao fazer upload para Supabase: ${error.message}`);
        return { success: false, error };
      }
      console.log(`Upload bem-sucedido: ${path}`);
      return { success: true };
    }

    if (newPdfFile) {
      const buffer = Buffer.from(await newPdfFile.arrayBuffer());
      const fileName = `songs/${submissionId}/sheet.pdf`;

      const result = await uploadToSupabase(fileName, buffer, newPdfFile.type || "application/pdf");
      if (!result.success) {
        return NextResponse.json({ error: "Erro ao fazer upload do novo PDF" }, { status: 500 });
      }

      finalPdfKey = fileName;
    } else if (!finalPdfKey) {
      finalPdfKey = null;
    }

    if (newMp3File) {
      const buffer = Buffer.from(await newMp3File.arrayBuffer());
      const fileName = `songs/${submissionId}/audio.mp3`;

      const result = await uploadToSupabase(fileName, buffer, newMp3File.type || "audio/mpeg");
      if (!result.success) {
        return NextResponse.json({ error: "Erro ao fazer upload do novo MP3" }, { status: 500 });
      }

      finalMediaUrl = fileName;
    } else if (!finalMediaUrl) {
      finalMediaUrl = null;
    }

    const tagList = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const momentList = JSON.parse(momentsRaw) as LiturgicalMoment[];

    if (!Object.values(Instrument).includes(instrument as Instrument)) {
      return NextResponse.json({ error: "Instrumento inválido" }, { status: 400 });
    }

    const song = await prisma.song.create({
      data: {
        title: submission.title,
        type: submission.type,
        mainInstrument: instrument as Instrument,
        tags: tagList,
        moments: momentList,
        versions: {
          create: {
            versionNumber: 1,
            sourceType: submission.tempSourceType as SourceType,
            sourcePdfKey: finalPdfKey || undefined,
            sourceText: markdown || undefined,
            renderedHtml: null,
            lyricsPlain: markdown || "",
            mediaUrl: finalMediaUrl,
            youtubeLink: youtubeLink || null,
            spotifyLink: spotifyLink || null,
            createdById: submission.submitterId,
          },
        },
      },
    });

    const version = await prisma.songVersion.findFirst({
      where: { songId: song.id },
      orderBy: { createdAt: "desc" },
    });

    if (version) {
      await prisma.song.update({
        where: { id: song.id },
        data: { currentVersionId: version.id },
      });
    }

    await prisma.songSubmission.update({
      where: { id: submission.id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewerId: reviewer.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao processar submissão:", error);
    return NextResponse.json({ error: "Erro interno ao processar submissão" }, { status: 500 });
  }
}