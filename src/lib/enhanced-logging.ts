import { NextRequest, NextResponse } from 'next/server';
import { log, logGeneral, logErrors } from '@/lib/logs';
import { createSecurityLog, createSecurityAlert } from '@/lib/logging-middleware';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
    await logErrors('ERROR', 'Erro interno na API', error instanceof Error ? error.message : 'Erro desconhecido', {
      url,
      method,
      ip,
      userAgent,
      stack: error instanceof Error ? error.stack : undefined,
      action: 'api_internal_error'
    });

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
      const level = responseTime > VERY_SLOW_REQUEST_THRESHOLD ? 'ERROR' : 'WARN';
      const severity = responseTime > VERY_SLOW_REQUEST_THRESHOLD ? 'HIGH' : 'MEDIUM';
      
      await logGeneral(level, 'Requisição lenta detectada', `API respondeu em ${responseTime}ms`, {
        ...metrics,
        action: 'slow_api_response',
        threshold: SLOW_REQUEST_THRESHOLD,
        category: 'PERFORMANCE'
      });

      // Criar alerta de segurança para requisições muito lentas
      if (responseTime > VERY_SLOW_REQUEST_THRESHOLD) {
        await createSecurityAlert('PERFORMANCE_DEGRADATION', `API muito lenta: ${url}`, {
          responseTime,
          threshold: VERY_SLOW_REQUEST_THRESHOLD,
          url,
          method,
          ip,
          userAgent: userAgent.substring(0, 200) // Limitar tamanho
        }, session?.user);
      }
    }

    // Log de erros HTTP
    if (statusCode >= 400) {
      const level = statusCode >= 500 ? 'ERROR' : 'WARN';
      const category = statusCode >= 500 ? 'API_ERROR' : 'API_CLIENT_ERROR';
      
      await logGeneral(level, `Erro HTTP ${statusCode}`, `${method} ${url} retornou ${statusCode}`, {
        ...metrics,
        action: 'api_error_response',
        category
      });
    }

    // Log de métricas gerais (apenas para endpoints importantes, evitar spam)
    if (shouldLogMetrics(url, method)) {
      await logGeneral('INFO', 'Métrica de API', `${method} ${url}`, {
        responseTime,
        statusCode,
        url,
        method,
        userId: session?.user?.id,
        action: 'api_metrics',
        category: 'METRICS'
      });
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
  
  await createSecurityLog('UNAUTHORIZED_ACCESS', 'Tentativa de acesso não autorizado', {
    attemptedResource,
    reason,
    ip,
    userAgent: userAgent.substring(0, 200),
    userId: session?.user?.id,
    userEmail: session?.user?.email,
    method: req.method,
    referer: req.headers.get('referer') || '',
    action: 'unauthorized_access_attempt'
  }, session?.user);

  // Criar alerta se for tentativa de acesso a área admin
  if (attemptedResource.includes('/admin') || attemptedResource.includes('/api/admin')) {
    await createSecurityAlert('UNAUTHORIZED_ADMIN_ACCESS', 'Tentativa de acesso a área administrativa', {
      attemptedResource,
      reason,
      ip,
      userAgent: userAgent.substring(0, 200),
      userId: session?.user?.id || 'anonymous',
      userEmail: session?.user?.email || 'anonymous'
    }, session?.user);
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
  
  await logGeneral('INFO', `Ação crítica: ${action}`, description, {
    ...details,
    userId: session?.user?.id,
    userEmail: session?.user?.email,
    userRole: session?.user?.role,
    ip,
    action: `critical_action_${action.toLowerCase().replace(/\s+/g, '_')}`,
    category: 'CRITICAL_ACTION',
    timestamp: new Date().toISOString()
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
  await logGeneral(level, `Evento de sistema: ${event}`, description, {
    ...details,
    action: `system_event_${event.toLowerCase().replace(/\s+/g, '_')}`,
    category: 'SYSTEM',
    timestamp: new Date().toISOString()
  });
}

// ================================================
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
  
  await logGeneral('INFO', `Operação de ficheiro: ${operation}`, `${operation} de ${fileName}`, {
    operation,
    fileName,
    fileSize,
    fileType,
    fileSizeMB: Math.round(fileSize / (1024 * 1024) * 100) / 100,
    userId: session?.user?.id,
    userEmail: session?.user?.email,
    ip,
    ...additionalDetails,
    action: `file_${operation}`,
    category: 'FILE_OPERATION'
  });

  // Alerta para uploads muito grandes (>50MB)
  if (operation === 'upload' && fileSize > 50 * 1024 * 1024) {
    await createSecurityAlert('LARGE_FILE_UPLOAD', 'Upload de ficheiro muito grande', {
      fileName,
      fileSize,
      fileSizeMB: Math.round(fileSize / (1024 * 1024) * 100) / 100,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      ip
    }, session?.user);
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
  await logErrors('ERROR', 'Erro de base de dados', `Erro em ${operation} na tabela ${table}`, {
    operation,
    table,
    errorCode: error?.code,
    errorMessage: error?.message,
    errorHint: error?.hint,
    errorDetails: error?.details,
    query: query?.substring(0, 500), // Limitar tamanho da query
    userId: session?.user?.id,
    userEmail: session?.user?.email,
    action: 'database_error',
    category: 'DATABASE'
  });

  // Criar alerta para erros críticos de DB
  if (error?.code === '08000' || error?.code === '53300' || error?.message?.includes('connection')) {
    await createSecurityAlert('DATABASE_CONNECTION_ERROR', 'Erro de conexão com base de dados', {
      operation,
      table,
      errorCode: error?.code,
      errorMessage: error?.message
    });
  }
}