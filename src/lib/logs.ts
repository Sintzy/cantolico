// lib/logs.ts - DEPRECATED: Discord logging system removed
// Use the new user-action-logger.ts for comprehensive user action logging

import { userActionLogger } from './user-action-logger';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'SUCCESS';

function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

// Simple console logging as fallback for non-user actions
export async function log(
  level: LogLevel,
  title: string,
  data?: Record<string, any>,
  channel: string = 'GENERAL',
  description?: string
): Promise<void> {
  const timestamp = formatDate(new Date());
  const logMessage = {
    level,
    title,
    description,
    data,
    channel,
    timestamp,
    environment: process.env.NODE_ENV,
  };

  // Log to console (you can replace this with your preferred logging service)
  console.log(`[${level}] [${channel}] ${title}`, logMessage);
}

// Legacy functions maintained for backward compatibility but now using console logging
export const logGeneral = (level: LogLevel, title: string, description?: string, data?: Record<string, any>) => 
  log(level, title, data, 'GENERAL', description);

export const logAdmin = (level: LogLevel, title: string, description?: string, data?: Record<string, any>) => 
  log(level, title, data, 'ADMIN', description);

export const logSubmissions = (level: LogLevel, title: string, description?: string, data?: Record<string, any>) => 
  log(level, title, data, 'SUBMISSIONS', description);

export const logEmails = (level: LogLevel, title: string, description?: string, data?: Record<string, any>) => 
  log(level, title, data, 'EMAILS', description);

export const logErrors = (level: LogLevel, title: string, description?: string, data?: Record<string, any>) => 
  log(level, title, data, 'ERRORS', description);

export const logAudit = (level: LogLevel, title: string, description?: string, data?: Record<string, any>) => 
  log(level, title, data, 'AUDIT', description);

export const logSystem = (level: LogLevel, title: string, description?: string, data?: Record<string, any>) => 
  log(level, title, data, 'SYSTEM', description);
