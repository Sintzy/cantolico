/**
 * Helpers de Logging para Domínios Específicos
 * 
 * Funções auxiliares que encapsulam a lógica de logging para diferentes
 * áreas do sistema, garantindo consistência e completude dos logs.
 */

import { logger } from './logger';
import {
  LogCategory,
  LogLevel,
  ApiRequestLogData,
  ApiResponseLogData,
  ApiErrorLogData,
  SongLogData,
  SubmissionLogData,
  PlaylistLogData,
  AuthLogData,
  EmailLogData,
  ModerationLogData,
  PerformanceLogData,
  SecurityLogData,
  ErrorContext,
} from '@/types/logging';

/**
 * ==========================================
 * UTILITY FUNCTIONS
 * ==========================================
 */

/**
 * Converte PostgrestError para ErrorContext
 */
export function toErrorContext(error: any): ErrorContext {
  if (!error) {
    return { error_message: 'Unknown error' };
  }
  
  // Se já é um ErrorContext válido, retorna
  if (error.error_message || error.error_code) {
    return error;
  }
  
  // Converte PostgrestError ou Error genérico
  return {
    error_message: error.message || String(error),
    error_code: error.code || error.name,
    error_type: error.constructor?.name || 'Error',
    stack_trace: error.stack,
  };
}

/**
 * ==========================================
 * HELPERS PARA API REQUESTS
 * ==========================================
 */

/**
 * Log de início de request API
 */
export function logApiRequestStart(data: ApiRequestLogData): void {
  logger.info('API request started', {
    category: LogCategory.API,
    user: data.user,
    http: {
      method: data.method as any,
      url: data.url,
      path: data.path,
      query_params: data.query_params,
    },
    network: data.network,
    correlation: data.correlation,
    domain: data.domain,
    tags: ['api', 'request-start', data.method.toLowerCase()],
    details: {
      body_params: data.body_params,
    },
  });
}

/**
 * Log de fim de request API (sucesso)
 */
export function logApiRequestEnd(data: ApiResponseLogData): void {
  logger.info('API request finished', {
    category: LogCategory.API,
    user: data.user,
    http: {
      method: data.method as any,
      url: data.url,
      path: data.path,
      status_code: data.status_code,
      response_time_ms: data.response_time_ms,
    },
    network: data.network,
    correlation: data.correlation,
    domain: data.domain,
    tags: ['api', 'request-end', data.method.toLowerCase(), `status-${data.status_code}`],
    details: {
      result_count: data.result_count,
      ...data.details,
    },
  });
}

/**
 * Log de erro em request API
 */
export function logApiRequestError(data: ApiErrorLogData): void {
  logger.error('API request failed', {
    category: LogCategory.API,
    user: data.user,
    http: {
      method: data.method as any,
      url: data.url,
      path: data.path,
      status_code: data.status_code,
      response_time_ms: data.response_time_ms,
    },
    network: data.network,
    correlation: data.correlation,
    domain: data.domain,
    error: data.error,
    tags: ['api', 'error', data.method.toLowerCase(), `status-${data.status_code}`],
  });
}

/**
 * ==========================================
 * HELPERS PARA SONGS
 * ==========================================
 */

/**
 * Log de criação de música
 */
export function logSongCreated(data: SongLogData): void {
  logger.success('Song created', {
    category: LogCategory.SONG,
    user: data.user,
    correlation: data.correlation,
    domain: {
      song_id: data.song_id,
      song_slug: data.song_slug,
      song_version_id: data.song_version_id,
      liturgical_moment: data.liturgical_moments?.join(', '),
      instrument: data.main_instrument,
    },
    tags: ['song', 'created', ...(data.tags || [])],
    details: {
      title: data.title,
      author: data.author,
      liturgical_moments: data.liturgical_moments,
      main_instrument: data.main_instrument,
      tags: data.tags,
      ...data.details,
    },
  });
}

/**
 * Log de atualização de música
 */
