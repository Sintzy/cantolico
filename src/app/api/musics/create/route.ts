import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase-client";
import { randomUUID } from "crypto";
import {
  Instrument,
  LiturgicalMoment,
  SongType,
  SourceType,
} from "@/lib/constants";
import { logSubmissions, logErrors } from "@/lib/logs";


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

async function validateTurnstileToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Erro ao validar Turnstile token:', error);
    return false;
  }
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

    const { data: user, error: userError } = await supabase
      .from('User')
      .select('id, email')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
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

    // Validar Turnstile captcha
    const captchaToken = formData.get("captchaToken")?.toString();
    if (!captchaToken) {
      await logSubmissions('WARN', 'Submissão sem captcha', 'Token do captcha não fornecido', {
        userId: user.id,
        action: 'submission_missing_captcha'
      });
      return NextResponse.json({ error: "Token do captcha é obrigatório" }, { status: 400 });
    }

    const isValidCaptcha = await validateTurnstileToken(captchaToken);
    if (!isValidCaptcha) {
      await logSubmissions('WARN', 'Captcha inválido', 'Token do captcha não é válido', {
        userId: user.id,
        action: 'submission_invalid_captcha'
      });
      return NextResponse.json({ error: "Captcha inválido. Tente novamente." }, { status: 400 });
    }

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

    const { data: submission, error: submissionError } = await supabase
      .from('SongSubmission')
      .insert({
        id: submissionId,
        title,
        moment: moments,
        type,
        mainInstrument: instrument,
        tags,
        submitterId: uploaderId,
        status: "PENDING",
        tempSourceType: markdown ? "MARKDOWN" : "PDF",
        tempPdfKey: pdfPath || null,
        tempText: markdown || null,
        mediaUrl: audioPath || null,
        spotifyLink,
        youtubeLink,
      })
      .select()
      .single();

    if (submissionError || !submission) {
      throw new Error(`Supabase error: ${submissionError?.message}`);
    }

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