/**
 * API Performance Wrapper
 * 
 * Sistema automático de logging de performance para API routes.
 * Mede response_time_ms, loga avisos quando > 500ms, e injeta request_id/correlation_id.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';
import { LogCategory } from '@/types/logging';
import { getCorrelationContext, runWithCorrelationContextAsync, createCorrelationContext } from './correlation-context';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

// Threshold de performance (configurável via env)
const SLOW_REQUEST_THRESHOLD_MS = parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS || '500', 10);

/**
 * Tipo para handler de API route
 */
export type ApiRouteHandler = (
  req: NextRequest,
  context?: { params?: any }
) => Promise<NextResponse> | NextResponse;

/**
 * Opções para o wrapper de performance
 */
interface PerformanceWrapperOptions {
  /** Nome do endpoint para logs (ex: "GET /api/musics") */
  endpoint?: string;
  /** Se deve logar request start (padrão: true) */
  logStart?: boolean;
  /** Se deve logar request success (padrão: true) */
  logSuccess?: boolean;
  /** Threshold customizado para este endpoint (ms) */
  slowThresholdMs?: number;
  /** Tags adicionais para os logs */
  tags?: string[];
}

/**
 * Extrai informações do usuário da sessão
 */
async function getUserContext(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      return {
        user_id: session.user.id,
        user_email: session.user.email || undefined,
        user_role: session.user.role as any || undefined,
      };
    }
  } catch {
    // Sem sessão
  }
  return {};
}

/**
 * Extrai informações de rede da request
 */
function getNetworkContext(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  return {
    ip_address: ip,
    user_agent: req.headers.get('user-agent') || undefined,
  };
}

/**
 * Wrapper principal de performance para API routes
 * 
 * @example
 * ```typescript
 * export const GET = withPerformanceLogging(
 *   async (req) => {
 *     const data = await fetchData();
 *     return NextResponse.json(data);
 *   },
 *   { endpoint: 'GET /api/musics' }
 * );
 * ```
 */
export function withPerformanceLogging(
  handler: ApiRouteHandler,
  options: PerformanceWrapperOptions = {}
): ApiRouteHandler {
  const {
    endpoint,
    logStart = true,
    logSuccess = true,
    slowThresholdMs = SLOW_REQUEST_THRESHOLD_MS,
    tags = [],
  } = options;

  return async (req: NextRequest, context?: { params?: any }) => {
    const startTime = Date.now();
    const method = req.method;
    const url = req.url;
    const pathname = new URL(url).pathname;
    const endpointName = endpoint || `${method} ${pathname}`;

    // Criar contexto de correlação se não existir
    let correlationContext = getCorrelationContext();
    if (!correlationContext) {
      correlationContext = createCorrelationContext();
    }

    return runWithCorrelationContextAsync(correlationContext, async () => {
      const userContext = await getUserContext(req);
      const networkContext = getNetworkContext(req);

      // Log de início da request
      if (logStart) {
        logger.info('API request started', {
          category: LogCategory.API,
          user: userContext,
          http: {
            method: method as any,
            url,
            path: pathname,
          },
          network: networkContext,
          correlation: correlationContext,
          tags: ['api', 'request-start', method.toLowerCase(), ...tags],
        });
      }

      try {
        // Executar o handler
        const response = await handler(req, context);
        const endTime = Date.now();
        const responseTimeMs = endTime - startTime;
        const statusCode = response.status;

        // Determinar se é uma request lenta
        const isSlow = responseTimeMs > slowThresholdMs;
        const level = isSlow ? 'warn' : 'info';

        // Log de sucesso/performance
        if (logSuccess || isSlow) {
          logger[level]('API request finished', {
            category: isSlow ? LogCategory.PERFORMANCE : LogCategory.API,
            user: userContext,
            http: {
              method: method as any,
              url,
              path: pathname,
              status_code: statusCode,
              response_time_ms: responseTimeMs,
            },
            network: networkContext,
            correlation: correlationContext,
            performance: {
              response_time_ms: responseTimeMs,
              is_slow: isSlow,
              threshold_ms: slowThresholdMs,
            },
            tags: [
              'api',
              'request-finished',
              method.toLowerCase(),
              isSlow ? 'slow-request' : 'normal-speed',
              statusCode >= 200 && statusCode < 300 ? 'success' : 'error',
              ...tags,
            ],
          });
        }

        return response;

      } catch (error) {
        const endTime = Date.now();
        const responseTimeMs = endTime - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;

        // Log de erro
        logger.error('API request failed', {
          category: LogCategory.API,
          user: userContext,
          http: {
            method: method as any,
            url,
            path: pathname,
            status_code: 500,
            response_time_ms: responseTimeMs,
          },
          network: networkContext,
          correlation: correlationContext,
          error: {
            error_message: errorMessage,
            stack_trace: process.env.NODE_ENV === 'development' ? errorStack : undefined,
          },
          tags: ['api', 'request-error', method.toLowerCase(), ...tags],
        });

        // Re-throw para manter comportamento normal
        throw error;
      }
    });
  };
}

/**
 * Helper para criar wrappers de performance com tags específicas de domínio
 */
export function createDomainPerformanceWrapper(domainTags: string[]) {
  return (handler: ApiRouteHandler, options: PerformanceWrapperOptions = {}) => {
    return withPerformanceLogging(handler, {
      ...options,
      tags: [...domainTags, ...(options.tags || [])],
    });
  };
}

// Wrappers pré-configurados para diferentes domínios
export const withMusicPerformance = createDomainPerformanceWrapper(['music', 'songs']);
export const withPlaylistPerformance = createDomainPerformanceWrapper(['playlist']);
export const withAuthPerformance = createDomainPerformanceWrapper(['auth']);
export const withAdminPerformance = createDomainPerformanceWrapper(['admin']);
export const withUserPerformance = createDomainPerformanceWrapper(['user', 'profile']);
