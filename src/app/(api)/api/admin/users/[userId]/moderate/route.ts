import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAdmin, logErrors } from '@/lib/logs';
import { sendEmail, createWarningEmailTemplate, createSuspensionEmailTemplate, createBanEmailTemplate } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action, type, reason, moderatorNote, duration } = body;
    const { userId: userIdStr } = await params;
    const userId = parseInt(userIdStr);

    // Aceitar tanto 'action' como 'type' para compatibilidade
    const moderationAction = action || type;

    console.log('Received moderation request:', {
      action: moderationAction,
      reason,
      moderatorNote,
      duration,
      userId,
      originalBody: body
    });

    if (!moderationAction || !reason) {
      console.log('Validation failed:', { action: !!moderationAction, reason: !!reason });
      return NextResponse.json({ error: 'Ação e motivo são obrigatórios' }, { status: 400 });
    }

    // Não permitir moderar o próprio admin
    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Não pode moderar-se a si próprio' }, { status: 400 });
    }

    // Obter IP do utilizador (seria necessário implementar tracking de IP)
    const userToModerate = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    if (!userToModerate) {
      return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
    }

    // Calcular data de expiração para suspensões
    let expiresAt = null;
    if (moderationAction === 'SUSPENSION' && duration) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + duration);
    }

    // Criar ou atualizar moderação
    const moderation = await prisma.userModeration.upsert({
      where: { userId },
      update: {
        status: moderationAction === 'WARNING' ? 'WARNING' : moderationAction === 'SUSPENSION' ? 'SUSPENDED' : 'BANNED',
        type: moderationAction,
        reason,
        moderatorNote,
        moderatedById: session.user.id,
        moderatedAt: new Date(),
        expiresAt,
        updatedAt: new Date(),
      },
      create: {
        userId,
        status: moderationAction === 'WARNING' ? 'WARNING' : moderationAction === 'SUSPENSION' ? 'SUSPENDED' : 'BANNED',
        type: moderationAction,
        reason,
        moderatorNote,
        moderatedById: session.user.id,
        moderatedAt: new Date(),
        expiresAt,
      },
    });

    // Forçar logout do utilizador - invalidar sessões no NextAuth
    if (moderationAction === 'SUSPENSION' || moderationAction === 'BAN') {
      // Note: Para implementar logout forçado, seria necessário um sistema de invalidação de tokens
      // Por agora, o middleware irá verificar o status de moderação em cada request
    }

    // Enviar email de notificação
    try {
      let emailTemplate: string;
      let subject: string;

      if (moderationAction === 'WARNING') {
        subject = 'Cantólico - Advertência Recebida';
        emailTemplate = createWarningEmailTemplate(
          userToModerate.name || 'Utilizador',
          reason,
          session.user.name || undefined
        );
      } else if (moderationAction === 'SUSPENSION') {
        subject = 'Cantólico - Conta Suspensa';
        emailTemplate = createSuspensionEmailTemplate(
          userToModerate.name || 'Utilizador',
          reason,
          expiresAt || undefined,
          session.user.name || undefined
        );
      } else if (moderationAction === 'BAN') {
        subject = 'Cantólico - Conta Banida';
        emailTemplate = createBanEmailTemplate(
          userToModerate.name || 'Utilizador',
          reason,
          session.user.name || undefined
        );
      } else {
        throw new Error('Tipo de moderação inválido');
      }

      await sendEmail({
        to: userToModerate.email,
        subject,
        html: emailTemplate
      });

    } catch (emailError) {
      console.error('Erro ao enviar email de moderação:', emailError);
      // Não falhar a moderação por causa do email
    }

    await logAdmin('SUCCESS', 'Utilizador moderado', `Moderação aplicada: ${moderationAction}`, {
      userId: session.user.id,
      targetUserId: userId,
      targetUserName: userToModerate.name,
      targetUserEmail: userToModerate.email,
      moderationType: moderationAction,
      reason,
      duration,
      action: 'user_moderated'
    });

    return NextResponse.json({
      message: 'Moderação aplicada com sucesso',
      moderation
    });
  } catch (error) {
    await logErrors('ERROR', 'Erro ao moderar utilizador', 'Falha na aplicação de moderação', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'user_moderation_error'
    });
    console.error('Erro ao moderar utilizador:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { userId: userIdStr } = await params;
    const userId = parseInt(userIdStr);

    const userToUnmoderate = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    if (!userToUnmoderate) {
      return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
    }

    // Remover moderação (definir como ACTIVE)
    await prisma.userModeration.upsert({
      where: { userId },
      update: {
        status: 'ACTIVE',
        type: null,
        reason: null,
        moderatorNote: null,
        moderatedById: session.user.id,
        moderatedAt: new Date(),
        expiresAt: null,
        updatedAt: new Date(),
      },
      create: {
        userId,
        status: 'ACTIVE',
      },
    });

    await logAdmin('SUCCESS', 'Moderação removida', 'Utilizador foi desmoderado', {
      userId: session.user.id,
      targetUserId: userId,
      targetUserName: userToUnmoderate.name,
      targetUserEmail: userToUnmoderate.email,
      action: 'user_unmoderated'
    });

    return NextResponse.json({
      message: 'Moderação removida com sucesso'
    });
  } catch (error) {
    await logErrors('ERROR', 'Erro ao remover moderação', 'Falha na remoção de moderação', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'user_unmoderation_error'
    });
    console.error('Erro ao remover moderação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
