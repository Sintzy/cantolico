import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAdmin, logErrors } from '@/lib/logs';
import { sendEmail } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { type, reason, moderatorNote, duration } = await request.json();
    const userId = parseInt(params.userId);

    if (!type || !reason) {
      return NextResponse.json({ error: 'Tipo e motivo são obrigatórios' }, { status: 400 });
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
    if (type === 'SUSPENSION' && duration) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + duration);
    }

    // Criar ou atualizar moderação
    const moderation = await prisma.userModeration.upsert({
      where: { userId },
      update: {
        status: type === 'WARNING' ? 'WARNING' : type === 'SUSPENSION' ? 'SUSPENDED' : 'BANNED',
        type,
        reason,
        moderatorNote,
        moderatedById: session.user.id,
        moderatedAt: new Date(),
        expiresAt,
        updatedAt: new Date(),
      },
      create: {
        userId,
        status: type === 'WARNING' ? 'WARNING' : type === 'SUSPENSION' ? 'SUSPENDED' : 'BANNED',
        type,
        reason,
        moderatorNote,
        moderatedById: session.user.id,
        moderatedAt: new Date(),
        expiresAt,
      },
    });

    // Forçar logout do utilizador - invalidar sessões no NextAuth
    if (type === 'SUSPENSION' || type === 'BAN') {
      // Note: Para implementar logout forçado, seria necessário um sistema de invalidação de tokens
      // Por agora, o middleware irá verificar o status de moderação em cada request
    }

    // Enviar email de notificação
    try {
      const moderationTypeText: Record<string, string> = {
        'WARNING': 'advertido',
        'SUSPENSION': 'suspenso',
        'BAN': 'banido'
      };

      const statusText = moderationTypeText[type] || 'moderado';
      const subject = `Cancioneiro - Conta ${statusText}`;
      
      let emailContent = `
        <h2>Notificação de Moderação - Cancioneiro</h2>
        <p>Olá ${userToModerate.name || 'Utilizador'},</p>
        <p>A sua conta no Cancioneiro foi <strong>${statusText}</strong> pela administração.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
          <h3>Motivo:</h3>
          <p>${reason}</p>
        </div>
      `;

      if (type === 'WARNING') {
        emailContent += `
          <p>Esta é uma advertência. Por favor, reveja os nossos termos de utilização e ajuste o seu comportamento em conformidade.</p>
          <p>Pode continuar a utilizar a plataforma normalmente.</p>
        `;
      } else if (type === 'SUSPENSION') {
        emailContent += `
          <p>A sua conta foi suspensa temporariamente.</p>
          ${expiresAt ? `<p><strong>Data de expiração:</strong> ${expiresAt.toLocaleDateString('pt-PT')}</p>` : ''}
          <p>Durante este período, não poderá aceder à sua conta.</p>
        `;
      } else if (type === 'BAN') {
        emailContent += `
          <p>A sua conta foi permanentemente banida.</p>
          <p>Não poderá mais aceder à plataforma.</p>
        `;
      }

      emailContent += `
        <hr style="margin: 30px 0;">
        <p>Se considera que esta ação foi tomada por engano, pode contactar a administração através do email de suporte.</p>
        <p><small>Esta é uma mensagem automática. Por favor, não responda a este email.</small></p>
        <br>
        <p>Cumprimentos,<br>Equipa Cancioneiro</p>
      `;

      await sendEmail({
        to: userToModerate.email,
        subject,
        html: emailContent
      });

    } catch (emailError) {
      console.error('Erro ao enviar email de moderação:', emailError);
      // Não falhar a moderação por causa do email
    }

    await logAdmin('SUCCESS', 'Utilizador moderado', `Moderação aplicada: ${type}`, {
      userId: session.user.id,
      targetUserId: userId,
      targetUserName: userToModerate.name,
      targetUserEmail: userToModerate.email,
      moderationType: type,
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
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = parseInt(params.userId);

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
