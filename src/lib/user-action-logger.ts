/**
 * Sistema de Logging de Ações de Usuário
 * 
 * Captura TODAS as ações dos usuários com contexto completo:
 * - ID do usuário
 * - IP e informações de rede
 * - Detalhes da ação
 * - Timestamps
 * - Dados modificados
 */

import { logger } from './logger';
import { LogCategory } from '@/types/logging';
import { Session } from 'next-auth';
import { NextRequest } from 'next/server';

export interface UserActionContext {
  userId: string;
  userEmail?: string;
  userName?: string;
  userRole?: 'USER' | 'TRUSTED' | 'REVIEWER' | 'ADMIN' | 'SUPER_ADMIN';
  ipAddress: string;
  userAgent?: string;
  sessionId?: string;
}

export interface ActionDetails {
  action: string;
  resource: string;
  resourceId?: string;
  method?: string;
  path?: string;
  changes?: Record<string, any>;
  previousValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
}

/**
 * Extrai contexto de usuário e rede da requisição
 */
export function extractUserContext(req: NextRequest, session: Session | null): UserActionContext {
  const ipAddress = 
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') || // Cloudflare
    'unknown';

  const userAgent = req.headers.get('user-agent') || 'unknown';

  return {
    userId: session?.user?.id ? String(session.user.id) : 'anonymous',
    userEmail: session?.user?.email || undefined,
    userName: session?.user?.name || undefined,
    userRole: session?.user?.role || undefined,
    ipAddress,
    userAgent,
    sessionId: (session as any)?.sessionToken,
  };
}

/**
 * Log de criação de recurso
 */
export function logUserCreate(
  context: UserActionContext,
  details: ActionDetails
) {
  logger.info(`User created ${details.resource}`, {
    category: LogCategory.USER_ACTION,
    tags: ['user-action', 'create', details.resource],
    user: {
      user_id: context.userId,
      user_email: context.userEmail,
      user_name: context.userName,
      user_role: context.userRole,
    },
    network: {
      ip_address: context.ipAddress,
      user_agent: context.userAgent?.substring(0, 200),
    },
    http: {
      method: details.method as any,
      url: details.path,
    },
    domain: {
      song_id: details.resource === 'song' ? details.resourceId : undefined,
      playlist_id: details.resource === 'playlist' ? details.resourceId : undefined,
      submission_id: details.resource === 'submission' ? details.resourceId : undefined,
    },
    details: {
      operation: 'CREATE',
      action: details.action,
      resource_type: details.resource,
      new_value: details.newValue,
      changes: details.changes,
      ...details.metadata,
    },
  });
}

/**
 * Log de atualização de recurso
 */
export function logUserUpdate(
  context: UserActionContext,
  details: ActionDetails
) {
  logger.info(`User updated ${details.resource}`, {
    category: LogCategory.USER_ACTION,
    tags: ['user-action', 'update', details.resource],
    user: {
      user_id: context.userId,
      user_email: context.userEmail,
      user_name: context.userName,
      user_role: context.userRole,
    },
    network: {
      ip_address: context.ipAddress,
      user_agent: context.userAgent?.substring(0, 200),
    },
    http: {
      method: details.method as any,
      url: details.path,
    },
    domain: {
      song_id: details.resource === 'song' ? details.resourceId : undefined,
      playlist_id: details.resource === 'playlist' ? details.resourceId : undefined,
      submission_id: details.resource === 'submission' ? details.resourceId : undefined,
    },
    details: {
      operation: 'UPDATE',
      action: details.action,
      resource_type: details.resource,
      previous_value: details.previousValue,
      new_value: details.newValue,
      changes: details.changes,
      ...details.metadata,
    },
  });
}

/**
 * Log de deleção de recurso
 */
export function logUserDelete(
  context: UserActionContext,
  details: ActionDetails
) {
  logger.warn(`User deleted ${details.resource}`, {
    category: LogCategory.USER_ACTION,
    tags: ['user-action', 'delete', details.resource],
    user: {
      user_id: context.userId,
      user_email: context.userEmail,
      user_name: context.userName,
      user_role: context.userRole,
    },
    network: {
      ip_address: context.ipAddress,
      user_agent: context.userAgent?.substring(0, 200),
    },
    http: {
      method: details.method as any,
      url: details.path,
    },
    domain: {
      song_id: details.resource === 'song' ? details.resourceId : undefined,
      playlist_id: details.resource === 'playlist' ? details.resourceId : undefined,
      submission_id: details.resource === 'submission' ? details.resourceId : undefined,
    },
    details: {
      operation: 'DELETE',
      action: details.action,
      resource_type: details.resource,
      previous_value: details.previousValue,
      ...details.metadata,
    },
  });
}

/**
 * Log de leitura/consulta de dados sensíveis
 */
