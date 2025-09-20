import { NextRequest, NextResponse } from 'next/server';
import { loggingMiddleware, logResponse } from '@/lib/logging-middleware';

// Middleware específico para APIs que não passam pelo middleware principal
export async function apiLoggingMiddleware(req: NextRequest, handler: () => Promise<NextResponse>) {
  // Inicializar logging
  const requestId = await loggingMiddleware(req);
  
  try {
    // Executar o handler da API
    const response = await handler();
    
    // Logar resposta
    await logResponse(requestId, response);
    
    return response;
  } catch (error) {
    // Em caso de erro, criar resposta de erro e logar
    const errorResponse = NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
    
    await logResponse(requestId, errorResponse);
    
    throw error;
  }
}

// Wrapper para facilitar uso em APIs
export function withApiLogging(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    return apiLoggingMiddleware(req, () => handler(req));
  };
}