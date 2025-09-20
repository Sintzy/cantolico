import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from "@/lib/supabase-client";
import { logAdmin, logErrors } from '@/lib/logs';
import { sendEmail, createRejectionEmailTemplate } from '@/lib/email';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const { rejectionReason } = await req.json();

    if (!rejectionReason?.trim()) {
      return NextResponse.json({ error: 'Motivo da rejeição é obrigatório' }, { status: 400 });
    }

    // Buscar a submissão com dados do utilizador
    const { data: submission, error: fetchError } = await supabase
      .from('SongSubmission')
      .select(`
        id, submitterId, status, title,
        submitter:User!submitterId(
          id,
          name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !submission) {
      await logAdmin('WARN', 'Tentativa de rejeição de submissão inexistente', 'Admin tentou rejeitar submissão que não existe', {
        adminId: session.user.id,
        adminEmail: session.user.email,
        submissionId: id,
        action: 'reject_submission_not_found'
      });
      return NextResponse.json({ error: 'Submissão não encontrada' }, { status: 404 });
    }

    if (submission.status !== 'PENDING') {
      await logAdmin('WARN', 'Tentativa de rejeição de submissão já processada', 'Admin tentou rejeitar submissão que já foi processada', {
        adminId: session.user.id,
        adminEmail: session.user.email,
        submissionId: id,
        submissionTitle: submission.title,
        currentStatus: submission.status,
        action: 'reject_submission_already_processed'
      });
      return NextResponse.json({ error: 'Esta submissão já foi processada' }, { status: 400 });
    }

    // Log do início da rejeição
    await logAdmin('INFO', 'Rejeição de submissão iniciada', 'Admin iniciou processo de rejeição de submissão', {
      adminId: session.user.id,
      adminEmail: session.user.email,
      submissionId: id,
      submissionTitle: submission.title,
      submitterId: submission.submitterId,
      rejectionReason: rejectionReason.trim(),
      action: 'reject_submission_started',
      entity: 'song_submission'
    });

    // Atualizar status da submissão
    const { error: updateError } = await supabase
      .from('SongSubmission')
      .update({
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
        reviewedAt: new Date().toISOString(),
        reviewerId: session.user.id
      })
      .eq('id', id);

    if (updateError) {
      await logErrors('ERROR', 'Erro ao rejeitar submissão', 'Erro na base de dados ao marcar submissão como rejeitada', {
        adminId: session.user.id,
        adminEmail: session.user.email,
        submissionId: id,
        submissionTitle: submission.title,
        rejectionReason: rejectionReason.trim(),
        error: updateError.message,
        action: 'reject_submission_error'
      });
      console.error('Error rejecting submission:', updateError);
      return NextResponse.json({ error: 'Erro ao rejeitar submissão' }, { status: 500 });
    }

    // Log de sucesso da rejeição
    await logAdmin('SUCCESS', 'Submissão rejeitada com sucesso', 'Admin rejeitou submissão', {
      adminId: session.user.id,
      adminEmail: session.user.email,
      submissionId: id,
      submissionTitle: submission.title,
      submitterId: submission.submitterId,
      rejectionReason: rejectionReason.trim(),
      action: 'submission_rejected',
      entity: 'song_submission'
    });

    // Enviar email de rejeição para o utilizador
    if (submission.submitter && Array.isArray(submission.submitter) && submission.submitter[0]?.email) {
      try {
        const user = submission.submitter[0];
        const emailTemplate = createRejectionEmailTemplate(
          user.name || 'Utilizador',
          submission.title,
          rejectionReason.trim(),
          session.user.name || 'Equipa de Revisão'
        );
        
        await sendEmail({
          to: user.email,
          subject: '📝 A tua submissão foi rejeitada - Cantólico',
          html: emailTemplate
        });

        console.log('✅ Email de rejeição enviado para:', user.email);
      } catch (emailError) {
        console.error('❌ Erro ao enviar email de rejeição:', emailError);
        // Não falhar a operação se o email falhar
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in reject submission API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
