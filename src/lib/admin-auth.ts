import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * Fast admin authentication check for API routes
 * Returns user session if admin, or error response if not
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return { 
      error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
      session: null 
    };
  }
  
  if (session.user.role !== 'ADMIN') {
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
export async function requireReviewer() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return { 
      error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
      session: null 
    };
  }
  
  if (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER') {
    return { 
      error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }),
      session: null 
    };
  }
  
  return { error: null, session };
}
