import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, context: { params: { id: string } }) {
  const id = context.params.id;

  try {
    const submission = await prisma.songSubmission.findUnique({
      where: { id },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submissão não encontrada" }, { status: 404 });
    }

    const pdfSignedUrl = submission.tempPdfKey
      ? await supabase.storage.from("songs").createSignedUrl(submission.tempPdfKey, 3600)
      : null;

    const audioSignedUrl = submission.mediaUrl
      ? await supabase.storage.from("songs").createSignedUrl(submission.mediaUrl, 3600)
      : null;

    return NextResponse.json({
      ...submission,
      tempPdfUrl: pdfSignedUrl?.data?.signedUrl || null,
      mediaUrl: audioSignedUrl?.data?.signedUrl || null,
    });
  } catch (error) {
    console.error("Erro inesperado:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}