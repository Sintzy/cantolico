import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { withPerformanceMonitoring, logUnauthorizedAccess, logCriticalAction } from '@/lib/enhanced-logging';

// ================================================
// WRAPPER DE PROTEÇÃO PARA APIs ADMIN
// ================================================

interface AdminAPIHandler<T = any> {
  (req: NextRequest, session: any, ...args: any[]): Promise<NextResponse<T>>;
}

export function withAdminProtection<T = any>(
  handler: AdminAPIHandler<T>,
  options?: {
    requiredRole?: 'ADMIN' | 'REVIEWER';
    logAction?: string;
    actionDescription?: string;
  }
) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse<T>> => {
    return withPerformanceMonitoring(async (request) => {
      try {
        // Verificar autenticação
        const session = await getServerSession(authOptions);
        
        if (!session) {
          await logUnauthorizedAccess(req, req.url, 'Sem sessão ativa', session);
          return NextResponse.json(
            { error: 'Acesso negado - Login necessário' }, 
            { status: 401 }
          ) as NextResponse<T>;
        }

        // Verificar autorização
        const requiredRole = options?.requiredRole || 'ADMIN';
        if (session.user.role !== requiredRole && session.user.role !== 'ADMIN') {
          await logUnauthorizedAccess(
            req, 
            req.url, 
            `Nível de acesso insuficiente: ${session.user.role}, necessário: ${requiredRole}`, 
            session
          );
          return NextResponse.json(
            { error: `Acesso negado - Necessário nível ${requiredRole}` }, 
            { status: 403 }
          ) as NextResponse<T>;
        }

        // Log da ação se especificada
        if (options?.logAction && options?.actionDescription) {
          await logCriticalAction(
            options.logAction,
            options.actionDescription,
            {
              url: req.url,
              method: req.method,
              timestamp: new Date().toISOString()
            },
            session,
            req
          );
        }

        // Executar handler autorizado
        return await handler(req, session, ...args);

      } catch (error) {
        console.error('Erro na API protegida:', error);
        return NextResponse.json(
          { error: 'Erro interno do servidor' }, 
          { status: 500 }
        ) as NextResponse<T>;
      }
    }, req, ...args);
  };
}

// ================================================
// WRAPPER PARA APIs DE UTILIZADOR
// ================================================

interface UserAPIHandler<T = any> {
  (req: NextRequest, session: any, ...args: any[]): Promise<NextResponse<T>>;
}

export function withUserProtection<T = any>(
  handler: UserAPIHandler<T>,
  options?: {
    allowAnonymous?: boolean;
    logAction?: string;
    actionDescription?: string;
  }
) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse<T>> => {
    return withPerformanceMonitoring(async (request) => {
      try {
        const session = await getServerSession(authOptions);
        
        if (!session && !options?.allowAnonymous) {
          await logUnauthorizedAccess(req, req.url, 'Acesso sem autenticação a endpoint protegido', session);
          return NextResponse.json(
            { error: 'Login necessário' }, 
            { status: 401 }
          ) as NextResponse<T>;
        }

        // Log da ação se especificada
        if (options?.logAction && options?.actionDescription && session) {
          await logCriticalAction(
            options.logAction,
            options.actionDescription,
            {
              url: req.url,
              method: req.method,
              timestamp: new Date().toISOString()
            },
            session,
            req
          );
        }

        return await handler(req, session, ...args);

      } catch (error) {
        console.error('Erro na API de utilizador:', error);
        return NextResponse.json(
          { error: 'Erro interno do servidor' }, 
          { status: 500 }
        ) as NextResponse<T>;
      }
    }, req, ...args);
  };
}

// ================================================
// WRAPPER PARA APIs PÚBLICAS COM MONITORING
// ================================================

interface PublicAPIHandler<T = any> {
  (req: NextRequest, ...args: any[]): Promise<NextResponse<T>>;
}

export function withPublicMonitoring<T = any>(
  handler: PublicAPIHandler<T>,
  options?: {
    logMetrics?: boolean;
  }
) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse<T>> => {
    return withPerformanceMonitoring(async (request) => {
      try {
        return await handler(req, ...args);
      } catch (error) {
        console.error('Erro na API pública:', error);
        return NextResponse.json(
          { error: 'Erro interno do servidor' }, 
          { status: 500 }
        ) as NextResponse<T>;
      }
    }, req, ...args);
  };
}

// ================================================
// HELPERS PARA LOGGING DE AÇÕES ESPECÍFICAS
// ================================================

export async function logMusicAction(
  action: 'create' | 'update' | 'delete' | 'publish' | 'unpublish',
  musicId: string,
  musicTitle: string,
  session: any,
  req: NextRequest,
  additionalDetails?: Record<string, any>
) {
  await logCriticalAction(
    `music_${action}`,
    `Música ${action === 'create' ? 'criada' : action === 'update' ? 'atualizada' : action === 'delete' ? 'eliminada' : action === 'publish' ? 'publicada' : 'despublicada'}: ${musicTitle}`,
    {
      musicId,
      musicTitle,
      action,
      ...additionalDetails
    },
    session,
    req
  );
}

export async function logPlaylistAction(
  action: 'create' | 'update' | 'delete',
  playlistId: string,
  playlistName: string,
  session: any,
  req: NextRequest,
  additionalDetails?: Record<string, any>
) {
  await logCriticalAction(
    `playlist_${action}`,
    `Playlist ${action === 'create' ? 'criada' : action === 'update' ? 'atualizada' : 'eliminada'}: ${playlistName}`,
    {
      playlistId,
      playlistName,
      action,
      ...additionalDetails
    },
    session,
    req
  );
}

export async function logUserModerationAction(
  action: 'ban' | 'unban' | 'suspend' | 'warn' | 'promote' | 'demote',
  targetUserId: string,
  targetUserEmail: string,
  reason: string,
  session: any,
  req: NextRequest,
  additionalDetails?: Record<string, any>
) {
  await logCriticalAction(
    `user_moderation_${action}`,
    `Ação de moderação (${action}) aplicada ao utilizador ${targetUserEmail}: ${reason}`,
    {
      targetUserId,
      targetUserEmail,
      action,
      reason,
      moderatorId: session.user.id,
      moderatorEmail: session.user.email,
      ...additionalDetails
    },
    session,
    req
  );
}

export async function logSubmissionAction(
  action: 'approve' | 'reject' | 'review',
  submissionId: string,
  songTitle: string,
  session: any,
  req: NextRequest,
  additionalDetails?: Record<string, any>
) {
  await logCriticalAction(
    `submission_${action}`,
    `Submissão ${action === 'approve' ? 'aprovada' : action === 'reject' ? 'rejeitada' : 'em review'}: ${songTitle}`,
    {
      submissionId,
      songTitle,
      action,
      reviewerId: session.user.id,
      reviewerEmail: session.user.email,
      ...additionalDetails
    },
    session,
    req
  );
}