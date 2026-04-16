import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase } from '@/lib/supabase-admin';
import { z } from 'zod';
import { logUnauthorizedAccess, logApiRequestError, toErrorContext } from '@/lib/logging-helpers';
import { sendEmail, createWarningEmailTemplate, createBanEmailTemplate, createSuspensionEmailTemplate } from '@/lib/email';

import { getClerkSession } from '@/lib/api-middleware';
const ModerateUserSchema = z.object({
  action: z.enum(['WARNING', 'SUSPENSION', 'BAN']),
  reason: z.string().min(1, 'Motivo é obrigatório'),
  moderatorNote: z.string().optional(),
  duration: z.number().optional(), // Duration in days for suspensions
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getClerkSession();
    
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id: userId } = await params;
    const body = await request.json();
    const { action, reason, moderatorNote, duration } = ModerateUserSchema.parse(body);

    // REVIEWERs podem apenas dar warnings, ADMIN pode fazer tudo
    if (session.user.role === 'REVIEWER' && action !== 'WARNING') {
      return NextResponse.json({ 
        error: 'Revisores podem apenas dar avisos. Ações mais severas requerem um administrador.' 
      }, { status: 403 });
    }

    // Get client IP address for audit log
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Calculate expiration date for suspensions
    let expiresAt = null;
    if (action === 'SUSPENSION' && duration) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + duration);
      expiresAt = expirationDate.toISOString();
    }

    // Map action to status
    const statusMap = {
      'WARNING': 'WARNING',
      'SUSPENSION': 'SUSPENDED', 
      'BAN': 'BANNED'
    };

    const status = statusMap[action];

    // Check if user exists
    const { data: targetUser, error: userError } = await supabase
      .from('User')
      .select('id, name, email')
      .eq('id', parseInt(userId))
      .single();

    if (userError || !targetUser) {
      logUnauthorizedAccess({
        event_type: 'unauthorized_access',
        resource: `/api/admin/users/${userId}/moderate`,
        user: { user_id: session.user.id, user_email: session.user.email || undefined, user_role: session.user.role },
  network: { ip_address: ipAddress, user_agent: request.headers.get('user-agent') || undefined },
        details: {
          targetUserId: userId,
          moderationAction: action,
          reason,
          action: 'moderate_user_not_found'
        }
      });
      return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
    }

    // Remoção de logs de início - apenas erros importantes

    // Use custom PostgreSQL function to avoid trigger issues
    const { error: moderationError } = await supabase
      .rpc('apply_user_moderation', {
        user_id: parseInt(userId),
        new_status: status,
        new_type: action,
        new_reason: reason,
        new_moderator_note: moderatorNote || null,
        admin_id: session.user.id,
        expires_at: expiresAt,
        ip_address: ipAddress
      });

    if (moderationError) {
      logApiRequestError({
        method: request.method,
        url: request.url,
        path: `/api/admin/users/${userId}/moderate`,
        status_code: 500,
        error: toErrorContext(moderationError)
      });
      console.error('Error creating moderation record:', moderationError);
      return NextResponse.json({ error: 'Erro ao aplicar moderação' }, { status: 500 });
    }

    // Create history record
    const { error: historyError } = await supabase
      .from('ModerationHistory')
      .insert({
        userId: parseInt(userId),
        status,
        type: action,
        reason,
        moderatorNote: moderatorNote || null,
        moderatedById: session.user.id,
        moderatedAt: new Date().toISOString(),
        expiresAt
      });

    if (historyError) {
      console.error('Error creating moderation history:', historyError);
      // Don't fail the request if history fails, just log the error
    }

    // Log the moderation action
    console.log(`🛡️ [MODERATION] User ${targetUser.name} (${targetUser.email}) moderated by ${session.user.name}:`, {
      action,
      reason,
      moderatorNote,
      duration,
      expiresAt,
      ipAddress
    });

    // Remoção de logs de sucesso redundantes - apenas console.log

    // Enviar email de moderação para o utilizador
    if (targetUser.email) {
      try {
        let emailTemplate = '';
        let subject = '';
        
        switch (action) {
          case 'WARNING':
            emailTemplate = createWarningEmailTemplate(
              targetUser.name || 'Utilizador',
              reason,
              session.user.name || 'Equipa de Moderação'
            );
            subject = 'Advertência Recebida - Cantólico';
            break;
            
          case 'SUSPENSION':
            const suspensionDurationText = expiresAt 
              ? `Até ${new Date(expiresAt).toLocaleDateString('pt-PT')} às ${new Date(expiresAt).toLocaleTimeString('pt-PT')}`
              : 'Duração indeterminada';
            
            emailTemplate = createSuspensionEmailTemplate(
              targetUser.name || 'Utilizador',
              reason,
              suspensionDurationText,
              session.user.name || 'Equipa de Moderação'
            );
            subject = 'Conta Suspensa Temporariamente - Cantólico';
            break;
            
          case 'BAN':
            emailTemplate = createBanEmailTemplate(
              targetUser.name || 'Utilizador',
              reason,
              session.user.name || 'Equipa de Moderação'
            );
            subject = '🚫 Conta Banida Permanentemente - Cantólico';
            break;
        }
        
        if (emailTemplate) {
          await sendEmail({
            to: targetUser.email,
            subject: subject,
            html: emailTemplate
          });

          console.log(`✅ Email de ${action.toLowerCase()} enviado para:`, targetUser.email);
        }
      } catch (emailError) {
        console.error(`❌ Erro ao enviar email de ${action.toLowerCase()}:`, emailError);
        // Não falhar a operação se o email falhar
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Moderação ${action} aplicada com sucesso`
    });

  } catch (error) {
    console.error('Error moderating user:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getClerkSession();
    
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id: userId } = await params;

    // Use custom PostgreSQL function with correct parameter order
    const { error } = await supabase
      .rpc('remove_user_moderation', {
        user_id: parseInt(userId),
        admin_id: session.user.id
      });

    if (error) {
      console.error('Error removing moderation:', error);
      return NextResponse.json({ error: 'Erro ao remover moderação' }, { status: 500 });
    }

    // Create history record for the removal
    const { error: historyError } = await supabase
      .from('ModerationHistory')
      .insert({
        userId: parseInt(userId),
        status: 'ACTIVE',
        type: null,
        reason: 'Moderação removida pelo administrador',
        moderatorNote: 'Moderação removida',
        moderatedById: session.user.id,
        moderatedAt: new Date().toISOString(),
        expiresAt: null
      });

    if (historyError) {
      console.error('Error creating removal history:', historyError);
      // Don't fail the request if history fails, just log the error
    }

    return NextResponse.json({ 
      success: true,
      message: 'Moderação removida com sucesso'
    });

  } catch (error) {
    console.error('Error removing moderation:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