export function logUserRead(
  context: UserActionContext,
  details: ActionDetails
) {
  logger.debug(`User accessed ${details.resource}`, {
    category: LogCategory.USER_ACTION,
    tags: ['user-action', 'read', details.resource],
    user: {
      user_id: context.userId,
      user_email: context.userEmail,
      user_name: context.userName,
      user_role: context.userRole,
    },
    network: {
      ip_address: context.ipAddress,
      user_agent: context.userAgent?.substring(0, 200),
    },
    http: {
      method: details.method as any,
      url: details.path,
    },
    domain: {
      song_id: details.resource === 'song' ? details.resourceId : undefined,
      playlist_id: details.resource === 'playlist' ? details.resourceId : undefined,
      submission_id: details.resource === 'submission' ? details.resourceId : undefined,
    },
    details: {
      operation: 'READ',
      action: details.action,
      resource_type: details.resource,
      ...details.metadata,
    },
  });
}

/**
 * Log de ação de autenticação
 */
export function logAuthAction(
  context: Partial<UserActionContext>,
  action: 'login' | 'logout' | 'register' | 'password_reset' | 'email_verify',
  success: boolean,
  details?: Record<string, any>
) {
  const level = success ? 'info' : 'warn';
  const message = success 
    ? `User ${action} successful`
    : `User ${action} failed`;

  logger[level](message, {
    category: LogCategory.AUTH,
    tags: ['auth', action, success ? 'success' : 'failure'],
    user: context.userId ? {
      user_id: context.userId,
      user_email: context.userEmail,
      user_name: context.userName,
      user_role: context.userRole,
    } : undefined,
    network: {
      ip_address: context.ipAddress || 'unknown',
      user_agent: context.userAgent?.substring(0, 200),
    },
    domain: {},
    details: {
      ...details,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log de ação de moderação
 */
export function logModerationAction(
  moderatorContext: UserActionContext,
  targetUserId: string,
  action: 'warn' | 'suspend' | 'ban' | 'unban',
  reason: string,
  details?: Record<string, any>
) {
  logger.security(`Moderator ${action} user ${targetUserId}`, {
    category: LogCategory.SECURITY,
    tags: ['moderation', action, 'admin-action'],
    user: {
      user_id: moderatorContext.userId,
      user_email: moderatorContext.userEmail,
      user_name: moderatorContext.userName,
      user_role: moderatorContext.userRole,
    },
    network: {
      ip_address: moderatorContext.ipAddress,
      user_agent: moderatorContext.userAgent?.substring(0, 200),
    },
    domain: {
      moderator_id: moderatorContext.userId,
      moderated_user_id: targetUserId,
    },
    details: {
      action: 'moderation',
      moderation_type: action,
      reason,
      ...details,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log de ação administrativa
 */
export function logAdminAction(
  adminContext: UserActionContext,
  action: string,
  resource: string,
  resourceId?: string,
  details?: Record<string, any>
) {
  logger.security(`Admin action: ${action} on ${resource}`, {
    category: LogCategory.SECURITY,
    tags: ['admin-action', action, resource],
    user: {
      user_id: adminContext.userId,
      user_email: adminContext.userEmail,
      user_name: adminContext.userName,
      user_role: adminContext.userRole,
    },
    network: {
      ip_address: adminContext.ipAddress,
      user_agent: adminContext.userAgent?.substring(0, 200),
    },
    domain: {
      song_id: resource === 'song' ? resourceId : undefined,
      playlist_id: resource === 'playlist' ? resourceId : undefined,
      submission_id: resource === 'submission' ? resourceId : undefined,
    },
    details: {
      action,
      resource_type: resource,
      ...details,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log de upload de arquivo
 */
export function logFileUpload(
  context: UserActionContext,
  fileName: string,
  fileSize: number,
  mimeType: string,
  details?: Record<string, any>
) {
  logger.info(`User uploaded file: ${fileName}`, {
    category: LogCategory.USER_ACTION,
    tags: ['user-action', 'file-upload', mimeType],
    user: {
      user_id: context.userId,
      user_email: context.userEmail,
      user_name: context.userName,
      user_role: context.userRole,
    },
    network: {
      ip_address: context.ipAddress,
      user_agent: context.userAgent?.substring(0, 200),
    },
    domain: {},
    details: {
      action: 'file_upload',
      file_name: fileName,
      file_size_bytes: fileSize,
      mime_type: mimeType,
      ...details,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log de erro de usuário (não técnico)
 */
export function logUserError(
  context: UserActionContext,
  action: string,
  errorMessage: string,
  errorDetails?: Record<string, any>
) {
  logger.warn(`User action failed: ${action}`, {
    category: LogCategory.USER_ACTION,
    tags: ['user-action', 'error', action],
    user: {
      user_id: context.userId,
      user_email: context.userEmail,
      user_name: context.userName,
      user_role: context.userRole,
    },
    network: {
      ip_address: context.ipAddress,
      user_agent: context.userAgent?.substring(0, 200),
    },
    domain: {},
    error: {
      error_message: errorMessage,
      ...errorDetails,
    },
    details: {
      action,
      success: false,
      timestamp: new Date().toISOString(),
    },
  });
}
