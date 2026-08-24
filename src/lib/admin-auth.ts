import { NextResponse } from 'next/server';
import { getClerkSession, ClerkSession } from '@/lib/api-middleware';

function isAdminRole(role: ClerkSession['user']['role']) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

/**
 * Fast admin authentication check for API routes
 * Returns user session if admin, or error response if not
 */
export async function requireAdmin(): Promise<{ error: NextResponse | null; session: ClerkSession | null }> {
  const session = await getClerkSession();

  if (!session) {
    return {
      error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
      session: null
    };
  }

  if (!isAdminRole(session.user.role)) {
    return {
      error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }),
      session: null
    };
  }

  return { error: null, session };
}

/**
 * Fast reviewer or admin authentication check
 */
export async function requireReviewer(): Promise<{ error: NextResponse | null; session: ClerkSession | null }> {
  const session = await getClerkSession();

  if (!session) {
    return {
      error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
      session: null
    };
  }

  if (!isAdminRole(session.user.role) && session.user.role !== 'REVIEWER') {
    return {
      error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }),
      session: null
    };
  }

  return { error: null, session };
}
