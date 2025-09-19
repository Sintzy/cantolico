import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getToken } from 'next-auth/jwt';

// ================================================
// MIDDLEWARE DE LOGGING AUTOMÁTICO
// ================================================

interface LoggingContext {
  startTime: number;
  requestId: string;
  correlationId?: string;
}

// Contexto global para rastreamento de requests
const requestContexts = new Map<string, LoggingContext>();

export async function loggingMiddleware(req: NextRequest, response?: NextResponse) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const correlationId = req.headers.get('x-correlation-id') || generateCorrelationId();
  
  // Armazenar contexto da request
  requestContexts.set(requestId, {
    startTime,
    requestId,
    correlationId
  });

  try {
    // Obter token de autenticação
    const token = await getToken({ req }) as any;
    
    // Obter informações da request
    const method = req.method;
    const url = req.url;
    const userAgent = req.headers.get('user-agent') || '';
    const ip = getClientIP(req);
    const referer = req.headers.get('referer');
    
    // Determinar se deve logar esta request
    if (shouldLogRequest(req)) {
      await logRequest({
        req, // Pass the request object
        method,
        url,
        userAgent,
        ip,
        referer,
        token,
        requestId,
        correlationId,
        startTime
      });
    }

    // Detectar eventos de segurança
    await detectSecurityEvents(req, token);

    return requestId;
  } catch (error) {
    console.error('Erro no middleware de logging:', error);
    return requestId;
  }
}

export async function logResponse(requestId: string, response: NextResponse) {
  const context = requestContexts.get(requestId);
  if (!context) return;

  try {
    const endTime = Date.now();
    const duration = endTime - context.startTime;
    const statusCode = response.status;
    
    await logResponseData({
      requestId: context.requestId,
      correlationId: context.correlationId,
      statusCode,
      duration,
      endTime
    });

    // Detectar eventos de erro
    if (statusCode >= 400) {
      await detectErrorEvents(requestId, statusCode, duration);
    }

  } catch (error) {
    console.error('Erro ao logar response:', error);
  } finally {
    // Limpar contexto
    requestContexts.delete(requestId);
  }
}

// ================================================
// FUNÇÕES DE LOGGING
// ================================================

async function logRequest(data: any) {
  try {
    const logEntry = {
      level: 'INFO',
      category: 'API',
      message: `${data.method} ${new URL(data.url).pathname}`,
      details: {
        fullUrl: data.url,
        userAgent: data.userAgent,
        referer: data.referer,
        headers: getRelevantHeaders(data.req),
        timestamp: new Date().toISOString()
      },
      user_id: data.token?.id || null,
      user_email: data.token?.email || null,
      user_role: data.token?.role || null,
      ip_address: data.ip,
      user_agent: data.userAgent,
      url: data.url,
      method: data.method,
      correlation_id: data.correlationId,
      request_id: data.requestId,
      server_instance: process.env.SERVER_INSTANCE || 'cantolico-main',
      environment: process.env.NODE_ENV || 'production'
    };

    await supabase.from('logs').insert([logEntry]);
  } catch (error) {
    console.error('Erro ao logar request:', error);
  }
}

async function logResponseData(data: any) {
  try {
    await supabase
      .from('logs')
      .update({
        status_code: data.statusCode,
        response_time_ms: data.duration,
        status: data.statusCode >= 400 ? 'FAILED' : 'SUCCESS',
        updated_at: new Date().toISOString()
      })
      .eq('request_id', data.requestId);
  } catch (error) {
    console.error('Erro ao atualizar log de response:', error);
  }
}

// ================================================
// DETECÇÃO DE EVENTOS DE SEGURANÇA
// ================================================

