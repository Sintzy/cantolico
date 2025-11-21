/**
 * Sistema de Logging Centralizado
 * 
 * Logger principal com envio direto para Loki via HTTP
 * Otimizado para ambientes serverless (Vercel)
 */

import winston from 'winston';
import {
  LogEvent,
  LogLevel,
  LogCategory,
  LoggerOptions,
  ILogger,
} from '@/types/logging';

/**
 * Configuração do logger a partir de variáveis de ambiente
 */
const LOKI_URL = process.env.LOKI_URL || process.env.NEXT_PUBLIC_LOKI_URL || 'http://localhost:3100';
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'cantolico';
const SERVICE_NAME = 'nextjs';
const ENVIRONMENT = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'staging' | 'test';
const ENABLE_CONSOLE = process.env.ENABLE_CONSOLE_LOGS !== 'false' && ENVIRONMENT === 'development';
const MIN_LOG_LEVEL = process.env.MIN_LOG_LEVEL || (ENVIRONMENT === 'production' ? 'info' : 'debug');

/**
 * Configuração de labels padrão para Loki
 */
const DEFAULT_LABELS = {
  app: APP_NAME,
  service: SERVICE_NAME,
  environment: ENVIRONMENT,
};

/**
 * Mapeamento de níveis customizados para níveis Winston
 */
const CUSTOM_LEVELS = {
  error: 0,
  security: 1,
  warn: 2,
  success: 3,
  info: 4,
  debug: 5,
};

const CUSTOM_COLORS = {
  error: 'red',
  security: 'magenta',
  warn: 'yellow',
  success: 'green',
  info: 'blue',
  debug: 'gray',
};

/**
 * Formatar evento de log para envio ao Loki
 */
function formatLogEventForLoki(event: LogEvent): Record<string, any> {
  return {
    timestamp: event.timestamp || new Date().toISOString(),
    level: event.level,
    category: event.category,
    message: event.message,
    environment: event.environment || ENVIRONMENT,
    
    // Contextos
    ...(event.user && Object.keys(event.user).length > 0 && { user: event.user }),
    ...(event.http && Object.keys(event.http).length > 0 && { http: event.http }),
    ...(event.network && Object.keys(event.network).length > 0 && { network: event.network }),
    ...(event.correlation && Object.keys(event.correlation).length > 0 && { correlation: event.correlation }),
    ...(event.domain && Object.keys(event.domain).length > 0 && { domain: event.domain }),
    ...(event.error && Object.keys(event.error).length > 0 && { error: event.error }),
    ...(event.performance && Object.keys(event.performance).length > 0 && { performance: event.performance }),
    
    // Tags e detalhes
    ...(event.tags && event.tags.length > 0 && { tags: event.tags }),
    ...(event.details && Object.keys(event.details).length > 0 && { details: event.details }),
  };
}

/**
 * Extrair labels do Loki a partir do evento
 * Labels são usados para indexação e filtros rápidos no Loki
 */
function extractLokiLabels(event: LogEvent): Record<string, string> {
  const labels: Record<string, string> = {
    ...DEFAULT_LABELS,
    level: event.level,
    category: event.category,
  };

  // Adicionar user_id como label se existir
  if (event.user?.user_id) {
    labels.user_id = String(event.user.user_id);
  }

  // Adicionar user_email como label se existir
  if (event.user?.user_email) {
    labels.user_email = event.user.user_email;
  }

  // Adicionar user_role como label se existir
  if (event.user?.user_role) {
    labels.user_role = event.user.user_role;
  }

  // Adicionar IDs de domínio como labels quando presentes
  if (event.domain?.song_id) {
    labels.song_id = String(event.domain.song_id);
  }

  if (event.domain?.playlist_id) {
    labels.playlist_id = String(event.domain.playlist_id);
  }

  if (event.domain?.submission_id) {
    labels.submission_id = String(event.domain.submission_id);
  }

  if (event.domain?.email_type) {
    labels.email_type = event.domain.email_type;
  }

  // Adicionar request_id como label se existir
  if (event.correlation?.request_id) {
    labels.request_id = event.correlation.request_id;
  }

  // Adicionar correlation_id como label se existir
  if (event.correlation?.correlation_id) {
    labels.correlation_id = event.correlation.correlation_id;
  }

  // Adicionar tags como string única (separada por vírgulas)
  if (event.tags && event.tags.length > 0) {
    labels.tags = event.tags.join(',');
  }

  // Adicionar método HTTP como label se existir
  if (event.http?.method) {
    labels.http_method = event.http.method;
  }

  // Adicionar status code como label se existir
  if (event.http?.status_code) {
    labels.http_status = String(event.http.status_code);
  }

  return labels;
}

