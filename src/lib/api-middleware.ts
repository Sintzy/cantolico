import { NextRequest, NextResponse } from 'next/server';
import { protectApiRoute, applySecurityHeaders } from '@/lib/api-protection';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseUserId } from '@/lib/clerk-auth';

/**
 * Sessão compatível com o formato antigo para manter compatibilidade
 */
export interface ClerkSession {
  user: {
    id: number;
    clerkUserId: string;
    role: string;
    email?: string;
    name?: string;
  };
}

/**
 * Middleware wrapper para proteger automaticamente qualquer rota de API
 * Use este wrapper em todas as rotas de API para aplicar proteção automaticamente
 */
export function withApiProtection<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    // Verificar se a requisição é autorizada
    const unauthorizedResponse = protectApiRoute(request);
    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    try {
      // Executar o handler original
      const response = await handler(request, ...args);

      // Aplicar headers de segurança à resposta
      return applySecurityHeaders(response, request);
    } catch (error) {
      console.error('[API_PROTECTION_ERROR]', error);

      // Em caso de erro, retornar resposta de erro protegida
      const errorResponse = NextResponse.json(
        {
          error: 'Erro interno do servidor',
          message: 'Ocorreu um erro inesperado. Tente novamente mais tarde.'
        },
        { status: 500 }
      );

      return applySecurityHeaders(errorResponse, request);
    }
  };
}

/**
 * Middleware específico para rotas que requerem autenticação
 * Aplica proteção de origem + verificação de autenticação via Clerk
 */
export function withAuthApiProtection<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>
) {
  return withApiProtection(async (request: NextRequest, ...args: T) => {
    // Verificar se há uma sessão válida usando Clerk
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'Esta API requer autenticação. Faça login para continuar.',
          code: 'AUTH_REQUIRED'
        },
        { status: 401 }
      );
    }

    return handler(request, ...args);
  });
}

/**
 * Obtém a sessão Clerk formatada para compatibilidade com código existente
 */
export async function getClerkSession(): Promise<ClerkSession | null> {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return null;
  }

  const supabaseUserId = await getSupabaseUserId(userId);

  if (!supabaseUserId) {
    console.error('❌ [API] Utilizador Clerk não encontrado no Supabase:', userId);
    return null;
  }

  const metadata = sessionClaims?.metadata as { role?: string } | undefined;

  return {
    user: {
      id: supabaseUserId,
      clerkUserId: userId,
      role: metadata?.role || 'USER',
      email: sessionClaims?.email as string | undefined,
      name: sessionClaims?.name as string | undefined,
    }
  };
}
