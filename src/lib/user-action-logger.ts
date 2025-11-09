// lib/user-action-logger.ts - Comprehensive User Action Logging System

interface UserActionLogEntry {
  timestamp: Date;
  userId?: string;
  userEmail?: string;
  action: string;
  category: string; // Authentication, Content, Profile, Social, Admin, Moderation
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

// Action Categories for better organization
export const ACTION_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  CONTENT: 'content',
  PROFILE: 'profile', 
  SOCIAL: 'social',
  ADMIN: 'admin',
  MODERATION: 'moderation',
  VERIFICATION: 'verification'
} as const;

// Specific Actions for Human Voluntary Actions
export const USER_ACTIONS = {
  // Authentication Actions
  REGISTER_OAUTH: 'register_oauth',
  REGISTER_EMAIL: 'register_email', 
  LOGIN_MANUAL: 'login_manual',
  LOGOUT: 'logout',
  
  // Profile Actions
  UPDATE_PROFILE: 'update_profile',
  CHANGE_PASSWORD: 'change_password',
  DELETE_ACCOUNT: 'delete_account',
  UPLOAD_AVATAR: 'upload_avatar',
  
  // Verification Actions
  VERIFY_EMAIL: 'verify_email',
  REQUEST_EMAIL_VERIFICATION: 'request_email_verification',
  
  // Content Creation
  CREATE_SONG: 'create_song',
  SUBMIT_SONG: 'submit_song',
  EDIT_SONG: 'edit_song',
  DELETE_SONG: 'delete_song',
  
  // Playlist Actions
  CREATE_PLAYLIST: 'create_playlist',
  EDIT_PLAYLIST: 'edit_playlist',
  DELETE_PLAYLIST: 'delete_playlist',
  ADD_SONG_TO_PLAYLIST: 'add_song_to_playlist',
  REMOVE_SONG_FROM_PLAYLIST: 'remove_song_from_playlist',
  INVITE_TO_PLAYLIST: 'invite_to_playlist',
  ACCEPT_PLAYLIST_INVITATION: 'accept_playlist_invitation',
  REJECT_PLAYLIST_INVITATION: 'reject_playlist_invitation',
  
  // Social Actions
  STAR_SONG: 'star_song',
  UNSTAR_SONG: 'unstar_song',
  
  // Review Actions
  APPROVE_SUBMISSION: 'approve_submission',
  REJECT_SUBMISSION: 'reject_submission',
  REQUEST_CHANGES: 'request_changes',
  
  // Admin Actions
  CHANGE_USER_ROLE: 'change_user_role',
  BAN_USER: 'ban_user',
  UNBAN_USER: 'unban_user',
  DELETE_USER_CONTENT: 'delete_user_content',
  
  // Moderation Actions
  APPLY_WARNING: 'apply_warning',
  APPLY_SUSPENSION: 'apply_suspension',
  REMOVE_MODERATION: 'remove_moderation',
  ESCALATE_REPORT: 'escalate_report'
} as const;

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

    // Always log to console for better debugging
    const status = entry.success ? '✅' : '❌';
    const category = entry.category.toUpperCase();
    console.log(`${status} [${category}] ${entry.action.toUpperCase()}:`, {
      user: entry.userEmail || entry.userId || 'anonymous',
      resource: entry.resource,
      details: entry.details,
      success: entry.success,
      error: entry.error,
      timestamp: logData.timestamp.toISOString()
    });

    // Always save to database (both dev and production)
    try {
      await this.saveToDatabase(logData);
    } catch (error) {
      console.error('Failed to save user action log to database:', error);
    }
  }

  private async saveToDatabase(logData: UserActionLogEntry & { environment?: string }): Promise<void> {
    try {
      // Log to console for debugging
      console.log(`[${logData.success ? 'SUCCESS' : 'ERROR'}] USER ACTION:`, JSON.stringify(logData, null, 2));
      
      // Import Supabase client dynamically to avoid circular dependencies
      const { supabase } = await import('@/lib/supabase-client');
      
      // Save directly to Supabase
      const { error } = await supabase.from('logs').insert({
        level: logData.success ? 'INFO' : 'ERROR',
        category: logData.category.toUpperCase(),
        message: `${logData.action}: ${logData.success ? 'SUCCESS' : 'FAILED'}`,
        details: {
          action: logData.action,
          success: logData.success,
          resource: logData.resource,
          details: logData.details,
          userAgent: logData.userAgent,
          timestamp: logData.timestamp,
          method: logData.method,
          endpoint: logData.endpoint,
          duration: logData.duration,
          error: logData.error
        },
        user_id: logData.userId ? parseInt(logData.userId) : null,
        user_email: logData.userEmail,
        ip_address: logData.ipAddress,
        user_agent: logData.userAgent,
        url: logData.endpoint,
        method: logData.method,
        environment: logData.environment || process.env.NODE_ENV || 'development'
      });
      
      if (error) {
        console.warn('Failed to save user action log to database:', error);
      }
    } catch (error) {
      console.error('Error saving user action log:', error);
      // Fallback: at least we have console logging
    }
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

// Authentication Actions
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
    category: ACTION_CATEGORIES.AUTHENTICATION,
    resource: 'user_session',
    details: details || {},
    success,
    error,
    timestamp: new Date(),
  });
}

