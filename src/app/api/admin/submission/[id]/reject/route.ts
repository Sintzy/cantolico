import { NextRequest, NextResponse } from "next/server";
import { adminSupabase as supabase } from "@/lib/supabase-admin";
import { logApiRequestError, logUnauthorizedAccess, logForbiddenAccess, toErrorContext } from '@/lib/logging-helpers';
import { sendEmail, createRejectionEmailTemplate } from '@/lib/email';

import { getClerkSession } from '@/lib/api-middleware';
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getClerkSession();
    
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
      logUnauthorizedAccess({
        event_type: 'unauthorized_access',
        resource: `/api/admin/submission/${id}/reject`,
        user: { user_id: session.user.id, user_email: session.user.email || undefined, user_role: session.user.role },
          network: { ip_address: req.headers.get('x-forwarded-for') || 'unknown', user_agent: req.headers.get('user-agent') || undefined },
        details: {
          submissionId: id,
          action: 'reject_submission_not_found'
        }
      });
      return NextResponse.json({ error: 'Submissão não encontrada' }, { status: 404 });
    }

    if (submission.status !== 'PENDING') {
      logForbiddenAccess({
        event_type: 'forbidden_access',
        resource: `/api/admin/submission/${id}/reject`,
        user: { user_id: session.user.id, user_email: session.user.email || undefined, user_role: session.user.role },
          network: { ip_address: req.headers.get('x-forwarded-for') || 'unknown', user_agent: req.headers.get('user-agent') || undefined },
        details: {
          submissionId: id,
          submissionTitle: submission.title,
          currentStatus: submission.status,
          action: 'reject_submission_already_processed'
        }
      });
      return NextResponse.json({ error: 'Esta submissão já foi processada' }, { status: 400 });
    }

    // Log - remoção de logs desnecessários, apenas erros serão logados

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
      logApiRequestError({
        method: req.method,
        url: req.url,
        path: `/api/admin/submission/${id}/reject`,
        status_code: 500,
  error: toErrorContext(updateError)
      });
      console.error('Error rejecting submission:', updateError);
      return NextResponse.json({ error: 'Erro ao rejeitar submissão' }, { status: 500 });
    }

    // Sucesso - remoção de log de sucesso, apenas erros importantes

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
