import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk-auth';
import { createClerkClient } from '@clerk/nextjs/server';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();

  if (!user?.clerkUserId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const sessionList = await clerk.sessions.getSessionList({
      userId: user.clerkUserId,
      status: 'active',
    });

    // Get current session to exclude it
    const { auth } = await import('@clerk/nextjs/server');
    const { sessionId: currentSessionId } = await auth();

    let revokedCount = 0;
    for (const session of sessionList.data) {
      if (session.id === currentSessionId) continue;
      try {
        await clerk.sessions.revokeSession(session.id);
        revokedCount++;
      } catch (error) {
        console.error(`Erro ao revogar sessão ${session.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${revokedCount} sessões revogadas`,
      revokedCount,
    });
  } catch (error) {
    console.error('Erro ao revogar sessões:', error);
    return NextResponse.json({ error: 'Erro ao revogar sessões' }, { status: 500 });
  }
}
