import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userModeration = await prisma.userModeration.findUnique({
      where: { userId: session.user.id },
      select: {
        status: true,
        type: true,
        reason: true,
        moderatedAt: true,
        expiresAt: true,
        moderatorNote: true
      }
    });

    if (!userModeration) {
      return NextResponse.json({
        status: 'ACTIVE',
        type: null,
        reason: null,
        moderatedAt: null,
        expiresAt: null
      });
    }

    // Verificar se a suspensão expirou
    if (userModeration.status === 'SUSPENDED' && userModeration.expiresAt) {
      const now = new Date();
      if (userModeration.expiresAt <= now) {
        // Automaticamente reactivar o utilizador
        await prisma.userModeration.update({
          where: { userId: session.user.id },
          data: {
            status: 'ACTIVE',
            type: null,
            reason: null,
            expiresAt: null,
            updatedAt: new Date()
          }
        });

        return NextResponse.json({
          status: 'ACTIVE',
          type: null,
          reason: null,
          moderatedAt: null,
          expiresAt: null
        });
      }
    }

    return NextResponse.json(userModeration);
  } catch (error) {
    console.error('Erro ao verificar status de moderação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
