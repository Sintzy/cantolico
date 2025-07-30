import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { logAdmin, logErrors } from "@/lib/logs";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const resolvedParams = await context.params;
  const id = resolvedParams.id;

  try {
    await logAdmin('INFO', 'Consulta de submissão individual', 'Administrador a consultar detalhes da submissão', {
      submissionId: id,
      action: 'fetch_submission_details_1'
    });

    const submission = await prisma.songSubmission.findUnique({
      where: { id },
    });

    if (!submission) {
      await logAdmin('WARN', 'Submissão não encontrada', 'Tentativa de acesso a submissão inexistente', {
        submissionId: id,
        action: 'submission_not_found'
      });
      return NextResponse.json({ error: "Submissão não encontrada" }, { status: 404 });
    }

    const pdfSignedUrl = submission.tempPdfKey
      ? await supabase.storage.from("songs").createSignedUrl(submission.tempPdfKey, 3600)
      : null;

    const audioSignedUrl = submission.mediaUrl
      ? await supabase.storage.from("songs").createSignedUrl(submission.mediaUrl, 3600)
      : null;

    await logAdmin('SUCCESS', 'Detalhes da submissão carregados', 'Dados da submissão enviados com URLs assinadas', {
      submissionId: id,
      submissionTitle: submission.title,
      hasPdf: !!submission.tempPdfKey,
      hasAudio: !!submission.mediaUrl,
      action: 'submission_details_loaded'
    });

    return NextResponse.json({
      ...submission,
      tempPdfUrl: pdfSignedUrl?.data?.signedUrl || null,
      mediaUrl: audioSignedUrl?.data?.signedUrl || null,
    });
  } catch (error) {
    await logErrors('ERROR', 'Erro ao carregar submissão', 'Falha na consulta de detalhes da submissão', {
      submissionId: id,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'fetch_submission_details_error'
    });
    console.error("Erro inesperado:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}