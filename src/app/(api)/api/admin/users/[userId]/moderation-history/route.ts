import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
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

    // Buscar histórico de moderação
    const moderationHistory = await prisma.userModeration.findMany({
      where: { userId },
      include: {
        moderatedBy: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { moderatedAt: 'desc' }
    });

    return NextResponse.json({ history: moderationHistory });
  } catch (error) {
    console.error('Erro ao buscar histórico de moderação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
