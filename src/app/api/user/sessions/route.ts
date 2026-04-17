import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk-auth';
import { auth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/nextjs/server';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();

  if (!user?.clerkUserId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { sessionId: currentSessionId } = await auth();

    const sessionList = await clerk.sessions.getSessionList({
      userId: user.clerkUserId,
      status: 'active',
    });

    return NextResponse.json({
      sessions: sessionList.data.map((s) => ({
        id: s.id,
        status: s.status,
        lastActiveAt: s.lastActiveAt,
        expireAt: s.expireAt,
        clientId: s.clientId,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        isCurrent: s.id === currentSessionId,
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar sessões:', error);
    return NextResponse.json({ sessions: [] });
  }
}
