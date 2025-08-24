import { NextRequest } from 'next/server';

/**
 * Lista de domínios permitidos para acesso às APIs
 * Inclui domínios de produção e desenvolvimento
 */
const ALLOWED_ORIGINS = [
  'https://cantolico.vercel.app',
  'https://cancioneiro-cantolico.vercel.app', // Se houver outros domínios
  'http://localhost:3000', // Para desenvolvimento local
  'http://localhost:3001', // Para testes locais
  'http://127.0.0.1:3000', // Localhost alternativo
  'http://127.0.0.1:3001', // Localhost alternativo
];

/**
 * Domínios de desenvolvimento (apenas para modo dev)
 */
const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

/**
 * Lista de User-Agents bloqueados (ferramentas comuns para API scraping)
 */
const BLOCKED_USER_AGENTS = [
  'curl/',
  'wget/',
  'python-requests/',
  'postmanruntime/',
  'insomnia/',
  'httpie/',
  'go-http-client/',
  'node-fetch/',
  'axios/',
  'fetch/',
];

/**
 * Obtém a lista de origens permitidas baseada no ambiente
 */
function getAllowedOrigins(): string[] {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    return ALLOWED_ORIGINS; // Inclui todos os domínios em desenvolvimento
  }
  
  // Em produção, apenas domínios de produção
  return ALLOWED_ORIGINS.filter(origin => !DEV_ORIGINS.includes(origin));
}

/**
 * Verifica se a requisição vem de uma origem autorizada
 */
export function isAuthorizedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const userAgent = request.headers.get('user-agent') || '';
  const host = request.headers.get('host');
  
  const allowedOrigins = getAllowedOrigins();

  // Verificação mais rigorosa de User-Agents bloqueados
  const isBlockedUserAgent = BLOCKED_USER_AGENTS.some(blockedUA => 
    userAgent.toLowerCase().includes(blockedUA.toLowerCase())
  );
  
  if (isBlockedUserAgent) {
    console.warn('[API_PROTECTION] Blocked User-Agent:', userAgent);
    return false;
  }

  // Verificar se é uma requisição do mesmo domínio (same-origin)
  if (host && origin === null) {
    // Requisições same-origin podem não ter origin header
    const protocol = request.headers.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const constructedOrigin = `${protocol}://${host}`;
    
    if (allowedOrigins.includes(constructedOrigin)) {
      return true;
    }
  }

  // Verificar origin header
  if (origin && !allowedOrigins.includes(origin)) {
    console.warn('[API_PROTECTION] Blocked Origin:', origin);
    return false;
  }

  // Verificar referer como fallback (menos confiável)
  if (!origin && referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (!allowedOrigins.includes(refererOrigin)) {
        console.warn('[API_PROTECTION] Blocked Referer:', referer);
        return false;
      }
    } catch (error) {
      console.warn('[API_PROTECTION] Invalid Referer URL:', referer);
      return false;
    }
  }

  // Se chegou até aqui sem origin nem referer válidos, bloquear
  if (!origin && !referer) {
    console.warn('[API_PROTECTION] No Origin or Referer headers');
    return false;
  }

  return true;
}

/**
 * Middleware para proteger rotas de API
 * Retorna uma Response com 401 se não autorizado, ou null se autorizado
 */
export function protectApiRoute(request: NextRequest): Response | null {
  if (!isAuthorizedOrigin(request)) {
    return new Response(
      JSON.stringify({ 
        error: 'Unauthorized',
        message: 'Access denied. This API can only be used from authorized domains.',
        code: 'INVALID_ORIGIN'
      }),
      { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Para permitir que o browser veja a mensagem de erro
        }
      }
    );
  }

  return null;
}

/**
 * Headers CORS seguros para APIs protegidas
 */
export function getSecureCorsHeaders(): Record<string, string> {
  const allowedOrigins = getAllowedOrigins();
  
  return {
    'Access-Control-Allow-Origin': allowedOrigins.join(', '),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Robots-Tag': 'noindex, nofollow', // Previne indexação das APIs
  };
}

/**
 * Aplica headers de segurança a uma resposta
 */
export function applySecurityHeaders(response: Response): Response {
  const headers = getSecureCorsHeaders();
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
