import { supabase } from '@/lib/supabase-client';
import { useSession } from 'next-auth/react';
import { useCallback } from 'react';

// ================================================
// TIPOS E INTERFACES
// ================================================

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'SECURITY';
export type LogCategory = 'AUTH' | 'MUSIC' | 'PLAYLIST' | 'USER' | 'ADMIN' | 'SYSTEM' | 'API' | 
                         'SECURITY' | 'EMAIL' | 'DATABASE' | 'UPLOAD' | 'PERFORMANCE' | 'BACKUP' | 'MAINTENANCE';
export type LogStatus = 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED' | 'TIMEOUT';

export interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  status?: LogStatus;
  message: string;
  details?: Record<string, any>;
  stackTrace?: string;
  
  // Informações da requisição
  url?: string;
  method?: string;
  statusCode?: number;
  responseTimeMs?: number;
  requestSizeBytes?: number;
  responseSizeBytes?: number;
  
  // Informações técnicas
  serverInstance?: string;
  environment?: string;
  version?: string;
  
  // Metadados
  tags?: string[];
  correlationId?: string;
  parentLogId?: string;
  
  // Geolocalização (opcional)
  countryCode?: string;
  city?: string;
}

export interface SecurityAlert {
  alertType: string;
  severity: 1 | 2 | 3 | 4 | 5; // 1=baixo, 5=crítico
  title: string;
  description: string;
  emailRecipients?: string[];
}

// ================================================
// CONFIGURAÇÕES E CONSTANTES
// ================================================

const LOG_CONFIG = {
  MAX_MESSAGE_LENGTH: 2000,
  MAX_DETAILS_SIZE: 50000, // bytes
  DEFAULT_ENVIRONMENT: process.env.NODE_ENV || 'development',
  SERVER_INSTANCE: process.env.SERVER_INSTANCE || 'cantolico-main',
  VERSION: process.env.APP_VERSION || '1.0.0',
  
  // Configurações de retenção
  AUTO_CLEANUP: true,
  RETENTION_DAYS: {
    DEBUG: 7,
    INFO: 30,
    WARNING: 90,
    ERROR: 365,
    CRITICAL: 999999, // Manter indefinidamente
    SECURITY: 999999  // Manter indefinidamente
  },
  
  // Configurações de alertas de segurança
  SECURITY_ALERTS: {
    MULTIPLE_FAILED_LOGINS: {
      threshold: 5,
      timeWindow: '15 minutes'
    },
    SUSPICIOUS_IP: {
      notify: true
    },
    DATA_BREACH_ATTEMPT: {
      notify: true
    }
  }
};

// ================================================
// HOOK PRINCIPAL DE LOGGING
// ================================================