/**
 * Formato customizado para console (desenvolvimento)
 */
const consoleFormat = winston.format.printf((info: any) => {
  const { timestamp, level, message, ...meta } = info;
  
  let output = `${timestamp} [${level.toUpperCase()}] ${message}`;
  
  // Adicionar contexto user se existir
  if (meta.user?.user_id || meta.user?.user_email) {
    output += ` | User: ${meta.user.user_email || meta.user.user_id}`;
  }
  
  // Adicionar request_id se existir
  if (meta.correlation?.request_id) {
    output += ` | ReqID: ${meta.correlation.request_id}`;
  }
  
  // Adicionar IDs de domínio relevantes
  const domainIds: string[] = [];
  if (meta.domain?.song_id) domainIds.push(`song:${meta.domain.song_id}`);
  if (meta.domain?.playlist_id) domainIds.push(`playlist:${meta.domain.playlist_id}`);
  if (meta.domain?.submission_id) domainIds.push(`submission:${meta.domain.submission_id}`);
  
  if (domainIds.length > 0) {
    output += ` | ${domainIds.join(', ')}`;
  }
  
  // Adicionar tags se existirem
  if (meta.tags && meta.tags.length > 0) {
    output += ` | Tags: [${meta.tags.join(', ')}]`;
  }
  
  // Adicionar metadados completos (apenas em debug)
  if (level === 'debug' && Object.keys(meta).length > 0) {
    output += `\n${JSON.stringify(meta, null, 2)}`;
  }
  
  return output;
});

/**
 * Enviar log diretamente para o Loki via HTTP POST
 * Função assíncrona que funciona em ambientes serverless
 */
async function sendToLoki(event: LogEvent, labels: Record<string, string>): Promise<void> {
  if (!LOKI_URL || LOKI_URL === 'http://localhost:3100') {
    if (ENVIRONMENT === 'development') {
      console.log('⚠️ Loki URL not configured, skipping log send');
    }
    return;
  }

  try {
    const formattedLog = formatLogEventForLoki(event);
    
    const payload = {
      streams: [
        {
          stream: labels,
          values: [
            [
              String(Date.now() * 1000000), // Timestamp em nanosegundos
              JSON.stringify(formattedLog),
            ],
          ],
        },
      ],
    };

    const url = `${LOKI_URL}/loki/api/v1/push`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Loki rejected log:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
    }
  } catch (error: any) {
    if (ENVIRONMENT === 'development') {
      console.error('Error sending to Loki:', {
        message: error.message,
        url: LOKI_URL,
      });
    }
  }
}

function createTransports(): winston.transport[] {
  const transports: winston.transport[] = [];

  // Transport para console (sempre ativo para debug)
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.colorize({ colors: CUSTOM_COLORS }),
        consoleFormat
      ),
    })
  );

  return transports;
}

/**
 * Criar instância do Winston Logger
 */
const winstonLogger = winston.createLogger({
  levels: CUSTOM_LEVELS,
  level: MIN_LOG_LEVEL,
  transports: createTransports(),
  exitOnError: false,
});

// Adicionar cores customizadas
winston.addColors(CUSTOM_COLORS);

