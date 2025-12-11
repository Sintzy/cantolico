/**
 * API Route Wrapper com Logging Automático
 * 
 * Wrapper para API routes do Next.js (App Router) que:
 * - Gera automaticamente request_id
 * - Extrai informações da request (método, URL, IP, user-agent, etc.)
 * - Faz log automático de início, fim e erros
 * - Mede tempo de resposta
 * - Alerta sobre requests lentas
 * - Integra com sistema de correlação
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createCorrelationContext,
  runWithCorrelationContextAsync,
  getRequestDuration,
  getCorrelationContext,
} from './correlation-context';
import {
  logApiRequestStart,
  logApiRequestEnd,
  logApiRequestError,
  logSlowRequest,
} from './logging-helpers';
import { UserContext, NetworkContext, DomainContext } from '@/types/logging';

/**
 * Tipo para handler de API route
 */
type ApiRouteHandler = (
  request: NextRequest,
  context?: { params?: any }
) => Promise<NextResponse> | NextResponse;

/**
 * Opções para o wrapper
 */
interface ApiRouteWrapperOptions {
  /**
   * Limiar de tempo (ms) para considerar uma request lenta
   * @default 500
   */
  slowRequestThreshold?: number;

  /**
   * Se deve fazer log de requests bem-sucedidas
   * @default true
   */
  logSuccess?: boolean;

  /**
   * Se deve fazer log do início da request
   * @default true
   */
  logStart?: boolean;

  /**
   * Contexto de domínio adicional (IDs, etc.)
   */
  domainContext?: Partial<DomainContext>;

  /**
   * Tags adicionais para os logs
   */
  tags?: string[];

  /**
   * Nome/identificador da rota (para logs mais claros)
   */
  routeName?: string;
}

/**
 * Extrair IP address da request
 */
function getIpAddress(request: NextRequest): string | undefined {
  // Tentar obter de headers comuns de proxy
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback para IP da conexão (pode não estar disponível em serverless)
  return undefined;
}

/**
 * Extrair informações de rede da request
 */
function extractNetworkContext(request: NextRequest): NetworkContext {
  return {
    ip_address: getIpAddress(request),
    user_agent: request.headers.get('user-agent') || undefined,
    referer: request.headers.get('referer') || undefined,
    origin: request.headers.get('origin') || undefined,
  };
}

/**
 * Extrair informações de usuário da sessão
 */
async function extractUserContext(request: NextRequest): Promise<UserContext | undefined> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return undefined;
    }

    return {
      user_id: session.user.id,
      user_email: session.user.email || undefined,
      user_role: session.user.role as any,
      user_name: session.user.name || undefined,
    };
  } catch (error) {
    // Se falhar ao obter sessão, retorna undefined
    return undefined;
  }
}

/**
 * Extrair query params da URL
 */
