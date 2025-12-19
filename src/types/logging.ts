/**
 * Sistema de Logging Centralizado
 * 
 * Define tipos e interfaces para eventos de log estruturados
 * que serão enviados para Loki via winston-loki
 */

/**
 * Níveis de log suportados
 */
export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  SUCCESS = 'success',
  SECURITY = 'security',
  DEBUG = 'debug'
}

/**
 * Categorias de eventos de log
 */
export enum LogCategory {
  API = 'api',
  USER = 'user',
  USER_ACTION = 'user_action',
  ADMIN = 'admin',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  EMAIL = 'email',
  SYSTEM = 'system',
  DATABASE = 'database',
  MODERATION = 'moderation',
  SUBMISSION = 'submission',
  PLAYLIST = 'playlist',
  SONG = 'song',
  UPLOAD = 'upload',
  AUTH = 'auth',
  HTTP = 'http'
}

/**
 * Contexto de utilizador
 */
export interface UserContext {
  id?: string | number; // Alias para user_id (compatibilidade)
  user_id?: string | number;
  email?: string | null; // Alias para user_email (compatibilidade) - aceita null
  user_email?: string | null;
  role?: 'USER' | 'TRUSTED' | 'REVIEWER' | 'ADMIN' | 'SUPER_ADMIN'; // Alias para user_role (compatibilidade)
  user_role?: 'USER' | 'TRUSTED' | 'REVIEWER' | 'ADMIN' | 'SUPER_ADMIN';
  user_name?: string;
}

/**
 * Contexto HTTP
 */
export interface HttpContext {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  url?: string;
  path?: string;
  status_code?: number;
  response_time_ms?: number;
  query_params?: Record<string, any>;
}

/**
 * Contexto de rede
 */
export interface NetworkContext {
  ip_address?: string;
  user_agent?: string;
  referer?: string;
  origin?: string;
}

/**
 * Contexto de correlação (para rastreamento de requests e workflows)
 */
export interface CorrelationContext {
  request_id?: string;
  correlation_id?: string;
  parent_request_id?: string;
}

/**
 * Contexto de domínio (IDs de entidades do negócio)
 */
export interface DomainContext {
  // Músicas
  song_id?: string | number;
  song_slug?: string;
  song_version_id?: string | number;
  
  // Playlists
  playlist_id?: string | number;
  playlist_slug?: string;
  
  // Submissões
  submission_id?: string | number;
  
  // Banners
  banner_id?: string | number;
  
  // Moderação
  moderation_record_id?: string | number;
  moderated_user_id?: string | number;
  moderator_id?: string | number;
  moderation_status?: string;
  moderation_reason?: string;
  
  // Email
  email_id?: string;
  email_type?: 'verification' | 'password_reset' | 'submission_approved' | 'submission_rejected' | 'notification' | 'welcome' | 'moderation' | 'login_alert';
  email_to?: string;
  email_status?: 'queued' | 'sent' | 'failed' | 'bounced';
  
  // Momentos litúrgicos
  liturgical_moment?: string;
  
  // Instrumentos
  instrument?: string;
  
  // Outros IDs relevantes
  tag_id?: string | number;
  comment_id?: string | number;
  review_id?: string | number;
}

/**
 * Contexto de erro
 */
export interface ErrorContext {
  error_message?: string;
  error_code?: string;
  error_type?: string;
  stack_trace?: string;
  validation_errors?: Record<string, any>;
}

/**
 * Contexto de performance
 */
export interface PerformanceContext {
  response_time_ms?: number;
  duration_ms?: number;
  db_query_count?: number;
  db_query_time_ms?: number;
  cache_hit?: boolean;
  memory_usage_mb?: number;
  is_slow?: boolean;
  is_very_slow?: boolean;
  threshold_ms?: number;
  very_slow_threshold_ms?: number;
}

/**
 * Evento de log completo
 */
export interface LogEvent {
  // Campos obrigatórios
  level: LogLevel;
  category: LogCategory;
  message: string;
  
  // Timestamp (gerado automaticamente se não fornecido)
  timestamp?: Date | string;
  
  // Contextos opcionais
  user?: UserContext;
  http?: HttpContext;
  network?: NetworkContext;
  correlation?: CorrelationContext;
  domain?: DomainContext;
  error?: ErrorContext;
  performance?: PerformanceContext;
  
  // Tags para facilitar filtros e buscas
  tags?: string[];
  
  // Detalhes adicionais (JSON arbitrário)
  details?: Record<string, any>;
  