/**
 * Classe Logger Centralizado
 */
class CentralizedLogger implements ILogger {
  private baseEvent: Partial<LogEvent> = {
    environment: ENVIRONMENT,
  };

  /**
   * Enriquecer evento com dados padrão e timestamp
   */
  private enrichEvent(event: LogEvent): LogEvent {
    return {
      ...this.baseEvent,
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    };
  }

  /**
   * Log genérico
   */
  log(event: LogEvent): void {
    const enrichedEvent = this.enrichEvent(event);
    const formattedEvent = formatLogEventForLoki(enrichedEvent);
    const labels = extractLokiLabels(enrichedEvent);

    // Log para console via Winston
    winstonLogger.log({
      level: event.level,
      message: event.message,
      labels,
      ...formattedEvent,
    });

    // Enviar para Loki de forma assíncrona (fire-and-forget)
    sendToLoki(enrichedEvent, labels).catch((err) => {
      // Ignorar erros de envio para não bloquear a aplicação
      if (ENVIRONMENT === 'development') {
        console.error('Failed to send log to Loki:', err);
      }
    });
  }

  /**
   * Log de informação
   */
  info(message: string, event?: Partial<LogEvent>): void {
    this.log({
      level: LogLevel.INFO,
      category: event?.category || LogCategory.SYSTEM,
      message,
      ...event,
    });
  }

  /**
   * Log de aviso
   */
  warn(message: string, event?: Partial<LogEvent>): void {
    this.log({
      level: LogLevel.WARN,
      category: event?.category || LogCategory.SYSTEM,
      message,
      ...event,
    });
  }

  /**
   * Log de erro
   */
  error(message: string, event?: Partial<LogEvent>): void {
    this.log({
      level: LogLevel.ERROR,
      category: event?.category || LogCategory.SYSTEM,
      message,
      ...event,
    });
  }

  /**
   * Log de sucesso
   */
  success(message: string, event?: Partial<LogEvent>): void {
    this.log({
      level: LogLevel.SUCCESS,
      category: event?.category || LogCategory.SYSTEM,
      message,
      ...event,
    });
  }

  /**
   * Log de segurança
   */
  security(message: string, event?: Partial<LogEvent>): void {
    this.log({
      level: LogLevel.SECURITY,
      category: LogCategory.SECURITY,
      message,
      ...event,
    });
  }

  /**
   * Log de debug
   */
  debug(message: string, event?: Partial<LogEvent>): void {
    this.log({
      level: LogLevel.DEBUG,
      category: event?.category || LogCategory.SYSTEM,
      message,
      ...event,
    });
  }

  /**
   * Definir contexto padrão (útil para testes ou contextos específicos)
   */
  setDefaultContext(context: Partial<LogEvent>): void {
    this.baseEvent = { ...this.baseEvent, ...context };
  }

  /**
   * Limpar contexto padrão
   */
  clearDefaultContext(): void {
    this.baseEvent = { environment: ENVIRONMENT };
  }
}

/**
 * Instância singleton do logger
 */
export const logger = new CentralizedLogger();

/**
 * Exportar para uso em todo o projeto
 */
export default logger;

/**
 * Helper para capturar erros não tratados
 */
if (typeof window === 'undefined') {
  // Apenas no servidor
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception', {
      category: LogCategory.SYSTEM,
      error: {
        error_message: error.message,
        error_type: error.name,
        stack_trace: error.stack,
      },
      tags: ['uncaught-exception', 'critical'],
    });
  });

  process.on('unhandledRejection', (reason: any) => {
    logger.error('Unhandled promise rejection', {
      category: LogCategory.SYSTEM,
      error: {
        error_message: reason?.message || String(reason),
        error_type: reason?.name || 'UnhandledRejection',
        stack_trace: reason?.stack,
      },
      tags: ['unhandled-rejection', 'critical'],
    });
  });
}