export function logSongUpdated(data: SongLogData & { old_values?: any; new_values?: any }): void {
  logger.info('Song updated', {
    category: LogCategory.SONG,
    user: data.user,
    correlation: data.correlation,
    domain: {
      song_id: data.song_id,
      song_slug: data.song_slug,
      song_version_id: data.song_version_id,
    },
    tags: ['song', 'updated'],
    details: {
      old_values: data.old_values,
      new_values: data.new_values,
      ...data.details,
    },
  });
}

/**
 * Log de visualização de música
 */
export function logSongViewed(data: SongLogData): void {
  logger.debug('Song viewed', {
    category: LogCategory.SONG,
    user: data.user,
    correlation: data.correlation,
    domain: {
      song_id: data.song_id,
      song_slug: data.song_slug,
    },
    tags: ['song', 'viewed'],
    details: data.details,
  });
}

/**
 * Log de deleção de música
 */
export function logSongDeleted(data: SongLogData): void {
  logger.warn('Song deleted', {
    category: LogCategory.SONG,
    user: data.user,
    correlation: data.correlation,
    domain: {
      song_id: data.song_id,
      song_slug: data.song_slug,
    },
    tags: ['song', 'deleted'],
    details: data.details,
  });
}

/**
 * ==========================================
 * HELPERS PARA SUBMISSIONS
 * ==========================================
 */

/**
 * Log de criação de submissão
 */
export function logSubmissionCreated(data: SubmissionLogData): void {
  logger.info('Submission created', {
    category: LogCategory.SUBMISSION,
    user: data.submitter,
    correlation: data.correlation,
    domain: {
      submission_id: data.submission_id,
    },
    tags: ['submission', 'created', data.submission_type || ''],
    details: {
      title: data.title,
      submission_type: data.submission_type,
      ...data.details,
    },
  });
}

/**
 * Log de aprovação de submissão
 */
export function logSubmissionApproved(data: SubmissionLogData): void {
  logger.success('Submission approved', {
    category: LogCategory.SUBMISSION,
    user: data.reviewer,
    correlation: data.correlation,
    domain: {
      submission_id: data.submission_id,
      song_id: data.song_id,
    },
    tags: ['submission', 'approved', 'moderation'],
    details: {
      title: data.title,
      reviewer_id: data.reviewer?.user_id,
      submitter_id: data.submitter?.user_id,
      ...data.details,
    },
  });
}

/**
 * Log de rejeição de submissão
 */
export function logSubmissionRejected(data: SubmissionLogData): void {
  logger.info('Submission rejected', {
    category: LogCategory.SUBMISSION,
    user: data.reviewer,
    correlation: data.correlation,
    domain: {
      submission_id: data.submission_id,
      moderation_reason: data.rejection_reason,
    },
    tags: ['submission', 'rejected', 'moderation'],
    details: {
      title: data.title,
      rejection_reason: data.rejection_reason,
      reviewer_id: data.reviewer?.user_id,
      submitter_id: data.submitter?.user_id,
      ...data.details,
    },
  });
}

/**
 * ==========================================
 * HELPERS PARA PLAYLISTS
 * ==========================================
 */

/**
 * Log de criação de playlist
 */
export function logPlaylistCreated(data: PlaylistLogData): void {
  logger.success('Playlist created', {
    category: LogCategory.PLAYLIST,
    user: data.user,
    correlation: data.correlation,
    domain: {
      playlist_id: data.playlist_id,
      playlist_slug: data.playlist_slug,
    },
    tags: ['playlist', 'created'],
    details: {
      name: data.name,
      song_count: data.song_ids?.length || 0,
      ...data.details,
    },
  });
}

/**
 * Log de atualização de playlist
 */
export function logPlaylistUpdated(data: PlaylistLogData): void {
  logger.info('Playlist updated', {
    category: LogCategory.PLAYLIST,
    user: data.user,
    correlation: data.correlation,
    domain: {
      playlist_id: data.playlist_id,
      playlist_slug: data.playlist_slug,
    },
    tags: ['playlist', 'updated'],
    details: {
      operation: data.operation,
      ...data.details,
    },
  });
}

/**
 * Log de adição de música a playlist
 */
