import { NextRequest, NextResponse, after } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk-auth';
import { logger } from '@/lib/logger';
import { logUnauthorizedAccess as logUnauthorizedHelper, logForbiddenAccess, logApiRequestError, toErrorContext } from '@/lib/logging-helpers';
import { LogCategory } from '@/types/logging';
import { recordRequest } from '@/lib/otel-metrics';

// Threshold para logs de performance (3 segundos)
const SLOW_REQUEST_THRESHOLD = 3000;
const VERY_SLOW_REQUEST_THRESHOLD = 10000;

// ================================================
// HELPER: Log de request para Loki (fire-and-forget)
// ================================================

async function logRequestToLoki(
  method: string,
  path: string,
  url: string,
  statusCode: number,
  responseTime: number,
  userAgent: string,
  ip: string,
  error?: unknown
): Promise<void> {
  let userPayload: { user_id?: number; user_email?: string; user_role?: any } | undefined;
  try {
    const u = await getAuthenticatedUser();
    if (u) {
      userPayload = { user_id: u.supabaseUserId, user_email: u.email, user_role: u.role };
    }
  } catch { /* unauthenticated route — no user */ }

  const networkPayload = { ip_address: ip, user_agent: userAgent.substring(0, 200) };
  const httpPayload = {
    method: method as any,
    url,
    path,
    status_code: statusCode,
    response_time_ms: responseTime,
  };

  if (error || statusCode >= 500) {
    logger.error(`${method} ${path} → ${statusCode} (${responseTime}ms)`, {
      category: LogCategory.API,
      user: userPayload,
      http: httpPayload,
      network: networkPayload,
      error: error ? {
        error_message: (error as Error)?.message || String(error),
        error_type: (error as Error)?.name || 'UnknownError',
        stack_trace: (error as Error)?.stack,
      } : undefined,
      tags: ['request-end', '5xx'],
    });
  } else if (statusCode >= 400) {
    logger.warn(`${method} ${path} → ${statusCode} (${responseTime}ms)`, {
      category: LogCategory.API,
      user: userPayload,
      http: httpPayload,
      network: networkPayload,
      tags: ['request-end', '4xx'],
    });
  } else if (shouldLogMetrics(url, method)) {
    logger.info(`${method} ${path} → ${statusCode} (${responseTime}ms)`, {
      category: LogCategory.API,
      user: userPayload,
      http: httpPayload,
      network: networkPayload,
      tags: ['request-end'],
    });
  }

  if (responseTime > VERY_SLOW_REQUEST_THRESHOLD) {
    logger.warn(`VERY SLOW: ${method} ${path} (${responseTime}ms)`, {
      category: LogCategory.PERFORMANCE,
      user: userPayload,
      http: { method: method as any, url, path },
      performance: { response_time_ms: responseTime, threshold_ms: VERY_SLOW_REQUEST_THRESHOLD, is_very_slow: true },
      tags: ['performance', 'slow-request', 'critical'],
    });
  } else if (responseTime > SLOW_REQUEST_THRESHOLD) {
    logger.warn(`SLOW: ${method} ${path} (${responseTime}ms)`, {
      category: LogCategory.PERFORMANCE,
      user: userPayload,
      http: { method: method as any, url, path },
      performance: { response_time_ms: responseTime, threshold_ms: SLOW_REQUEST_THRESHOLD, is_very_slow: false },
      tags: ['performance', 'slow-request'],
    });
  }
}

// ================================================
// MIDDLEWARE DE PERFORMANCE E MONITORIZAÇÃO
// ================================================

export async function withPerformanceMonitoring<T>(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse<T>>,
  req: NextRequest,
  ...args: any[]
): Promise<NextResponse<T>> {
  const startTime = Date.now();
  const path = req.nextUrl?.pathname || new URL(req.url).pathname;
  const method = req.method;
  const userAgent = req.headers.get('user-agent') || '';
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  try {
    const response = await handler(req, ...args);
    const responseTime = Date.now() - startTime;
    after(() => logRequestToLoki(method, path, req.url, response.status, responseTime, userAgent, ip).catch(() => {}));
    recordRequest(method, path, response.status, responseTime);
    return response;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    after(() => logRequestToLoki(method, path, req.url, 500, responseTime, userAgent, ip, error).catch(() => {}));
    recordRequest(method, path, 500, responseTime);
    throw error;
  }
}

// Determinar se devemos fazer log das métricas (evitar spam)
function shouldLogMetrics(url: string, method: string): boolean {
  // Não logar endpoints de polling/realtime frequentes
  if (url.includes('/api/logs/realtime')) return false;
  if (url.includes('/api/health')) return false;
  if (url.includes('/api/auth/session')) return false;
  
  // Logar apenas operações importantes
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') return true;
  if (url.includes('/api/admin/')) return true;
  if (url.includes('/api/musics/')) return true;
  if (url.includes('/api/playlists/')) return true;
  
  return false;
}

// ================================================
// LOGS DE TENTATIVAS DE ACESSO NÃO AUTORIZADO
// ================================================

