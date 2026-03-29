import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk-auth';
import { createClerkClient } from '@clerk/nextjs/server';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { sessionId } = body;

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID obrigatório' }, { status: 400 });
  }

  try {
    await clerk.sessions.revokeSession(sessionId);
    return NextResponse.json({ success: true, message: 'Sessão revogada' });
  } catch (error) {
    console.error('Erro ao revogar sessão:', error);
    return NextResponse.json({ error: 'Erro ao revogar sessão' }, { status: 500 });
  }
}
