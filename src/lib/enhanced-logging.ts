import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { logUnauthorizedAccess as logUnauthorizedHelper, logForbiddenAccess, logApiRequestError, toErrorContext } from '@/lib/logging-helpers';
import { LogCategory } from '@/types/logging';

// ================================================
// MIDDLEWARE DE PERFORMANCE E MONITORIZAÇÃO
// ================================================

interface PerformanceMetrics {
  url: string;
  method: string;
  responseTime: number;
  statusCode: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
  userEmail?: string;
}

// Threshold para logs de performance (3 segundos)
const SLOW_REQUEST_THRESHOLD = 3000;
const VERY_SLOW_REQUEST_THRESHOLD = 10000;

export async function withPerformanceMonitoring<T>(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse<T>>,
  req: NextRequest,
  ...args: any[]
): Promise<NextResponse<T>> {
  const startTime = Date.now();
  const url = req.url;
  const method = req.method;
  const userAgent = req.headers.get('user-agent') || '';
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  
  let response: NextResponse<T>;
  let statusCode = 200;
  let session: any = null;

  try {
    // Executar o handler
    response = await handler(req, ...args);
    statusCode = response.status;
    
    // Tentar obter sessão para contexto adicional
    try {
      session = await getServerSession(authOptions);
    } catch (sessionError) {
      // Ignorar erros de sessão
    }

  } catch (error) {
    statusCode = 500;
    
    // Log de erro crítico
    console.error(`❌ [API ERROR] ${method} ${url}:`, error);

    throw error;
  } finally {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Preparar métricas
    const metrics: PerformanceMetrics = {
      url,
      method,
      responseTime,
      statusCode,
      userAgent,
      ip,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    };

    // Log de performance para requisições lentas
    if (responseTime > SLOW_REQUEST_THRESHOLD) {
      const severity = responseTime > VERY_SLOW_REQUEST_THRESHOLD ? 'CRITICAL' : 'WARNING';
      console.warn(`⚠️  [PERFORMANCE] Slow API request (${severity}): ${method} ${url} - ${responseTime}ms`);

      // Log performance degradation for very slow requests
      if (responseTime > VERY_SLOW_REQUEST_THRESHOLD) {
        logger.warn('Very slow API request detected', {
          category: LogCategory.PERFORMANCE,
          tags: ['performance', 'slow-request', 'critical'],
          http: { method: method as any, url, response_time_ms: responseTime },
          network: { ip_address: ip, user_agent: userAgent?.substring(0, 200) },
          performance: { 
            response_time_ms: responseTime,
            is_very_slow: true,
            threshold_ms: VERY_SLOW_REQUEST_THRESHOLD
          },
          details: {
            severity,
            threshold: VERY_SLOW_REQUEST_THRESHOLD
          }
        });
      }
    }

    // Log de erros HTTP
    if (statusCode >= 400) {
      const level = statusCode >= 500 ? 'ERROR' : 'WARN';
      console.error(`❌ [API ${level}] HTTP ${statusCode}: ${method} ${url}`);
    }
  }

  return response!;
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
  const ip = req?.headers.get('x-forwarded-for') || req?.headers.get('x-real-ip') || 'unknown';
  console.log(`🔐 [CRITICAL ACTION] ${action} by ${session?.user?.email || 'unknown'}: ${description}`);
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
  const logFunc = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
  logFunc(`🖥️  [SYSTEM EVENT] ${event}: ${description}`);
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
  const ip = req?.headers.get('x-forwarded-for') || req?.headers.get('x-real-ip') || 'unknown';
  const fileSizeMB = Math.round(fileSize / (1024 * 1024) * 100) / 100;
  console.log(`📁 [FILE ${operation.toUpperCase()}] ${fileName} (${fileSizeMB}MB) by ${session?.user?.email || 'unknown'}`);

  // Log large file uploads
  if (operation === 'upload' && fileSize > 50 * 1024 * 1024) {
    logger.warn('Large file upload detected', {
      category: LogCategory.SYSTEM,
      user: session?.user ? {
        user_id: session.user.id,
        user_email: session.user.email || undefined,
        user_role: session.user.role
      } : undefined,
      network: {
        ip_address: ip
      },
      tags: ['file-upload', 'large-file', 'security'],
      details: {
        fileName,
        fileSize,
        fileSizeMB: Math.round(fileSize / (1024 * 1024) * 100) / 100,
        operation,
        fileType
      }
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