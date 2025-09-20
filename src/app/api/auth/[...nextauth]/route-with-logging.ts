import { NextRequest, NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loggingMiddleware, logResponse, createSecurityLog } from '@/lib/logging-middleware';

// Wrapper customizado para NextAuth com logging automático
async function authHandler(req: NextRequest) {
  // Inicializar logging para requests de autenticação
  const requestId = await loggingMiddleware(req);
  
  try {
    // Detectar tipo de operação de auth
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'signin';
    const provider = url.searchParams.get('provider') || 'credentials';
    
    // Log específico para tentativas de autenticação
    if (req.method === 'POST') {
      await createSecurityLog('AUTH_ATTEMPT', `Tentativa de ${action} com provider ${provider}`, {
        action,
        provider,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        userAgent: req.headers.get('user-agent')
      });
    }

    // Executar NextAuth handler original
    const handler = NextAuth(authOptions);
    const response = await (req.method === 'GET' ? handler.GET(req) : handler.POST(req));
    
    // Logar resposta
    await logResponse(requestId, response);
    
    return response;
  } catch (error) {
    console.error('Erro no handler de autenticação:', error);
    
    // Criar log de erro
    await createSecurityLog('AUTH_ERROR', 'Erro durante processo de autenticação', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    });
    
    const errorResponse = NextResponse.json(
      { error: 'Authentication Error' },
      { status: 500 }
    );
    
    await logResponse(requestId, errorResponse);
    
    throw error;
  }
}

export { authHandler as GET, authHandler as POST };