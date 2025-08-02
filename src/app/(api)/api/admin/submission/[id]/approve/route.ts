import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { LiturgicalMoment, SourceType, Instrument } from "@prisma/client";
import { sendEmail, createApprovalEmailTemplate } from "@/lib/email";
import { logAdmin, logEmails, logErrors } from "@/lib/logs";
import { titleToSlug, generateUniqueSlug } from "@/lib/slugs";
import { modernContentDiscovery } from "@/lib/sitemap-notify";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const resolvedParams = await params;
  const submissionId = resolvedParams.id;

  if (!submissionId) {
    await logAdmin('WARN', 'Tentativa de aprovação sem ID', 'ID da submissão não fornecido', {
      action: 'approve_missing_id'
    });
    return NextResponse.json({ error: "ID da submissão não fornecido" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    await logAdmin('WARN', 'Tentativa de aprovação sem autenticação', 'Utilizador não autenticado', {
      submissionId,
      action: 'approve_unauthorized'
    });
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const reviewer = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!reviewer || !["ADMIN", "REVIEWER"].includes(reviewer.role)) {
    await logAdmin('WARN', 'Tentativa de aprovação sem permissões', 'Utilizador sem role adequado', {
      userId: reviewer?.id,
      userRole: reviewer?.role,
      submissionId,
      action: 'approve_forbidden'
    });
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const submission = await prisma.songSubmission.findUnique({
    where: { id: submissionId },
  });

  if (!submission) {
    await logAdmin('WARN', 'Tentativa de aprovação de submissão inexistente', 'Submissão não encontrada', {
      userId: reviewer.id,
      submissionId,
      action: 'approve_not_found'
    });
    return NextResponse.json({ error: "Submissão não encontrada" }, { status: 404 });
  }

  await logAdmin('INFO', 'Processo de aprovação iniciado', 'Revisor iniciou aprovação de submissão', {
    userId: reviewer.id,
    userRole: reviewer.role,
    submissionId,
    submissionTitle: submission.title,
    action: 'approve_started'
  });

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

    // Gerar slug único para a música
    const baseSlug = titleToSlug(submission.title);
    const uniqueSlug = await generateUniqueSlug(baseSlug);

    const song = await prisma.song.create({
      data: {
        title: submission.title,
        slug: uniqueSlug,
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

    await logAdmin('SUCCESS', 'Submissão aprovada com sucesso', 'Música aprovada e criada no sistema', {
      userId: reviewer.id,
      userRole: reviewer.role,
      submissionId: submission.id,
      submissionTitle: submission.title,
      songId: song.id,
      action: 'submission_approved'
    });

    // 🚀 Descoberta moderna de conteúdo (método atualizado 2023)
    modernContentDiscovery(song.slug || song.id, submission.title).then((result) => {
      console.log(`🔍 Descoberta iniciada para nova música "${submission.title}":`, result.success);
    }).catch((error) => {
      console.error('❌ Erro na descoberta de conteúdo:', error);
    });

    // Registrar log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: reviewer.id,
        action: "SUBMISSION_APPROVED",
        entity: "SongSubmission",
        entityId: submission.id,
        metadata: {
          submissionTitle: submission.title,
          songId: song.id,
          submitterId: submission.submitterId,
          reviewedAt: new Date().toISOString()
        }
      }
    });

    // Buscar dados atualizados para email
    const updatedSubmission = await prisma.songSubmission.findUnique({
      where: { id: submission.id },
      include: {
        submitter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Enviar email de notificação (não bloquear o processo se falhar)
    if (updatedSubmission) {
      try {
        const emailTemplate = createApprovalEmailTemplate(
          updatedSubmission.submitter.name || "Utilizador",
          updatedSubmission.title,
          song.id,
          updatedSubmission.reviewer?.name || undefined
        );

        const emailResult = await sendEmail({
          to: updatedSubmission.submitter.email,
          subject: `Submissão aprovada: ${updatedSubmission.title}`,
          html: emailTemplate
        });

        if (emailResult.success) {
          console.log(`Email de aprovação enviado para ${updatedSubmission.submitter.email}`);
          
          await logEmails('SUCCESS', 'Email de aprovação enviado', 'Notificação de aprovação enviada ao submissor', {
            userId: reviewer.id,
            submissionId: submission.id,
            submissionTitle: submission.title,
            emailType: 'APPROVAL_NOTIFICATION',
            recipientEmail: updatedSubmission.submitter.email,
            action: 'email_sent'
          });
          
          // Registrar log de email enviado
          await prisma.auditLog.create({
            data: {
              userId: reviewer.id,
              action: "EMAIL_SENT",
              entity: "SongSubmission",
              entityId: submission.id,
              metadata: {
                emailType: "APPROVAL_NOTIFICATION",
                recipientEmail: updatedSubmission.submitter.email,
                submissionTitle: submission.title,
                songId: song.id,
                sentAt: new Date().toISOString()
              }
            }
          });
        } else {
          console.error(`Falha ao enviar email: ${emailResult.error}`);
          
          await logEmails('ERROR', 'Falha no envio de email de aprovação', 'Erro ao enviar notificação de aprovação', {
            userId: reviewer.id,
            submissionId: submission.id,
            submissionTitle: submission.title,
            emailType: 'APPROVAL_NOTIFICATION',
            recipientEmail: updatedSubmission.submitter.email,
            error: emailResult.error,
            action: 'email_failed'
          });
          
          // Registrar log de falha no email
          await prisma.auditLog.create({
            data: {
              userId: reviewer.id,
              action: "EMAIL_FAILED",
              entity: "SongSubmission",
              entityId: submission.id,
              metadata: {
                emailType: "APPROVAL_NOTIFICATION",
                recipientEmail: updatedSubmission.submitter.email,
                error: emailResult.error,
                failedAt: new Date().toISOString()
              }
            }
          });
        }
      } catch (emailError) {
        console.error("Erro inesperado ao enviar email de notificação:", emailError);
        
        await logEmails('ERROR', 'Erro inesperado no envio de email', 'Erro interno durante envio de notificação', {
          userId: reviewer.id,
          submissionId: submission.id,
          emailType: 'APPROVAL_NOTIFICATION',
          error: emailError instanceof Error ? emailError.message : 'Erro desconhecido',
          action: 'email_error'
        });
        
        // Registrar log de erro no email
        try {
          await prisma.auditLog.create({
            data: {
              userId: reviewer.id,
              action: "EMAIL_ERROR",
              entity: "SongSubmission",
              entityId: submission.id,
              metadata: {
                emailType: "APPROVAL_NOTIFICATION",
                error: emailError instanceof Error ? emailError.message : "Erro desconhecido",
                errorAt: new Date().toISOString()
              }
            }
          });
        } catch (auditEmailError) {
          console.error("Erro ao registrar log de erro de email:", auditEmailError);
        }
      }
    }

    return NextResponse.json({ success: true, songId: song.id });
  } catch (error) {
    await logErrors('ERROR', 'Erro no processo de aprovação', 'Erro interno durante aprovação da submissão', {
      submissionId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'approval_process_error'
    });
    console.error("Erro ao processar submissão:", error);
    return NextResponse.json({ error: "Erro interno ao processar submissão" }, { status: 500 });
  }
}