async function detectSecurityEvents(req: NextRequest, token: any) {
  try {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const ip = getClientIP(req);

    // Login de admin
    if (pathname.includes('/api/auth/signin') && token?.role === 'ADMIN') {
      await createSecurityLog('ADMIN_LOGIN', 'Login de administrador detectado', {
        adminEmail: token.email,
        ip,
        userAgent: req.headers.get('user-agent'),
        pathname
      }, token);
    }

    // Acesso a rotas administrativas
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      await createSecurityLog('ADMIN_ACCESS', 'Acesso a área administrativa', {
        pathname,
        userRole: token?.role,
        userEmail: token?.email,
        ip
      }, token);
    }

    // Tentativas de acesso não autorizado
    if (!token && isProtectedRoute(pathname)) {
      await createSecurityLog('UNAUTHORIZED_ACCESS', 'Tentativa de acesso não autorizado', {
        pathname,
        ip,
        userAgent: req.headers.get('user-agent')
      });
    }

    // Detecção de possíveis ataques
    await detectPotentialAttacks(req, token);

  } catch (error) {
    console.error('Erro na detecção de eventos de segurança:', error);
  }
}

async function detectErrorEvents(requestId: string, statusCode: number, duration: number) {
  try {
    let level = 'WARNING';
    let message = `Request com status ${statusCode}`;
    
    if (statusCode >= 500) {
      level = 'ERROR';
      message = `Erro interno do servidor - ${statusCode}`;
    } else if (statusCode === 401) {
      level = 'WARNING';
      message = 'Tentativa de acesso não autorizado';
    } else if (statusCode === 403) {
      level = 'WARNING';
      message = 'Acesso negado';
    }

    // Log de performance lenta
    if (duration > 5000) {
      await supabase.from('logs').insert([{
        level: 'WARNING',
        category: 'PERFORMANCE',
        message: `Request lenta detectada: ${duration}ms`,
        details: {
          duration,
          statusCode,
          threshold: 5000
        },
        response_time_ms: duration,
        correlation_id: requestId
      }]);
    }

  } catch (error) {
    console.error('Erro na detecção de eventos de erro:', error);
  }
}

async function detectPotentialAttacks(req: NextRequest, token: any) {
  try {
    const url = new URL(req.url);
    const ip = getClientIP(req);
    
    // Detecção de SQL injection patterns
    const sqlInjectionPatterns = [
      /(union|select|insert|delete|update|drop|create|alter|exec|execute)/gi,
      /(script|javascript|vbscript|onload|onerror|onclick)/gi,
      /(xp_|sp_|--|\/\*|\*\/)/gi
    ];

    const queryString = url.search;
    const userAgent = req.headers.get('user-agent') || '';
    
    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(queryString) || pattern.test(userAgent)) {
        await createSecurityAlert('POTENTIAL_INJECTION', 'Possível tentativa de injeção detectada', {
          pattern: pattern.toString(),
          queryString,
          userAgent,
          ip
        }, 4);
        break;
      }
    }

    // Detecção de rate limiting
    await checkRateLimit(ip, token);

  } catch (error) {
    console.error('Erro na detecção de ataques:', error);
  }
}

async function checkRateLimit(ip: string, token: any) {
  try {
    // Verificar requests dos últimos 5 minutos
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: recentLogs, count } = await supabase
      .from('logs')
      .select('id', { count: 'exact' })
      .eq('ip_address', ip)
      .gte('created_at', fiveMinutesAgo);

    const requestCount = count || 0;
    
    // Threshold: 100 requests em 5 minutos
    if (requestCount > 100) {
      await createSecurityAlert('RATE_LIMIT_EXCEEDED', 'Limite de rate excedido', {
        ip,
        requestCount,
        timeWindow: '5 minutes',
        threshold: 100,
        userEmail: token?.email
      }, 3);
    }

  } catch (error) {
    console.error('Erro na verificação de rate limit:', error);
  }
}

// ================================================
// FUNÇÕES DE ALERTAS
// ================================================

