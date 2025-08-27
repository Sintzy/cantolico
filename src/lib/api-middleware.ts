import { NextRequest, NextResponse } from 'next/server';
import { protectApiRoute, applySecurityHeaders } from '@/lib/api-protection';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

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
 * Aplica proteção de origem + verificação de autenticação
 */
export function withAuthApiProtection<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>
) {
  return withApiProtection(async (request: NextRequest, ...args: T) => {
    // Verificar se há uma sessão válida usando next-auth
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
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