// Profile Management Actions
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
    category: ACTION_CATEGORIES.PROFILE,
    resource: 'user_profile',
    details: details || {},
    success,
    error,
    timestamp: new Date(),
  });
}

// Content Creation/Management Actions
export async function logContentAction(
  action: string,
  userInfo: any,
  success: boolean,
  resourceType: 'song' | 'submission' = 'song',
  details?: Record<string, any>,
  error?: string
): Promise<void> {
  await userActionLogger.logUserAction({
    ...userInfo,
    action,
    category: ACTION_CATEGORIES.CONTENT,
    resource: resourceType,
    details: details || {},
    success,
    error,
    timestamp: new Date(),
  });
}

// Playlist Actions
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
    category: ACTION_CATEGORIES.SOCIAL,
    resource: 'playlist',
    details: details || {},
    success,
    error,
    timestamp: new Date(),
  });
}

// Social Actions (Stars, Interactions)
export async function logSocialAction(
  action: string,
  userInfo: any,
  success: boolean,
  resourceType: 'song' | 'playlist' | 'user' = 'song',
  details?: Record<string, any>,
  error?: string
): Promise<void> {
  await userActionLogger.logUserAction({
    ...userInfo,
    action,
    category: ACTION_CATEGORIES.SOCIAL,
    resource: resourceType,
    details: details || {},
    success,
    error,
    timestamp: new Date(),
  });
}

// Review Actions
export async function logReviewAction(
  action: string,
  userInfo: any,
  success: boolean,
  details?: Record<string, any>,
  error?: string
): Promise<void> {
  await userActionLogger.logUserAction({
    ...userInfo,
    action,
    category: ACTION_CATEGORIES.CONTENT,
    resource: 'submission_review',
    details: details || {},
    success,
    error,
    timestamp: new Date(),
  });
}

// Admin Actions
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
    category: ACTION_CATEGORIES.ADMIN,
    resource: 'admin_panel',
    details: details || {},
    success,
    error,
    timestamp: new Date(),
  });
}

// Moderation Actions
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
    category: ACTION_CATEGORIES.MODERATION,
    resource: 'user_moderation',
    details: details || {},
    success,
    error,
    timestamp: new Date(),
  });
}

// Verification Actions
export async function logVerificationAction(
  action: string,
  userInfo: any,
  success: boolean,
  details?: Record<string, any>,
  error?: string
): Promise<void> {
  await userActionLogger.logUserAction({
    ...userInfo,
    action,
    category: ACTION_CATEGORIES.VERIFICATION,
    resource: 'email_verification',
    details: details || {},
    success,
    error,
    timestamp: new Date(),
  });
}

// Helper function to log quick actions with predefined actions
export async function logQuickAction(
  actionType: keyof typeof USER_ACTIONS,
  userInfo: any,
  success: boolean,
  details?: Record<string, any>,
  error?: string
): Promise<void> {
  const action = USER_ACTIONS[actionType];
  
  // Determine category and resource based on action
  let category: string;
  let resource: string;
  
  if (action.includes('register') || action.includes('login') || action.includes('logout')) {
    category = ACTION_CATEGORIES.AUTHENTICATION;
    resource = 'user_session';
  } else if (action.includes('profile') || action.includes('password') || action.includes('avatar') || action.includes('account')) {
    category = ACTION_CATEGORIES.PROFILE;
    resource = 'user_profile';
  } else if (action.includes('verify') || action.includes('verification')) {
    category = ACTION_CATEGORIES.VERIFICATION;
    resource = 'email_verification';
  } else if (action.includes('song') || action.includes('submit')) {
    category = ACTION_CATEGORIES.CONTENT;
    resource = action.includes('submit') ? 'submission' : 'song';
  } else if (action.includes('playlist')) {
    category = ACTION_CATEGORIES.SOCIAL;
    resource = 'playlist';
  } else if (action.includes('star')) {
    category = ACTION_CATEGORIES.SOCIAL;
    resource = 'song';
  } else if (action.includes('approve') || action.includes('reject') || action.includes('review')) {
    category = ACTION_CATEGORIES.CONTENT;
    resource = 'submission_review';
  } else if (action.includes('role') || action.includes('ban') || action.includes('delete_user')) {
    category = ACTION_CATEGORIES.ADMIN;
    resource = 'admin_panel';
  } else if (action.includes('warning') || action.includes('suspension') || action.includes('moderation')) {
    category = ACTION_CATEGORIES.MODERATION;
    resource = 'user_moderation';
  } else {
    category = ACTION_CATEGORIES.CONTENT;
    resource = 'general';
  }
  
  await userActionLogger.logUserAction({
    ...userInfo,
    action,
    category,
    resource,
    details: details || {},
    success,
    error,
    timestamp: new Date(),
  });
}