export function logPlaylistSongAdded(data: PlaylistLogData & { song_id: string | number }): void {
  logger.info('Song added to playlist', {
    category: LogCategory.PLAYLIST,
    user: data.user,
    correlation: data.correlation,
    domain: {
      playlist_id: data.playlist_id,
      song_id: data.song_id,
    },
    tags: ['playlist', 'song-added'],
    details: data.details,
  });
}

/**
 * Log de remoção de música de playlist
 */
export function logPlaylistSongRemoved(data: PlaylistLogData & { song_id: string | number }): void {
  logger.info('Song removed from playlist', {
    category: LogCategory.PLAYLIST,
    user: data.user,
    correlation: data.correlation,
    domain: {
      playlist_id: data.playlist_id,
      song_id: data.song_id,
    },
    tags: ['playlist', 'song-removed'],
    details: data.details,
  });
}

/**
 * ==========================================
 * HELPERS PARA AUTENTICAÇÃO
 * ==========================================
 */

/**
 * Log de login bem-sucedido
 */
export function logLoginSuccess(data: AuthLogData): void {
  logger.info('Login successful', {
    category: LogCategory.USER,
    user: data.user,
    network: data.network,
    correlation: data.correlation,
    tags: ['auth', 'login', 'success'],
    details: {
      provider: data.provider,
      ...data.details,
    },
  });
}

/**
 * Log de login falhado
 */
export function logLoginFailure(data: AuthLogData): void {
  logger.security('Login failed', {
    category: LogCategory.SECURITY,
    user: data.user,
    network: data.network,
    correlation: data.correlation,
    tags: ['auth', 'login', 'failed'],
    details: {
      provider: data.provider,
      failure_reason: data.failure_reason,
      ...data.details,
    },
  });
}

/**
 * Log de login bloqueado (usuário banido)
 */
export function logLoginBlocked(data: AuthLogData): void {
  logger.security('Login blocked - user banned', {
    category: LogCategory.SECURITY,
    user: data.user,
    network: data.network,
    correlation: data.correlation,
    tags: ['auth', 'login', 'banned', 'blocked'],
    details: {
      provider: data.provider,
      failure_reason: data.failure_reason,
      ...data.details,
    },
  });
}

/**
 * Log de logout
 */
export function logLogout(data: Pick<AuthLogData, 'user' | 'network' | 'correlation' | 'details'>): void {
  logger.info('Logout', {
    category: LogCategory.USER,
    user: data.user,
    network: data.network,
    correlation: data.correlation,
    tags: ['auth', 'logout'],
    details: data.details,
  });
}

/**
 * Log de registo de novo utilizador
 */
export function logUserRegistered(data: {
  user: AuthLogData['user'];
  network?: AuthLogData['network'];
  correlation?: AuthLogData['correlation'];
  registration_method?: string;
  details?: Record<string, any>;
}): void {
  logger.success('User registered', {
    category: LogCategory.USER,
    user: data.user,
    network: data.network,
    correlation: data.correlation,
    tags: ['auth', 'registration', 'success'],
    details: {
      registration_method: data.registration_method || 'unknown',
      ...data.details,
    },
  });
}

/**
 * ==========================================
 * HELPERS PARA EMAIL
 * ==========================================
 */

/**
 * Log de email enviado com sucesso
 */
export function logEmailSent(data: EmailLogData): void {
  logger.info(`${data.email_type} email sent`, {
    category: LogCategory.EMAIL,
    user: data.user,
    correlation: data.correlation,
    domain: {
      email_type: data.email_type,
      email_to: data.email_to,
      email_status: 'sent',
    },
    tags: ['email', 'sent', data.email_type || ''],
    details: {
      template: data.template,
      ...data.details,
    },
  });
}

/**
 * Log de falha no envio de email
 */
export function logEmailFailed(data: EmailLogData): void {
  logger.error(`${data.email_type} email failed`, {
    category: LogCategory.EMAIL,
    user: data.user,
    correlation: data.correlation,
    domain: {
      email_type: data.email_type,
      email_to: data.email_to,
      email_status: 'failed',
    },
    error: data.error,
    tags: ['email', 'error', 'failed', data.email_type || ''],
    details: data.details,
  });
}