export async function logUnauthorizedAccess(
  req: NextRequest,
  attemptedResource: string,
  reason: string,
  session?: any
) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || '';
  
  logUnauthorizedHelper({
    event_type: 'unauthorized_access',
    resource: attemptedResource,
    user: session?.user ? {
      user_id: session.user.id,
      user_email: session.user.email || undefined,
      user_role: session.user.role
    } : undefined,
    network: {
      ip_address: ip,
      user_agent: userAgent.substring(0, 200)
    },
    details: {
      reason,
      method: req.method,
      referer: req.headers.get('referer') || '',
      action: 'unauthorized_access_attempt',
      isAdminAttempt: attemptedResource.includes('/admin') || attemptedResource.includes('/api/admin')
    }
  });

  // Log additional security warning for admin area access attempts
  if (attemptedResource.includes('/admin') || attemptedResource.includes('/api/admin')) {
    logger.security('Unauthorized admin area access attempt', {
      category: LogCategory.SECURITY,
      user: session?.user ? {
        user_id: session.user.id,
        user_email: session.user.email || undefined,
        user_role: session.user.role
      } : undefined,
      network: {
        ip_address: ip,
        user_agent: userAgent.substring(0, 200)
      },
      tags: ['security', 'unauthorized', 'admin-attempt'],
      details: {
        attemptedResource,
        reason,
        userId: session?.user?.id || 'anonymous',
        userEmail: session?.user?.email || 'anonymous'
      }
    });
  }
}

// ================================================
// LOGS DE AÇÕES CRÍTICAS DE UTILIZADORES
// ================================================

export async function logCriticalAction(
  action: string,
  description: string,
  details: Record<string, any>,
  session: any,
  req?: NextRequest
) {
  const ip = req?.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req?.headers.get('x-real-ip')
    || 'unknown';

  logger.warn(`CRITICAL ACTION: ${action} — ${description}`, {
    category: LogCategory.SECURITY,
    user: session?.user ? {
      user_id: session.user.id,
      user_email: session.user.email || undefined,
      user_role: session.user.role,
    } : undefined,
    network: { ip_address: ip },
    tags: ['critical-action', 'security', action.toLowerCase().replace(/\s+/g, '-')],
    details: { action, description, ...details },
  });
}

// ================================================
// LOGS DE EVENTOS DE SISTEMA
// ================================================

export async function logSystemEvent(
  event: string,
  description: string,
  details: Record<string, any>,
  level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'
) {
  const logFn = level === 'ERROR'
    ? (msg: string, ctx: any) => logger.error(msg, ctx)
    : level === 'WARN'
    ? (msg: string, ctx: any) => logger.warn(msg, ctx)
    : (msg: string, ctx: any) => logger.info(msg, ctx);

  logFn(`SYSTEM EVENT: ${event} — ${description}`, {
    category: LogCategory.SYSTEM,
    tags: ['system-event', event.toLowerCase().replace(/\s+/g, '-')],
    details: { event, description, ...details },
  });
}

// ================================================// ================================================
// LOGS DE UPLOADS E DOWNLOADS
// ================================================

export async function logFileOperation(
  operation: 'upload' | 'download' | 'delete',
  fileName: string,
  fileSize: number,
  fileType: string,
  session: any,
  req?: NextRequest,
  additionalDetails?: Record<string, any>
) {
  const ip = req?.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req?.headers.get('x-real-ip')
    || 'unknown';
  const fileSizeMB = Math.round((fileSize / (1024 * 1024)) * 100) / 100;

  logger.info(`FILE ${operation.toUpperCase()}: ${fileName} (${fileSizeMB}MB)`, {
    category: LogCategory.SYSTEM,
    user: session?.user ? {
      user_id: session.user.id,
      user_email: session.user.email || undefined,
      user_role: session.user.role,
    } : undefined,
    network: { ip_address: ip },
    tags: ['file-operation', operation],
    details: { operation, fileName, fileSize, fileSizeMB, fileType, ...additionalDetails },
  });

  if (operation === 'upload' && fileSize > 50 * 1024 * 1024) {
    logger.warn(`LARGE FILE UPLOAD: ${fileName} (${fileSizeMB}MB)`, {
      category: LogCategory.SYSTEM,
      user: session?.user ? {
        user_id: session.user.id,
        user_email: session.user.email || undefined,
        user_role: session.user.role,
      } : undefined,
      network: { ip_address: ip },
      tags: ['file-upload', 'large-file', 'security'],
      details: { fileName, fileSizeMB, fileType },
    });
  }
}

// ================================================
// LOGS DE ERROS DE BASE DE DADOS
// ================================================

export async function logDatabaseError(
  operation: string,
  table: string,
  error: any,
  query?: string,
  session?: any
) {
  console.error(`❌ [DATABASE ERROR] ${operation} on ${table}:`, {
    code: error?.code,
    message: error?.message,
    hint: error?.hint
  });

  // Log critical database errors
  if (error?.code === '08000' || error?.code === '53300' || error?.message?.includes('connection')) {
    logger.error('Critical database connection error', {
      category: LogCategory.DATABASE,
      user: session?.user ? {
        user_id: session.user.id,
        user_email: session.user.email || undefined,
        user_role: session.user.role
      } : undefined,
      error: toErrorContext(error),
      tags: ['database', 'connection-error', 'critical'],
      details: {
        operation,
        table,
        errorCode: error?.code,
        errorMessage: error?.message,
        query: query?.substring(0, 500) // Limit query length
      }
    });
  }
}