function extractQueryParams(request: NextRequest): Record<string, any> {
  const params: Record<string, any> = {};
  
  request.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

/**
 * Sanitizar corpo da request para logging (remover dados sensíveis)
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  
  // Lista de campos sensíveis para remover
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'api_key',
    'apiKey',
    'authorization',
    'credit_card',
    'creditCard',
    'ssn',
    'cvv',
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Wrapper para API routes com logging automático
 */
export function withLogging(
  handler: ApiRouteHandler,
  options: ApiRouteWrapperOptions = {}
): ApiRouteHandler {
  const {
    slowRequestThreshold = 500,
    logSuccess = true,
    logStart = true,
    domainContext = {},
    tags = [],
    routeName,
  } = options;

  return async (request: NextRequest, context?: { params?: any }) => {
    // Criar contexto de correlação
    const correlationContext = createCorrelationContext();

    // Executar handler dentro do contexto de correlação
    return runWithCorrelationContextAsync(correlationContext, async () => {
      const method = request.method;
      const url = request.url;
      const path = request.nextUrl.pathname;

      // Extrair contextos
      const networkContext = extractNetworkContext(request);
      const userContext = await extractUserContext(request);

      // Atualizar contexto de correlação com dados do usuário
      if (userContext) {
        correlationContext.user_id = userContext.user_id;
        correlationContext.user_email = userContext.user_email || undefined;
        correlationContext.user_role = userContext.user_role;
      }

      if (networkContext.ip_address) {
        correlationContext.ip_address = networkContext.ip_address;
      }

      if (networkContext.user_agent) {
        correlationContext.user_agent = networkContext.user_agent;
      }

      // Extrair query params
      const queryParams = extractQueryParams(request);

      // Tentar extrair body (se aplicável)
      let bodyParams: any = undefined;
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        try {
          // Clone request para poder ler o body
          const clonedRequest = request.clone();
          const contentType = request.headers.get('content-type');
          
          if (contentType?.includes('application/json')) {
            bodyParams = await clonedRequest.json();
            bodyParams = sanitizeBody(bodyParams);
          }
        } catch (error) {
          // Ignorar erros ao tentar ler body
        }
      }

      // Log de início da request
      if (logStart) {
        logApiRequestStart({
          method,
          url,
          path,
          user: userContext,
          network: networkContext,
          correlation: {
            request_id: correlationContext.request_id,
            correlation_id: correlationContext.correlation_id,
          },
          domain: domainContext,
          query_params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
          body_params: bodyParams,
        });
      }

      try {
        // Executar handler
        const response = await handler(request, context);

        // Obter duração da request
        const duration = getRequestDuration() || 0;

        // Log de fim da request (sucesso)
        if (logSuccess) {
          logApiRequestEnd({
            method,
            url,
            path,
            user: userContext,
            network: networkContext,
            correlation: {
              request_id: correlationContext.request_id,
              correlation_id: correlationContext.correlation_id,
            },
            domain: domainContext,
            status_code: response.status,
            response_time_ms: duration,
            query_params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
          });
        }

        // Log de performance (se request foi lenta)
        if (duration > slowRequestThreshold) {
          logSlowRequest({
            endpoint: path,
            method,
            response_time_ms: duration,
            threshold_ms: slowRequestThreshold,
            user: userContext,
            correlation: {
              request_id: correlationContext.request_id,
              correlation_id: correlationContext.correlation_id,
            },
          });
        }

        return response;
      } catch (error: any) {
        // Obter duração da request
        const duration = getRequestDuration() || 0;

        // Determinar status code
        const statusCode = error.statusCode || error.status || 500;

        // Log de erro
        logApiRequestError({
          method,
          url,
          path,
          user: userContext,
          network: networkContext,
          correlation: {
            request_id: correlationContext.request_id,
            correlation_id: correlationContext.correlation_id,
          },
          domain: domainContext,
          status_code: statusCode,
          response_time_ms: duration,
          error: {
            error_message: error.message,
            error_type: error.name,
            error_code: error.code,
            stack_trace: error.stack,
          },
        });

        // Re-throw o erro para que seja tratado pelo Next.js
        throw error;
      }
    });
  };
}

/**
 * Decorator/wrapper simplificado para routes específicas de domínio
 */
export function withSongLogging(handler: ApiRouteHandler) {
  return withLogging(handler, {
    tags: ['songs'],
    routeName: 'songs',
  });
}

export function withPlaylistLogging(handler: ApiRouteHandler) {
  return withLogging(handler, {
    tags: ['playlists'],
    routeName: 'playlists',
  });
}

export function withSubmissionLogging(handler: ApiRouteHandler) {
  return withLogging(handler, {
    tags: ['submissions'],
    routeName: 'submissions',
  });
}

export function withAdminLogging(handler: ApiRouteHandler) {
  return withLogging(handler, {
    tags: ['admin'],
    routeName: 'admin',
    slowRequestThreshold: 1000, // Admin pode ser mais lento
  });
}

/**
 * Helper para adicionar contexto de domínio dinamicamente dentro de uma route
 */
export function addDomainContext(context: Partial<DomainContext>): void {
  // Este contexto será capturado pelos logs subsequentes
  // através do enrichWithCorrelationContext
  const currentContext = getCorrelationContext();
  if (currentContext) {
    // Armazenar no contexto (pode precisar de extensão da interface)
    (currentContext as any).domainContext = {
      ...(currentContext as any).domainContext,
      ...context,
    };
  }
}