async function createSecurityLog(eventType: string, message: string, details: any, token?: any) {
  try {
    await supabase.from('logs').insert([{
      level: 'SECURITY',
      category: 'SECURITY',
      message: `[${eventType}] ${message}`,
      details: {
        eventType,
        ...details,
        timestamp: new Date().toISOString()
      },
      user_id: token?.id || null,
      user_email: token?.email || null,
      user_role: token?.role || null,
      ip_address: details.ip,
      user_agent: details.userAgent
    }]);
  } catch (error) {
    console.error('Erro ao criar log de segurança:', error);
  }
}

async function createSecurityAlert(alertType: string, title: string, details: any, severity: number = 3) {
  try {
    // Inserir log primeiro
    const { data: logData } = await supabase.from('logs').insert([{
      level: 'SECURITY',
      category: 'SECURITY',
      message: title,
      details,
      ip_address: details.ip
    }]).select().single();

    if (logData) {
      // Criar alerta
      await supabase.from('security_alerts').insert([{
        log_id: logData.id,
        alert_type: alertType,
        severity,
        title,
        description: `Evento de segurança detectado automaticamente: ${JSON.stringify(details)}`,
        email_recipients: ['sintzyy@gmail.com']
      }]);

      // Enviar email se severidade >= 3
      if (severity >= 3) {
        try {
          await fetch('/api/logs/security-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: 'sintzyy@gmail.com',
              subject: `🚨 ALERTA AUTOMÁTICO: ${title}`,
              alert: {
                alertType,
                severity,
                title,
                description: `Evento detectado automaticamente pelo sistema de segurança`,
                details
              }
            })
          });
        } catch (emailError) {
          console.error('Erro ao enviar email de alerta:', emailError);
        }
      }
    }
  } catch (error) {
    console.error('Erro ao criar alerta de segurança:', error);
  }
}

// ================================================
// FUNÇÕES AUXILIARES
// ================================================

function shouldLogRequest(req: NextRequest): boolean {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const method = req.method;
  
  // Não logar assets estáticos
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2'];
  if (staticExtensions.some(ext => pathname.endsWith(ext))) {
    return false;
  }

  // Não logar health checks
  if (pathname === '/health' || pathname === '/ping') {
    return false;
  }

  // Não logar requests GET para páginas simples (apenas renderização)
  if (method === 'GET') {
    // Logar apenas páginas importantes ou APIs
    const importantPaths = [
      '/admin',
      '/logs',
      '/api/',
      '/musics/create',
      '/playlists/create',
      '/auth/',
      '/login',
      '/register'
    ];
    
    // Se não for um path importante, não logar
    if (!importantPaths.some(path => pathname.startsWith(path))) {
      return false;
    }
  }

  // Sempre logar POST, PUT, DELETE, PATCH
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return true;
  }

  // Logar APIs e páginas importantes
  return true;
}

function isProtectedRoute(pathname: string): boolean {
  const protectedRoutes = [
    '/admin',
    '/api/admin',
    '/musics/create',
    '/playlists/create',
    '/logs'
  ];
  
  return protectedRoutes.some(route => pathname.startsWith(route));
}

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || realIp || 'unknown';
}

function getRelevantHeaders(req: NextRequest): Record<string, string> {
  const relevantHeaders = [
    'accept',
    'accept-language',
    'authorization',
    'content-type',
    'origin',
    'referer',
    'x-forwarded-for',
    'x-real-ip'
  ];

  const headers: Record<string, string> = {};
  
  // Check if req and req.headers exist before processing
  if (!req || !req.headers) {
    return headers;
  }
  
  relevantHeaders.forEach(header => {
    try {
      const value = req.headers.get(header);
      if (value) {
        headers[header] = value;
      }
    } catch (error) {
      // Silently skip header if there's an error reading it
      console.warn(`Error reading header ${header}:`, error);
    }
  });

  return headers;
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateCorrelationId(): string {
  return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ================================================
// EXPORTAÇÕES
// ================================================

export {
  shouldLogRequest,
  isProtectedRoute,
  getClientIP,
  createSecurityLog,
  createSecurityAlert
};