/**
 * ==========================================
 * HELPERS PARA MODERAÇÃO
 * ==========================================
 */

/**
 * Log de moderação de usuário
 */
export function logUserModerated(data: ModerationLogData): void {
  logger.warn('User moderated', {
    category: LogCategory.MODERATION,
    user: data.moderator,
    correlation: data.correlation,
    domain: {
      moderation_record_id: data.moderation_record_id,
      moderated_user_id: data.moderated_user_id,
      moderation_status: data.new_status,
      moderation_reason: data.reason,
    },
    tags: ['moderation', 'user', data.new_status.toLowerCase()],
    details: {
      moderated_user_email: data.moderated_user_email,
      old_status: data.old_status,
      new_status: data.new_status,
      reason: data.reason,
      expires_at: data.expires_at,
      ...data.details,
    },
  });
}

/**
 * ==========================================
 * HELPERS PARA PERFORMANCE
 * ==========================================
 */

/**
 * ==========================================
 * HELPERS PARA SEGURANÇA
 * ==========================================
 */

/**
 * Log de acesso não autorizado
 */
export function logUnauthorizedAccess(data: SecurityLogData): void {
  logger.security('Unauthorized access attempt', {
    category: LogCategory.SECURITY,
    user: data.user,
    network: data.network,
    correlation: data.correlation,
    tags: ['security', 'unauthorized', data.event_type],
    details: {
      event_type: data.event_type,
      resource: data.resource,
      ...data.details,
    },
  });
}

/**
 * Log de acesso proibido (sem permissões)
 */
export function logForbiddenAccess(data: SecurityLogData): void {
  logger.security('Forbidden access attempt', {
    category: LogCategory.SECURITY,
    user: data.user,
    network: data.network,
    correlation: data.correlation,
    tags: ['security', 'forbidden', data.event_type],
    details: {
      event_type: data.event_type,
      resource: data.resource,
      required_role: data.required_role,
      user_role: data.user?.user_role,
      ...data.details,
    },
  });
}

/**
 * Log de usuário banido tentando acessar
 */
export function logBannedUserBlocked(data: SecurityLogData): void {
  logger.security('Banned user blocked', {
    category: LogCategory.SECURITY,
    user: data.user,
    network: data.network,
    correlation: data.correlation,
    tags: ['security', 'banned', 'blocked', data.event_type],
    details: {
      event_type: data.event_type,
      resource: data.resource,
      ...data.details,
    },
  });
}

/**
 * ==========================================
 * HELPERS PARA FAVORITOS (STARS)
 * ==========================================
 */

/**
 * Log de música favoritada
 */
export function logSongStarred(data: { song_id: string | number; user?: any; correlation?: any; details?: any }): void {
  logger.info('Song starred', {
    category: LogCategory.USER,
    user: data.user,
    correlation: data.correlation,
    domain: {
      song_id: data.song_id,
    },
    tags: ['star', 'added', 'favorite'],
    details: {
      operation: 'ADDED',
      ...data.details,
    },
  });
}

/**
 * Log de música desfavoritada
 */
export function logSongUnstarred(data: { song_id: string | number; user?: any; correlation?: any; details?: any }): void {
  logger.info('Song unstarred', {
    category: LogCategory.USER,
    user: data.user,
    correlation: data.correlation,
    domain: {
      song_id: data.song_id,
    },
    tags: ['star', 'removed', 'unfavorite'],
    details: {
      operation: 'REMOVED',
      ...data.details,
    },
  });
}

/**
 * ==========================================
 * HELPER GENÉRICO PARA DATABASE
 * ==========================================
 */

/**
 * Log de erro de database
 */
export function logDatabaseError(data: {
  operation: string;
  table?: string;
  error: any;
  user?: any;
  correlation?: any;
  details?: any;
}): void {
  logger.error('Database error', {
    category: LogCategory.DATABASE,
    user: data.user,
    correlation: data.correlation,
    error: {
      error_message: data.error?.message || String(data.error),
      error_code: data.error?.code,
      error_type: data.error?.name || 'DatabaseError',
    },
    tags: ['database', 'error', data.operation],
    details: {
      operation: data.operation,
      table: data.table,
      ...data.details,
    },
  });
}

