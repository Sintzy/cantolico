import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, createRejectionEmailTemplate } from "@/lib/email";
import { logAdmin, logEmails, logErrors } from "@/lib/logs";

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

  // Validação básica do ID
  if (!submissionId) {
    await logAdmin('WARN', 'Tentativa de rejeição sem ID', 'ID da submissão não fornecido', {
      action: 'reject_missing_id'
    });
    return NextResponse.json({ 
      error: "ID da submissão não fornecido" 
    }, { status: 400 });
  }

  try {
    // Verificação de autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      await logAdmin('WARN', 'Tentativa de rejeição sem autenticação', 'Utilizador não autenticado', {
        submissionId,
        action: 'reject_unauthorized'
      });
      return NextResponse.json({ 
        error: "Não autenticado" 
      }, { status: 401 });
    }

    // Buscar o usuário reviewer e verificar permissões
    const reviewer = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!reviewer || !["ADMIN", "REVIEWER"].includes(reviewer.role)) {
      await logAdmin('WARN', 'Tentativa de rejeição sem permissões', 'Utilizador sem role adequado', {
        userId: reviewer?.id,
        userRole: reviewer?.role,
        submissionId,
        action: 'reject_forbidden'
      });
      return NextResponse.json({ 
        error: "Sem permissão para revisar submissões" 
      }, { status: 403 });
    }

    // Buscar a submissão
    const submission = await prisma.songSubmission.findUnique({
      where: { id: submissionId },
      include: {
        submitter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!submission) {
      await logAdmin('WARN', 'Tentativa de rejeição de submissão inexistente', 'Submissão não encontrada', {
        userId: reviewer.id,
        submissionId,
        action: 'reject_not_found'
      });
      return NextResponse.json({ 
        error: "Submissão não encontrada" 
      }, { status: 404 });
    }

    // Verificar se a submissão ainda está pendente
    if (submission.status !== "PENDING") {
      await logAdmin('WARN', 'Tentativa de rejeição de submissão já processada', 'Submissão já foi processada anteriormente', {
        userId: reviewer.id,
        submissionId,
        submissionTitle: submission.title,
        currentStatus: submission.status,
        action: 'reject_already_processed'
      });
      return NextResponse.json({ 
        error: `Submissão já foi ${submission.status === "APPROVED" ? "aprovada" : "rejeitada"}` 
      }, { status: 400 });
    }

    await logAdmin('INFO', 'Processo de rejeição iniciado', 'Revisor iniciou rejeição de submissão', {
      userId: reviewer.id,
      userRole: reviewer.role,
      submissionId,
      submissionTitle: submission.title,
      action: 'reject_started'
    });

    // Extrair dados do corpo da requisição
    const body = await req.json();
    const { rejectionReason, deleteFiles = true } = body;

    // Validar motivo de rejeição
    if (!rejectionReason || typeof rejectionReason !== "string" || rejectionReason.trim().length === 0) {
      return NextResponse.json({ 
        error: "Motivo da rejeição é obrigatório" 
      }, { status: 400 });
    }

    const sanitizedReason = rejectionReason.trim();
    if (sanitizedReason.length < 5) {
      return NextResponse.json({ 
        error: "Motivo da rejeição deve ter pelo menos 5 caracteres" 
      }, { status: 400 });
    }

    if (sanitizedReason.length > 1000) {
      return NextResponse.json({ 
        error: "Motivo da rejeição deve ter no máximo 1000 caracteres" 
      }, { status: 400 });
    }

    // Lista de arquivos para deletar do Supabase
    const filesToDelete: string[] = [];

    if (deleteFiles) {
      // Adicionar arquivo PDF temporário se existir
      if (submission.tempPdfKey) {
        filesToDelete.push(submission.tempPdfKey);
      }

      // Adicionar arquivo de mídia se existir
      if (submission.mediaUrl) {
        filesToDelete.push(submission.mediaUrl);
      }

      // Adicionar arquivos da pasta da submissão
      const submissionFolder = `songs/${submissionId}/`;
      try {
        const { data: folderContents } = await supabase.storage
          .from("songs")
          .list(`songs/${submissionId}`, {
            limit: 100,
            offset: 0
          });

        if (folderContents && folderContents.length > 0) {
          folderContents.forEach(file => {
            filesToDelete.push(`${submissionFolder}${file.name}`);
          });
        }
      } catch (listError) {
        console.warn("Não foi possível listar arquivos da pasta:", listError);
      }
    }

    // Deletar arquivos do Supabase (se solicitado)
    const deletionResults: Array<{ path: string; success: boolean; error?: string }> = [];

    if (deleteFiles && filesToDelete.length > 0) {
      for (const filePath of filesToDelete) {
        try {
          const { error } = await supabase.storage
            .from("songs")
            .remove([filePath]);

          if (error) {
            console.error(`Erro ao deletar arquivo ${filePath}:`, error);
            deletionResults.push({ 
              path: filePath, 
              success: false, 
              error: error.message 
            });
          } else {
            console.log(`Arquivo deletado com sucesso: ${filePath}`);
            deletionResults.push({ 
              path: filePath, 
              success: true 
            });
          }
        } catch (deleteError) {
          console.error(`Erro inesperado ao deletar ${filePath}:`, deleteError);
          deletionResults.push({ 
            path: filePath, 
            success: false, 
            error: "Erro inesperado" 
          });
        }
      }
    }

    // Atualizar submissão no banco de dados
    const updatedSubmission = await prisma.songSubmission.update({
      where: { id: submission.id },
      data: {
        status: "REJECTED",
        rejectionReason: sanitizedReason,
        reviewedAt: new Date(),
        reviewerId: reviewer.id,
      },
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

    await logAdmin('SUCCESS', 'Submissão rejeitada com sucesso', 'Música rejeitada pelo revisor', {
      userId: reviewer.id,
      userRole: reviewer.role,
      submissionId: submission.id,
      submissionTitle: submission.title,
      rejectionReason: sanitizedReason,
      filesDeleted: deleteFiles,
      action: 'submission_rejected'
    });

    // Registrar log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: reviewer.id,
        action: "SUBMISSION_REJECTED",
        entity: "SongSubmission",
        entityId: submission.id,
        metadata: {
          submissionTitle: submission.title,
          submitterId: submission.submitterId,
          submitterEmail: submission.submitter.email,
          rejectionReason: sanitizedReason,
          filesDeleted: deleteFiles,
          deletionResults: deletionResults,
          reviewedAt: new Date().toISOString()
        }
      }
    });

    // Log para debugging
    console.log(`Submissão ${submissionId} rejeitada por ${reviewer.email}`);
    console.log(`Motivo: ${sanitizedReason}`);
    console.log(`Arquivos deletados: ${deleteFiles ? filesToDelete.length : 0}`);

    // Enviar email de notificação (não bloquear o processo se falhar)
    try {
      const emailTemplate = createRejectionEmailTemplate(
        updatedSubmission.submitter.name || "Utilizador",
        updatedSubmission.title,
        sanitizedReason,
        updatedSubmission.reviewer?.name || undefined
      );

      const emailResult = await sendEmail({
        to: updatedSubmission.submitter.email,
        subject: `Submissão rejeitada: ${updatedSubmission.title}`,
        html: emailTemplate
      });

      if (emailResult.success) {
        console.log(`Email de rejeição enviado para ${updatedSubmission.submitter.email}`);
        
        await logEmails('SUCCESS', 'Email de rejeição enviado', 'Notificação de rejeição enviada ao submissor', {
          userId: reviewer.id,
          submissionId: submission.id,
          submissionTitle: submission.title,
          emailType: 'REJECTION_NOTIFICATION',
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
              emailType: "REJECTION_NOTIFICATION",
              recipientEmail: updatedSubmission.submitter.email,
              submissionTitle: submission.title,
              sentAt: new Date().toISOString()
            }
          }
        });
      } else {
        console.error(`Falha ao enviar email: ${emailResult.error}`);
        
        await logEmails('ERROR', 'Falha no envio de email de rejeição', 'Erro ao enviar notificação de rejeição', {
          userId: reviewer.id,
          submissionId: submission.id,
          submissionTitle: submission.title,
          emailType: 'REJECTION_NOTIFICATION',
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
              emailType: "REJECTION_NOTIFICATION",
              recipientEmail: updatedSubmission.submitter.email,
              error: emailResult.error,
              failedAt: new Date().toISOString()
            }
          }
        });
      }
    } catch (emailError) {
      console.error("Erro inesperado ao enviar email de notificação:", emailError);
      
      await logEmails('ERROR', 'Erro inesperado no envio de email', 'Erro interno durante envio de notificação de rejeição', {
        userId: reviewer.id,
        submissionId: submission.id,
        emailType: 'REJECTION_NOTIFICATION',
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
              emailType: "REJECTION_NOTIFICATION",
              error: emailError instanceof Error ? emailError.message : "Erro desconhecido",
              errorAt: new Date().toISOString()
            }
          }
        });
      } catch (auditEmailError) {
        console.error("Erro ao registrar log de erro de email:", auditEmailError);
      }
    }

    // Resposta de sucesso
    return NextResponse.json({
      success: true,
      message: "Submissão rejeitada com sucesso",
      data: {
        submissionId: updatedSubmission.id,
        title: updatedSubmission.title,
        submitter: updatedSubmission.submitter,
        reviewer: updatedSubmission.reviewer,
        rejectionReason: updatedSubmission.rejectionReason,
        reviewedAt: updatedSubmission.reviewedAt,
        filesDeleted: deleteFiles,
        deletionSummary: {
          total: filesToDelete.length,
          successful: deletionResults.filter(r => r.success).length,
          failed: deletionResults.filter(r => !r.success).length
        }
      }
    }, { status: 200 });

  } catch (error) {
    await logErrors('ERROR', 'Erro no processo de rejeição', 'Erro interno durante rejeição da submissão', {
      submissionId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'rejection_process_error'
    });
    
    console.error("Erro ao rejeitar submissão:", error);

    // Log de erro para auditoria
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        const reviewer = await prisma.user.findUnique({
          where: { email: session.user.email },
        });

        if (reviewer) {
          await prisma.auditLog.create({
            data: {
              userId: reviewer.id,
              action: "SUBMISSION_REJECTION_ERROR",
              entity: "SongSubmission",
              entityId: submissionId,
              metadata: {
                error: error instanceof Error ? error.message : "Erro desconhecido",
                timestamp: new Date().toISOString()
              }
            }
          });
        }
      }
    } catch (auditError) {
      console.error("Erro ao registrar log de auditoria:", auditError);
    }

    // Resposta de erro
    return NextResponse.json({
      error: "Erro interno ao rejeitar submissão",
      details: process.env.NODE_ENV === "development" 
        ? (error instanceof Error ? error.message : "Erro desconhecido")
        : undefined
    }, { status: 500 });
  }
}

// Método GET para obter informações da submissão (opcional)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const resolvedParams = await params;
  const submissionId = resolvedParams.id;

  if (!submissionId) {
    return NextResponse.json({ 
      error: "ID da submissão não fornecido" 
    }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: "Não autenticado" 
      }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || !["ADMIN", "REVIEWER"].includes(user.role)) {
      return NextResponse.json({ 
        error: "Sem permissão para visualizar submissões" 
      }, { status: 403 });
    }

    const submission = await prisma.songSubmission.findUnique({
      where: { id: submissionId },
      include: {
        submitter: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!submission) {
      return NextResponse.json({ 
        error: "Submissão não encontrada" 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: submission
    }, { status: 200 });

  } catch (error) {
    console.error("Erro ao buscar submissão:", error);
    return NextResponse.json({
      error: "Erro interno ao buscar submissão"
    }, { status: 500 });
  }
}