  // Ambiente
  environment?: 'development' | 'staging' | 'production' | 'test';
}

/**
 * Opções para configuração do logger
 */
export interface LoggerOptions {
  // URL do Loki
  lokiUrl?: string;
  
  // Labels padrão para todas as logs
  defaultLabels?: Record<string, string>;
  
  // Ativar/desativar console em desenvolvimento
  enableConsole?: boolean;
  
  // Nível mínimo de log
  minLevel?: LogLevel;
  
  // Ambiente
  environment?: 'development' | 'staging' | 'production' | 'test';
  
  // Nome da aplicação
  appName?: string;
  
  // Nome do serviço
  serviceName?: string;
}

/**
 * Interface do logger centralizado
 */
export interface ILogger {
  info(message: string, event?: Partial<LogEvent>): void;
  warn(message: string, event?: Partial<LogEvent>): void;
  error(message: string, event?: Partial<LogEvent>): void;
  success(message: string, event?: Partial<LogEvent>): void;
  security(message: string, event?: Partial<LogEvent>): void;
  debug(message: string, event?: Partial<LogEvent>): void;
  
  // Log genérico
  log(event: LogEvent): void;
}

/**
 * Tipos auxiliares para helpers de logging específicos
 */

export interface ApiRequestLogData {
  method: string;
  url: string;
  path?: string;
  user?: UserContext;
  network?: NetworkContext;
  correlation?: CorrelationContext;
  domain?: Partial<DomainContext>;
  query_params?: Record<string, any>;
  body_params?: Record<string, any>;
  // Detalhes arbitrários para inclusão em logs de request/erro
  details?: Record<string, any>;
}

export interface ApiResponseLogData extends ApiRequestLogData {
  status_code: number;
  response_time_ms: number;
  result_count?: number;
  details?: Record<string, any>;
}

export interface ApiErrorLogData extends ApiRequestLogData {
  status_code: number;
  response_time_ms?: number;
  error: ErrorContext;
}

export interface SongLogData {
  song_id?: string | number;
  song_slug?: string;
  song_version_id?: string | number;
  title?: string;
  author?: string;
  liturgical_moments?: string[];
  main_instrument?: string;
  tags?: string[];
  user?: UserContext;
  correlation?: CorrelationContext;
  details?: Record<string, any>;
}

export interface SubmissionLogData {
  submission_id: string | number;
  song_id?: string | number;
  submission_type?: string;
  title?: string;
  status?: string;
  reviewer?: UserContext;
  submitter?: UserContext;
  correlation?: CorrelationContext;
  rejection_reason?: string;
  details?: Record<string, any>;
}

export interface PlaylistLogData {
  playlist_id: string | number;
  playlist_slug?: string;
  name?: string;
  song_ids?: (string | number)[];
  user?: UserContext;
  correlation?: CorrelationContext;
  operation?: 'create' | 'update' | 'delete' | 'add_song' | 'remove_song' | 'share';
  details?: Record<string, any>;
}

export interface AuthLogData {
  user?: UserContext;
  network?: NetworkContext;
  provider?: string;
  success: boolean;
  failure_reason?: string;
  correlation?: CorrelationContext;
  details?: Record<string, any>;
}

export interface EmailLogData {
  email_type: DomainContext['email_type'];
  email_to: string;
  email_status: DomainContext['email_status'];
  user?: UserContext;
  correlation?: CorrelationContext;
  template?: string;
  error?: ErrorContext;
  details?: Record<string, any>;
}

export interface ModerationLogData {
  moderation_record_id?: string | number;
  moderated_user_id: string | number;
  moderated_user_email?: string;
  moderator: UserContext;
  old_status?: string;
  new_status: string;
  reason?: string;
  expires_at?: Date | string;
  correlation?: CorrelationContext;
  details?: Record<string, any>;
}

export interface PerformanceLogData {
  endpoint?: string;
  method?: string;
  response_time_ms: number;
  threshold_ms?: number;
  user?: UserContext;
  http?: HttpContext;
  network?: NetworkContext;
  correlation?: CorrelationContext;
  performance?: PerformanceContext;
  domain?: DomainContext;
  tags?: string[];
  details?: Record<string, any>;
}

export interface SecurityLogData {
  event_type: 'unauthorized_access' | 'forbidden_access' | 'banned_user_blocked' | 'suspicious_activity' | 'brute_force' | 'invalid_token' | 'csrf_detected';
  user?: UserContext;
  network?: NetworkContext;
  correlation?: CorrelationContext;
  resource?: string;
  required_role?: string;
  details?: Record<string, any>;
}
