import { NextResponse, NextRequest } from "next/server";
import { withUserProtection } from "@/lib/enhanced-api-protection";
import { supabase } from "@/lib/supabase-client";
import { randomUUID } from "crypto";
import {
  Instrument,
  LiturgicalMoment,
  SongType,
  SourceType,
} from "@/lib/constants";
import { logQuickAction, getUserInfoFromRequest, USER_ACTIONS } from "@/lib/user-action-logger";
import { formatTagsForPostgreSQL } from "@/lib/utils";


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

export const POST = withUserProtection<any>(async (req: NextRequest, session: any) => {
  console.log('🎵 Nova submissão de música iniciada');

  const { data: user, error: userError } = await supabase
    .from('User')
    .select('id, email')
    .eq('email', session.user.email)
    .single();

  if (userError || !user) {
    console.error("Erro: Utilizador não encontrado.");
    return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
  }

  // Log submission attempt
  const userInfo = getUserInfoFromRequest(req, session);
  await logQuickAction(
    'SUBMIT_SONG',
    { ...userInfo, userId: user.id, userEmail: user.email },
    false, // Will be updated to true if successful
    {
      stage: 'started'
    }
  );

    const formData = await req.formData();
    console.log("FormData recebido:", formData);

    // Validar Turnstile captcha
    const captchaToken = formData.get("captchaToken")?.toString();
    if (!captchaToken) {
      return NextResponse.json({ error: "Token do captcha é obrigatório" }, { status: 400 });
    }

    const isValidCaptcha = await validateTurnstileToken(captchaToken);
    if (!isValidCaptcha) {
      return NextResponse.json({ error: "Captcha inválido. Tente novamente." }, { status: 400 });
    }

    const title = formData.get("title")?.toString() ?? "";
    const author = formData.get("author")?.toString() || null;
    const type = formData.get("type")?.toString() as SongType;
    const instrument = formData.get("instrument")?.toString() as Instrument;
    const markdown = formData.get("markdown")?.toString() ?? "";

    const tagString = formData.get("tags")?.toString() ?? "";
    const momentsRaw = formData.get("moments")?.toString() ?? "[]";

    // Processar tags usando a função utilitária
    const tags = formatTagsForPostgreSQL(
      tagString
        .replace(/[{}]/g, '') // Remove chaves se existirem
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    );

    let moments: LiturgicalMoment[] = [];
    try {
      const parsed = JSON.parse(momentsRaw);
      if (Array.isArray(parsed)) {
        moments = parsed as LiturgicalMoment[];
      }
    } catch (error) {
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
      console.error("Erro ao enviar PDF.");
      return NextResponse.json({ error: "Erro ao enviar PDF" }, { status: 500 });
    }
  }

  if (audioFile) {
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const path = `songs/${submissionId}/audio.mp3`; 
    
    audioPath = await uploadToSupabase(path, buffer, "audio/mpeg");
    if (!audioPath) {
      console.error("Erro ao enviar áudio.");
      return NextResponse.json({ error: "Erro ao enviar áudio" }, { status: 500 });
    }
  }

  if (markdown) {
    const path = `songs/${submissionId}/${submissionId}.md`; 
    markdownPath = await uploadToSupabase(path, markdown, "text/markdown");
    if (!markdownPath) {
      console.error("Erro ao enviar markdown.");
      return NextResponse.json({ error: "Erro ao enviar markdown" }, { status: 500 });
    }
  }

  const { data: submission, error: submissionError } = await supabase
    .from('SongSubmission')
    .insert({
      id: submissionId,
      title,
      author,
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

  // Log successful song submission
  await logQuickAction(
    'SUBMIT_SONG',
    { ...userInfo, userId: user.id, userEmail: user.email },
    true,
    {
      submissionId: submission.id,
      title,
      type,
      instrument,
      hasAudio: !!audioPath,
      hasPdf: !!pdfPath,
      hasMarkdown: !!markdown,
      momentsCount: moments.length,
      tagsCount: tags?.length || 0,
      stage: 'completed'
    }
  );

  console.log("Submissão criada com sucesso:", submission);

  return NextResponse.json({ success: true, submissionId });
});