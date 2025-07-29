import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import {
  Instrument,
  LiturgicalMoment,
  SongType,
  SourceType,
} from "@prisma/client";
import { logSubmissions, logErrors } from "@/lib/logs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);


async function uploadToSupabase(
  path: string,
  file: Buffer | string,
  contentType: string
): Promise<string | null> {
  const { error } = await supabase.storage.from("songs").upload(path, file, {
    contentType,
  });
  if (error) {
    console.error(`Erro ao enviar arquivo para o Supabase: ${error.message}`);
    return null;
  }
  return path;
}

export async function POST(req: Request) {
  try {
    
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      await logSubmissions('WARN', 'Tentativa de submissão sem autenticação', 'Utilizador não autenticado tentou submeter música', {
        action: 'submission_unauthorized'
      });
      console.error("Erro: Utilizador não autenticado.");
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      await logSubmissions('WARN', 'Utilizador não encontrado para submissão', 'Email não corresponde a nenhum utilizador', {
        email: session.user.email,
        action: 'submission_user_not_found'
      });
      console.error("Erro: Utilizador não encontrado.");
      return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
    }

    await logSubmissions('INFO', 'Nova submissão de música iniciada', 'Utilizador iniciou processo de submissão', {
      userId: user.id,
      userEmail: user.email,
      action: 'submission_started'
    });

    const formData = await req.formData();
    console.log("FormData recebido:", formData);

    const title = formData.get("title")?.toString() ?? "";
    const type = formData.get("type")?.toString() as SongType;
    const instrument = formData.get("instrument")?.toString() as Instrument;
    const markdown = formData.get("markdown")?.toString() ?? "";

    const tagString = formData.get("tags")?.toString() ?? "";
    const momentsRaw = formData.get("moments")?.toString() ?? "[]";

    const tags = tagString
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    let moments: LiturgicalMoment[] = [];
    try {
      const parsed = JSON.parse(momentsRaw);
      if (Array.isArray(parsed)) {
        moments = parsed as LiturgicalMoment[];
      }
    } catch (error) {
      await logSubmissions('ERROR', 'Erro ao processar momentos litúrgicos', 'Formato inválido dos momentos', {
        userId: user.id,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        action: 'submission_parse_moments_error'
      });
      console.error("Erro ao analisar momentos:", error);
      return NextResponse.json({ error: "Momentos inválidos" }, { status: 400 });
    }

    const pdfFile = formData.get("pdf") as File | null;
    const audioFile = formData.get("audio") as File | null;

    const spotifyLink = formData.get("spotifyLink")?.toString() ?? null;
    const youtubeLink = formData.get("youtubeLink")?.toString() ?? null;

    const submissionId = randomUUID(); 
    const uploaderId = user.id;
    let pdfPath: string | null = null;
    let audioPath: string | null = null;
    let markdownPath: string | null = null;

    console.log("Dados recebidos:", {
      title,
      type,
      instrument,
      markdown,
      tags,
      moments,
      pdfFile,
      audioFile,
      spotifyLink,
      youtubeLink,
      submissionId,
    });

    if (pdfFile) {
      const buffer = Buffer.from(await pdfFile.arrayBuffer());
      const path = `songs/${submissionId}/sheet.pdf`; 
      pdfPath = await uploadToSupabase(path, buffer, "application/pdf");
      if (!pdfPath) {
        await logSubmissions('ERROR', 'Erro no upload do PDF', 'Falha ao enviar ficheiro PDF para Supabase', {
          userId: user.id,
          submissionId,
          action: 'pdf_upload_error'
        });
        console.error("Erro ao enviar PDF.");
        return NextResponse.json({ error: "Erro ao enviar PDF" }, { status: 500 });
      }
    }

    if (audioFile) {
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      const path = `songs/${submissionId}/audio.mp3`; 
      audioPath = await uploadToSupabase(path, buffer, "audio/mpeg");
      if (!audioPath) {
        await logSubmissions('ERROR', 'Erro no upload do áudio', 'Falha ao enviar ficheiro de áudio para Supabase', {
          userId: user.id,
          submissionId,
          action: 'audio_upload_error'
        });
        console.error("Erro ao enviar áudio.");
        return NextResponse.json({ error: "Erro ao enviar áudio" }, { status: 500 });
      }
    }

    if (markdown) {
      const path = `songs/${submissionId}/${submissionId}.md`; 
      markdownPath = await uploadToSupabase(path, markdown, "text/markdown");
      if (!markdownPath) {
        await logSubmissions('ERROR', 'Erro no upload do markdown', 'Falha ao enviar ficheiro markdown para Supabase', {
          userId: user.id,
          submissionId,
          action: 'markdown_upload_error'
        });
        console.error("Erro ao enviar markdown.");
        return NextResponse.json({ error: "Erro ao enviar markdown" }, { status: 500 });
      }
    }

    const submission = await prisma.songSubmission.create({
      data: {
        id: submissionId,
        title,
        moment: moments,
        type,
        mainInstrument: instrument,
        tags,
        submitterId: uploaderId,
        status: "PENDING",
        tempSourceType: markdown ? "MARKDOWN" : "PDF",
        tempPdfKey: pdfPath || undefined,
        tempText: markdown || undefined,
        mediaUrl: audioPath || null,
        spotifyLink,
        youtubeLink,
      },
    });

    await logSubmissions('SUCCESS', 'Submissão criada com sucesso', 'Nova música submetida para revisão', {
      userId: user.id,
      submissionId: submission.id,
      submissionTitle: title,
      action: 'submission_created'
    });

    console.log("Submissão criada com sucesso:", submission);

    return NextResponse.json({ success: true, submissionId });
  } catch (error) {
    await logErrors('ERROR', 'Erro na criação de submissão', 'Erro interno durante o processo de submissão', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'submission_creation_error'
    });
    console.error("Erro inesperado:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}