/**
 * ==========================================
 * HELPERS PARA PERFORMANCE
 * ==========================================
 */

// Threshold de performance (configurável via env)
const SLOW_REQUEST_THRESHOLD_MS = parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS || '500', 10);
const VERY_SLOW_REQUEST_THRESHOLD_MS = parseInt(process.env.VERY_SLOW_REQUEST_THRESHOLD_MS || '2000', 10);

/**
 * Log de request lenta (> 500ms)
 */
export function logSlowRequest(data: PerformanceLogData): void {
  const isVerySlow = data.response_time_ms > VERY_SLOW_REQUEST_THRESHOLD_MS;
  
  logger.warn('Slow API request detected', {
    category: LogCategory.PERFORMANCE,
    user: data.user,
    http: {
      method: data.http?.method,
      url: data.http?.url,
      path: data.http?.path,
      status_code: data.http?.status_code,
      response_time_ms: data.response_time_ms,
    },
    network: data.network,
    correlation: data.correlation,
    performance: {
      response_time_ms: data.response_time_ms,
      is_slow: true,
      is_very_slow: isVerySlow,
      threshold_ms: SLOW_REQUEST_THRESHOLD_MS,
      very_slow_threshold_ms: VERY_SLOW_REQUEST_THRESHOLD_MS,
    },
    domain: data.domain,
    tags: [
      'performance',
      'slow-request',
      isVerySlow ? 'very-slow' : 'moderately-slow',
      data.http?.method?.toLowerCase() || 'unknown-method',
      ...(data.tags || []),
    ],
    details: data.details,
  });
}

/**
 * Log de métrica de performance (genérico)
 */
export function logPerformanceMetric(data: PerformanceLogData): void {
  const isSlow = data.response_time_ms > SLOW_REQUEST_THRESHOLD_MS;
  const isVerySlow = data.response_time_ms > VERY_SLOW_REQUEST_THRESHOLD_MS;
  
  if (isSlow) {
    logSlowRequest(data);
  } else {
    logger.info('Performance metric recorded', {
      category: LogCategory.PERFORMANCE,
      user: data.user,
      http: data.http,
      network: data.network,
      correlation: data.correlation,
      performance: {
        response_time_ms: data.response_time_ms,
        is_slow: false,
        threshold_ms: SLOW_REQUEST_THRESHOLD_MS,
      },
      domain: data.domain,
      tags: ['performance', 'normal-speed', ...(data.tags || [])],
      details: data.details,
    });
  }
}

/**
 * Log de operação de database lenta
 */
export function logSlowDatabaseQuery(data: {
  query_type: string;
  table?: string;
  duration_ms: number;
  user?: any;
  correlation?: any;
  details?: any;
}): void {
  logger.warn('Slow database query detected', {
    category: LogCategory.PERFORMANCE,
    user: data.user,
    correlation: data.correlation,
    performance: {
      response_time_ms: data.duration_ms,
      is_slow: true,
      threshold_ms: 100, // Threshold para queries de DB (100ms)
    },
    tags: ['performance', 'database', 'slow-query', data.query_type],
    details: {
      query_type: data.query_type,
      table: data.table,
      duration_ms: data.duration_ms,
      ...data.details,
    },
  });
}

/**
 * Log de operação externa lenta (API calls, etc.)
 */
export function logSlowExternalCall(data: {
  service: string;
  endpoint: string;
  duration_ms: number;
  user?: any;
  correlation?: any;
  details?: any;
}): void {
  logger.warn('Slow external service call', {
    category: LogCategory.PERFORMANCE,
    user: data.user,
    correlation: data.correlation,
    performance: {
      response_time_ms: data.duration_ms,
      is_slow: true,
      threshold_ms: 1000, // Threshold para chamadas externas (1s)
    },
    tags: ['performance', 'external-service', 'slow-call', data.service],
    details: {
      service: data.service,
      endpoint: data.endpoint,
      duration_ms: data.duration_ms,
      ...data.details,
    },
  });
}