export function useLogger() {
  const { data: session } = useSession();

  // Função para obter informações do cliente
  const getClientInfo = useCallback(() => {
    if (typeof window === 'undefined') return {};
    
    return {
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenResolution: `${screen.width}x${screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`
    };
  }, []);

  // Função para gerar correlation ID
  const generateCorrelationId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Função principal de logging
  const log = useCallback(async (entry: LogEntry, securityAlert?: SecurityAlert) => {
    try {
      // Prevenir logs de páginas de administração de logs para evitar recursão
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const isLogsPage = currentPath.includes('/logs') || currentPath.includes('/admin');
        
        // Não criar logs se estivermos numa página de logs ou admin (exceto logs críticos)
        if (isLogsPage && entry.level !== 'CRITICAL' && entry.level !== 'SECURITY') {
          console.log('Log ignorado para prevenir recursão:', entry.message);
          return;
        }
      }

      const clientInfo = getClientInfo();
      const timestamp = new Date().toISOString();
      
      // Validações
      if (!entry.message || entry.message.length === 0) {
        console.warn('Logger: Mensagem de log vazia ignorada');
        return;
      }

      // Truncar mensagem se muito longa
      const message = entry.message.length > LOG_CONFIG.MAX_MESSAGE_LENGTH 
        ? entry.message.substring(0, LOG_CONFIG.MAX_MESSAGE_LENGTH) + '...'
        : entry.message;

      // Preparar detalhes com informações do cliente
      const details = {
        ...(entry.details || {}),
        clientInfo,
        sessionInfo: session ? {
          userId: session.user?.id,
          userEmail: session.user?.email,
          userRole: session.user?.role
        } : null,
        timestamp,
        browserFingerprint: generateBrowserFingerprint()
      };

      // Verificar tamanho dos detalhes
      const detailsString = JSON.stringify(details);
      if (detailsString.length > LOG_CONFIG.MAX_DETAILS_SIZE) {
        (details as any).warning = 'Detalhes truncados devido ao tamanho';
        delete details.clientInfo.userAgent; // Remover campo grande primeiro
      }

      // Preparar dados do log
      const logData = {
        level: entry.level,
        category: entry.category,
        status: entry.status || 'SUCCESS',
        message,
        details,
        stack_trace: entry.stackTrace || null,
        
        // Informações do utilizador
        user_id: session?.user?.id || null,
        user_email: session?.user?.email || null,
        user_role: session?.user?.role || null,
        
        // Informações da sessão
        session_id: getSessionId(),
        ip_address: await getClientIP(),
        user_agent: clientInfo.userAgent,
        country_code: entry.countryCode || null,
        city: entry.city || null,
        
        // Informações HTTP
        url: entry.url || clientInfo.url,
        method: entry.method || null,
        status_code: entry.statusCode || null,
        response_time_ms: entry.responseTimeMs || null,
        request_size_bytes: entry.requestSizeBytes || null,
        response_size_bytes: entry.responseSizeBytes || null,
        
        // Informações técnicas
        server_instance: entry.serverInstance || LOG_CONFIG.SERVER_INSTANCE,
        environment: entry.environment || LOG_CONFIG.DEFAULT_ENVIRONMENT,
        version: entry.version || LOG_CONFIG.VERSION,
        
        // Metadados
        tags: entry.tags || [],
        correlation_id: entry.correlationId || generateCorrelationId(),
        parent_log_id: entry.parentLogId || null,
        
        // Retenção automática
        expires_at: calculateExpirationDate(entry.level)
      };

      // Inserir log no Supabase
      const { data: logResult, error: logError } = await supabase
        .from('logs')
        .insert([logData])
        .select('id')
        .single();

      if (logError) {
        console.error('Erro ao inserir log:', logError);
        // Fallback: log local em caso de erro
        console.log('FALLBACK_LOG:', logData);
        return;
      }

      // Process security alert by creating a SECURITY log entry with tag 'security'
      if (securityAlert && logResult?.id) {
        try {
          const alertLog = {
            level: 'SECURITY' as const,
            category: 'SECURITY' as const,
            status: 'SUCCESS',
            message: securityAlert.title,
            details: {
              description: securityAlert.description,
              alertType: securityAlert.alertType,
              severity: securityAlert.severity,
              emailRecipients: securityAlert.emailRecipients || []
            },
            stackTrace: null,
            user_id: session?.user?.id || null,
            user_email: session?.user?.email || null,
            user_role: session?.user?.role || null,
            session_id: getSessionId(),
            ip_address: await getClientIP(),
            user_agent: clientInfo.userAgent,
            url: entry.url || clientInfo.url,
            method: entry.method || null,
            status_code: entry.statusCode || null,
            response_time_ms: entry.responseTimeMs || null,
            server_instance: entry.serverInstance || LOG_CONFIG.SERVER_INSTANCE,
            environment: entry.environment || LOG_CONFIG.DEFAULT_ENVIRONMENT,
            version: entry.version || LOG_CONFIG.VERSION,
            tags: [...(entry.tags || []), 'security'],
            correlation_id: entry.correlationId || generateCorrelationId(),
            parent_log_id: logResult.id,
            expires_at: calculateExpirationDate('SECURITY')
          };

          await supabase.from('logs').insert([alertLog]);
        } catch (err) {
          console.error('Erro ao persistir alerta de segurança como log:', err);
        }
      }

      // Auto-detectar alertas de segurança críticos
      if (shouldTriggerSecurityAlert(entry)) {
        await autoDetectSecurityAlert(logResult?.id || null, entry);
      }

      return logResult?.id;

    } catch (error) {
      console.error('Erro crítico no sistema de logging:', error);
      
      // Log de emergência local
      console.log('EMERGENCY_LOG:', {
        level: entry.level,
        category: entry.category,
        message: entry.message,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  }, [supabase, session]);

  // ================================================
  // FUNÇÕES DE CONVENIÊNCIA
  // ================================================

  const debug = useCallback((category: LogCategory, message: string, details?: Record<string, any>) => {
    return log({ level: 'DEBUG', category, message, details, status: 'SUCCESS' });
  }, [log]);

  const info = useCallback((category: LogCategory, message: string, details?: Record<string, any>) => {
    return log({ level: 'INFO', category, message, details, status: 'SUCCESS' });
  }, [log]);

  const warning = useCallback((category: LogCategory, message: string, details?: Record<string, any>) => {
    return log({ level: 'WARNING', category, message, details, status: 'SUCCESS' });
  }, [log]);

  const error = useCallback((category: LogCategory, message: string, details?: Record<string, any>, stackTrace?: string) => {
    return log({ level: 'ERROR', category, message, details, stackTrace, status: 'FAILED' });
  }, [log]);

  const critical = useCallback((category: LogCategory, message: string, details?: Record<string, any>, stackTrace?: string) => {
    return log({ level: 'CRITICAL', category, message, details, stackTrace, status: 'FAILED' });
  }, [log]);

  const security = useCallback((
    message: string, 
    details?: Record<string, any>, 
    alert?: SecurityAlert
  ) => {
    return log({ 
      level: 'SECURITY', 
      category: 'SECURITY', 
      message, 
      details, 
      status: details?.blocked ? 'SUCCESS' : 'FAILED'
    }, alert);
  }, [log]);

  // ================================================
  // FUNÇÕES ESPECIALIZADAS
  // ================================================

  // Log de autenticação
  const authLog = useCallback((action: string, success: boolean, details?: Record<string, any>) => {
    const level = success ? 'INFO' : 'WARNING';
    const status = success ? 'SUCCESS' : 'FAILED';
    
    return log({
      level,
      category: 'AUTH',
      message: `Autenticação: ${action}`,
      details: {
        action,
        success,
        ...details
      },
      status
    });
  }, [log]);

  // Log de operações administrativas
  const adminLog = useCallback((action: string, target: string, details?: Record<string, any>) => {
    return log({
      level: 'INFO',
      category: 'ADMIN',
      message: `Admin: ${action} - ${target}`,
      details: {
        action,
        target,
        adminUser: session?.user?.email,
        ...details
      }
    });
  }, [log, session]);

  // Log de performance
  const performanceLog = useCallback((operation: string, duration: number, details?: Record<string, any>) => {
    const level = duration > 5000 ? 'WARNING' : 'INFO'; // Mais de 5s é lento
    
    return log({
      level,
      category: 'PERFORMANCE',
      message: `Performance: ${operation} (${duration}ms)`,
      details: {
        operation,
        duration,
        ...details
      },
      responseTimeMs: duration
    });
  }, [log]);

  // Log de API
  const apiLog = useCallback((
    method: string, 
    url: string, 
    statusCode: number, 
    duration: number,
    details?: Record<string, any>
  ) => {
    const level = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARNING' : 'INFO';
    const status = statusCode >= 400 ? 'FAILED' : 'SUCCESS';
    
    return log({
      level,
      category: 'API',
      message: `API: ${method} ${url} - ${statusCode}`,
      details,
      method,
      url,
      statusCode,
      responseTimeMs: duration,
      status
    });
  }, [log]);

  // ================================================
  // FUNÇÕES AUXILIARES
  // ================================================

  // Gerar fingerprint do browser
  const generateBrowserFingerprint = () => {
    if (typeof window === 'undefined') return null;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('Browser fingerprint', 2, 2);
    
    return {
      canvas: canvas.toDataURL(),
      screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
      timezone: new Date().getTimezoneOffset(),
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack
    };
  };

  // Obter IP do cliente (com cache em sessionStorage)
  const getClientIP = async () => {
    if (typeof window === 'undefined') return null;
    
    // Verificar cache primeiro
    const cachedIP = sessionStorage.getItem('client_ip');
    if (cachedIP && cachedIP !== 'null') return cachedIP;
    
    try {
      const response = await fetch('/api/logs/client-info');
      
      // Verificar se a resposta está OK
      if (!response.ok) {
        console.warn('Falha ao obter IP do cliente:', response.status);
        return null;
      }
      
      // Verificar se há conteúdo na resposta
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.warn('Resposta vazia do endpoint client-info');
        return null;
      }
      
      const data = JSON.parse(text);
      const ip = data.ip || null;
      
      // Cache o IP (mesmo que seja null)
      sessionStorage.setItem('client_ip', ip || 'null');
      return ip;
    } catch (error) {
      console.warn('Erro ao obter IP do cliente:', error);
      sessionStorage.setItem('client_ip', 'null'); // Cache o erro
      return null;
    }
  };

  // Obter session ID
  const getSessionId = () => {
    if (typeof window === 'undefined') return null;
    
    let sessionId = sessionStorage.getItem('log_session_id');
    if (!sessionId) {
      sessionId = generateCorrelationId();
      sessionStorage.setItem('log_session_id', sessionId);
    }
    return sessionId;
  };

  // Calcular data de expiração baseada no nível
  const calculateExpirationDate = (level: LogLevel) => {
    const days = LOG_CONFIG.RETENTION_DAYS[level];
    if (days === 999999) return null; // Nunca expira
    
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);
    return expirationDate.toISOString();
  };

  // Verificar se deve disparar alerta de segurança
  const shouldTriggerSecurityAlert = (entry: LogEntry) => {
    return (
      entry.level === 'SECURITY' ||
      entry.level === 'CRITICAL' ||
      (entry.category === 'AUTH' && entry.status === 'FAILED') ||
      (entry.category === 'ADMIN' && entry.level === 'ERROR') ||
      (entry.statusCode && entry.statusCode === 401 && entry.url?.includes('/admin'))
    );
  };

  // Processar alerta de segurança
  const processSecurityAlert = async (logId: string, alert: SecurityAlert) => {
    try {
      const alertData = {
        log_id: logId,
        alert_type: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        email_recipients: alert.emailRecipients || []
      };

      // Persistir alerta como um log com tag 'security' em vez de tabela dedicada
      const alertLog = {
        level: 'SECURITY' as const,
        category: 'SECURITY' as const,
        status: 'SUCCESS',
        message: alert.title,
        details: {
          description: alert.description,
          alertType: alert.alertType,
          severity: alert.severity,
          emailRecipients: alert.emailRecipients || []
        },
        user_id: session?.user?.id || null,
        user_email: session?.user?.email || null,
        user_role: session?.user?.role || null,
        session_id: getSessionId(),
        ip_address: await getClientIP(),
        user_agent: getClientInfo().userAgent,
        url: undefined,
        method: undefined,
        status_code: undefined,
        response_time_ms: undefined,
        server_instance: LOG_CONFIG.SERVER_INSTANCE,
        environment: LOG_CONFIG.DEFAULT_ENVIRONMENT,
        version: LOG_CONFIG.VERSION,
        tags: ['security'],
        correlation_id: generateCorrelationId(),
        parent_log_id: logId || null,
        expires_at: calculateExpirationDate('SECURITY')
      };

      const { error: insertError } = await supabase
        .from('logs')
        .insert([alertLog]);

      if (insertError) {
        console.error('Erro ao criar alerta de segurança como log:', insertError);
      }
    } catch (error) {
      console.error('Erro ao processar alerta de segurança:', error);
    }
  };

  // Auto-detectar alertas de segurança
  const autoDetectSecurityAlert = async (logId: string | null, entry: LogEntry) => {
    try {
      // Login de admin
      if (entry.category === 'AUTH' && entry.details?.action === 'login' && 
          session?.user?.role === 'ADMIN' && entry.status === 'SUCCESS') {
        
        // Log apenas para auditoria (sem alertas de email para admins)
        console.log(`Login de administrador registado: ${session.user.email}`);
      }

      // Múltiplas falhas de login
      if (entry.category === 'AUTH' && entry.status === 'FAILED') {
        const recentFailures = await supabase
          .from('logs')
          .select('id')
          .eq('category', 'AUTH')
          .eq('status', 'FAILED')
          .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
          .eq('ip_address', entry.details?.clientInfo?.ip);

        if (recentFailures.data && recentFailures.data.length >= 5) {
          await processSecurityAlert(logId!, {
            alertType: 'MULTIPLE_FAILED_LOGINS',
            severity: 4,
            title: 'Múltiplas Tentativas de Login Falhadas',
            description: `5+ tentativas de login falhadas do IP ${entry.details?.clientInfo?.ip} nos últimos 15 minutos`,
            emailRecipients: []
          });
        }
      }

    } catch (error) {
      console.error('Erro na auto-detecção de alertas:', error);
    }
  };

  // Alertas de segurança registrados apenas no sistema (sem emails automáticos)

  // ================================================
  // RETORNO DO HOOK
  // ================================================

  return {
    // Funções principais
    log,
    debug,
    info,
    warning,
    error,
    critical,
    security,
    
    // Funções especializadas
    authLog,
    adminLog,
    performanceLog,
    apiLog,
    
    // Utilitários
    generateCorrelationId,
    getSessionId,
    
    // Configurações
    config: LOG_CONFIG
  };
}

// ================================================
// HOOK PARA ANALYTICS
// ================================================

export function useLogAnalytics() {

  const getStatistics = useCallback(async (period: 'day' | 'week' | 'month' = 'day') => {
    try {
      const { data, error } = await supabase
        .from('log_statistics')
        .select('*')
        .eq('period_type', period)
        .order('period_start', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return [];
    }
  }, [supabase]);

  const getRecentLogs = useCallback(async (limit = 100) => {
    try {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar logs recentes:', error);
      return [];
    }
  }, [supabase]);

  const getSecurityAlerts = useCallback(async (status = 'ACTIVE') => {
    try {
      // NOTE: security alerts are now stored as logs with the tag 'security'.
      // The `status` parameter is kept for compatibility but currently ignored.
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .contains('tags', ['security'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar alertas de segurança:', error);
      return [];
    }
  }, [supabase]);

  return {
    getStatistics,
    getRecentLogs,
    getSecurityAlerts
  };
}

// ================================================
// EXPORTAÇÕES ADICIONAIS
// ================================================

export default useLogger;