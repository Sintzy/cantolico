// lib/user-action-logger.ts

interface UserActionLogEntry {
  timestamp: Date;
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  method?: string;
  endpoint?: string;
  duration?: number;
}

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';

class UserActionLogger {
  private static instance: UserActionLogger;

  static getInstance(): UserActionLogger {
    if (!UserActionLogger.instance) {
      UserActionLogger.instance = new UserActionLogger();
    }
    return UserActionLogger.instance;
  }

  async logUserAction(entry: UserActionLogEntry): Promise<void> {
    const logData = {
      ...entry,
      timestamp: entry.timestamp || new Date(),
      environment: process.env.NODE_ENV,
    };

    // Always log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${entry.success ? 'SUCCESS' : 'ERROR'}] USER ACTION:`, JSON.stringify(logData, null, 2));
    }

    // In production, we can save to database or external logging service
    if (process.env.NODE_ENV === 'production') {
      try {
        await this.saveToDatabase(logData);
      } catch (error) {
        console.error('Failed to save user action log to database:', error);
      }
    }
  }

  private async saveToDatabase(logData: UserActionLogEntry & { environment?: string }): Promise<void> {
    // For now, we'll log to console in production too
    // Later you can implement database logging or external service
    console.log(`[${logData.success ? 'SUCCESS' : 'ERROR'}] USER ACTION:`, JSON.stringify(logData, null, 2));
    
    // TODO: Implement database logging
    // Example:
    // await supabase.from('user_action_logs').insert(logData);
    
    // Or send to external logging service like LogRocket, DataDog, etc.
  }
}

export const userActionLogger = UserActionLogger.getInstance();

// Helper function to extract user info from request
export function getUserInfoFromRequest(req: any, session?: any) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const remoteAddress = req.ip || req.connection?.remoteAddress;
  
  return {
    userId: session?.user?.id,
    userEmail: session?.user?.email,
    ipAddress: forwardedFor || realIp || remoteAddress || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
  };
}

// Wrapper function for API endpoints to automatically log user actions
export function withUserActionLogging(
  handler: Function,
  actionName: string,
  resourceType: string
) {
  return async (req: any, ...args: any[]) => {
    const startTime = Date.now();
    let session: any = null;
    let userInfo: any = {};
    
    try {
      // Try to get session if available
      const { getServerSession } = await import('next-auth');
      const { authOptions } = await import('@/lib/auth');
      session = await getServerSession(authOptions);
      userInfo = getUserInfoFromRequest(req, session);
    } catch {
      // If session fails, still get basic request info
      userInfo = getUserInfoFromRequest(req);
    }

    try {
      const result = await handler(req, ...args);
      
      // Log successful action
      await userActionLogger.logUserAction({
        ...userInfo,
        action: actionName,
        resource: resourceType,
        details: {
          method: req.method,
          endpoint: req.url || req.nextUrl?.pathname,
          requestBody: req.method !== 'GET' ? await req.clone().json().catch(() => ({})) : undefined,
        },
        success: true,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      });
      
      return result;
    } catch (error: any) {
      // Log failed action
      await userActionLogger.logUserAction({
        ...userInfo,
        action: `${actionName}_FAILED`,
        resource: resourceType,
        details: {
          method: req.method,
          endpoint: req.url || req.nextUrl?.pathname,
          requestBody: req.method !== 'GET' ? await req.clone().json().catch(() => ({})) : undefined,
        },
        success: false,
        error: error.message || 'Unknown error',
        duration: Date.now() - startTime,
        timestamp: new Date(),
      });
      
      throw error;
    }
  };
}

// Specific logging functions for different types of user actions
export async function logAuthAction(
  action: string,
  userInfo: any,
  success: boolean,
  details?: Record<string, any>,
  error?: string
): Promise<void> {
  await userActionLogger.logUserAction({
    ...userInfo,
    action,
    resource: 'authentication',
    details: details || {},
    success,
    error,
    timestamp: new Date(),
  });
}

export async function logProfileAction(
  action: string,
  userInfo: any,
  success: boolean,
  details?: Record<string, any>,
  error?: string
): Promise<void> {
  await userActionLogger.logUserAction({
    ...userInfo,
    action,
    resource: 'user_profile',
    details: details || {},
    success,
    error,
    timestamp: new Date(),
  });
}

export async function logPlaylistAction(
  action: string,
  userInfo: any,
  success: boolean,
  details?: Record<string, any>,
  error?: string
): Promise<void> {
  await userActionLogger.logUserAction({
    ...userInfo,
    action,
    resource: 'playlist',
    details: details || {},
    success,
    error,
    timestamp: new Date(),
  });
}

export async function logSongAction(
  action: string,
  userInfo: any,
  success: boolean,
  details?: Record<string, any>,
  error?: string
): Promise<void> {
  await userActionLogger.logUserAction({
    ...userInfo,
    action,
    resource: 'song',
    details: details || {},
    success,
    error,
    timestamp: new Date(),
  });
}

export async function logAdminAction(
  action: string,
  userInfo: any,
  success: boolean,
  details?: Record<string, any>,
  error?: string
): Promise<void> {
  await userActionLogger.logUserAction({
    ...userInfo,
    action,
    resource: 'admin',
    details: details || {},
    success,
    error,
    timestamp: new Date(),
  });
}

export async function logModerationAction(
  action: string,
  userInfo: any,
  success: boolean,
  details?: Record<string, any>,
  error?: string
): Promise<void> {
  await userActionLogger.logUserAction({
    ...userInfo,
    action,
    resource: 'moderation',
    details: details || {},
    success,
    error,
    timestamp: new Date(),
  });
}