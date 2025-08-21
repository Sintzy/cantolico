import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LiturgicalMoment, SourceType, Instrument } from "@/lib/constants";
import { logAdmin, logErrors } from "@/lib/logs";
import { titleToSlug, generateUniqueSlug } from "@/lib/slugs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const resolvedParams = await params;
  const submissionId = resolvedParams.id;

  if (!submissionId) {
    await logAdmin('WARN', 'Tentativa de aprovação instantânea sem ID', 'ID da submissão não fornecido', {
      action: 'instant_approve_missing_id'
    });
    return NextResponse.json({ error: "ID da submissão não fornecido" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    await logAdmin('WARN', 'Tentativa de aprovação instantânea sem autenticação', 'Utilizador não autenticado', {
      submissionId,
      action: 'instant_approve_unauthorized'
    });
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const reviewer = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!reviewer || !["ADMIN", "REVIEWER", "TRUSTED"].includes(reviewer.role)) {
    await logAdmin('WARN', 'Tentativa de aprovação instantânea sem permissões', 'Utilizador sem role adequado', {
      userId: reviewer?.id,
      userRole: reviewer?.role,
      submissionId,
      action: 'instant_approve_forbidden'
    });
    return NextResponse.json({ error: "Sem permissão para aprovação instantânea" }, { status: 403 });
  }

  try {
    // Buscar a submissão
    const submission = await prisma.songSubmission.findUnique({
      where: { id: submissionId },
      include: {
        submitter: {
          select: { name: true, email: true }
        }
      }
    });

    if (!submission) {
      await logAdmin('WARN', 'Submissão não encontrada para aprovação instantânea', 'ID não corresponde a nenhuma submissão', {
        submissionId,
        action: 'instant_approve_not_found'
      });
      return NextResponse.json({ error: "Submissão não encontrada" }, { status: 404 });
    }

    if (submission.status !== "PENDING") {
      await logAdmin('WARN', 'Tentativa de aprovação instantânea de submissão já processada', 'Submissão não está pendente', {
        submissionId,
        status: submission.status,
        action: 'instant_approve_already_processed'
      });
      return NextResponse.json({ error: "Submissão já foi processada" }, { status: 400 });
    }

    // Validações básicas
    if (!submission.title || !submission.type || !submission.mainInstrument) {
      await logAdmin('WARN', 'Aprovação instantânea falhada por dados incompletos', 'Submissão tem campos obrigatórios em falta', {
        submissionId,
        missingFields: {
          title: !submission.title,
          type: !submission.type,
          mainInstrument: !submission.mainInstrument
        },
        action: 'instant_approve_incomplete_data'
      });
      return NextResponse.json({ error: "Submissão tem dados incompletos" }, { status: 400 });
    }

    // Verificar se tem conteúdo (texto ou PDF)
    if (!submission.tempText && !submission.tempPdfKey) {
      await logAdmin('WARN', 'Aprovação instantânea falhada por falta de conteúdo', 'Submissão não tem texto nem PDF', {
        submissionId,
        action: 'instant_approve_no_content'
      });
      return NextResponse.json({ error: "Submissão não tem conteúdo (texto ou PDF)" }, { status: 400 });
    }

    // Gerar slug único para a música
    const baseSlug = titleToSlug(submission.title);
    const uniqueSlug = await generateUniqueSlug(baseSlug);

    // Criar a música com aprovação automática
    const song = await prisma.song.create({
      data: {
        title: submission.title,
        slug: uniqueSlug,
        type: submission.type,
        mainInstrument: submission.mainInstrument as Instrument,
        tags: submission.tags || [],
        moments: submission.moment as LiturgicalMoment[],
        versions: {
          create: {
            versionNumber: 1,
            sourceType: submission.tempSourceType as SourceType,
            sourcePdfKey: submission.tempPdfKey,
            sourceText: submission.tempText,
            renderedHtml: null,
            lyricsPlain: submission.tempText || "",
            mediaUrl: submission.mediaUrl,
            youtubeLink: submission.youtubeLink,
            spotifyLink: submission.spotifyLink,
            createdById: submission.submitterId,
          },
        },
      },
    });

    // Configurar versão atual
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

    // Marcar submissão como aprovada
    await prisma.songSubmission.update({
      where: { id: submission.id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewerId: reviewer.id,
      },
    });

    await logAdmin('SUCCESS', 'Aprovação instantânea realizada com sucesso', 'Música aprovada automaticamente', {
      userId: reviewer.id,
      userRole: reviewer.role,
      submissionId: submission.id,
      submissionTitle: submission.title,
      songId: song.id,
      action: 'instant_approval_completed'
    });

    return NextResponse.json({ 
      success: true, 
      message: "Música aprovada com sucesso!",
      songId: song.id,
      songSlug: song.slug
    });

  } catch (error) {
    await logErrors('ERROR', 'Erro durante aprovação instantânea', 'Falha no processo de aprovação automática', {
      submissionId,
      userId: reviewer.id,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'instant_approval_error'
    });
    console.error("[INSTANT_APPROVE]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
