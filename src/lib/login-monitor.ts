import { supabase } from '@/lib/supabase-client';
import { createSecurityAlert, createSecurityLog } from '@/lib/logging-middleware';
import { triggerFailedLoginEvent } from '@/lib/realtime-alerts';

// ================================================
// SISTEMA APRIMORADO DE MONITORAMENTO DE LOGIN
// ================================================

interface LoginAttempt {
  email: string;
  ip: string;
  success: boolean;
  timestamp: Date;
  userAgent?: string;
  reason?: string;
  geolocation?: string;
}

interface LoginResult {
  success?: boolean;
  blocked?: boolean;
  warning?: boolean;
  error?: boolean;
  reason?: string;
  attempts?: number;
}

// Cache em memória para tentativas recentes (em produção usar Redis)
const loginAttempts = new Map<string, LoginAttempt[]>();
const ipBlacklist = new Map<string, Date>(); // IP -> timestamp do bloqueio

// Limites de segurança
const FAILED_ATTEMPTS_THRESHOLD = 5;
const CRITICAL_ATTEMPTS_THRESHOLD = 10;
const LOCKOUT_DURATION_MINUTES = 15;
const MONITOR_WINDOW_MINUTES = 30;
const IP_BLOCK_DURATION_HOURS = 24;

// ================================================
// FUNÇÕES AUXILIARES
// ================================================

function isIpBlocked(ip: string): boolean {
  const blockTime = ipBlacklist.get(ip);
  if (!blockTime) return false;
  
  const now = new Date();
  const blockExpires = new Date(blockTime.getTime() + IP_BLOCK_DURATION_HOURS * 60 * 60 * 1000);
  
  if (now > blockExpires) {
    ipBlacklist.delete(ip);
    return false;
  }
  
  return true;
}

function blockIp(ip: string): void {
  ipBlacklist.set(ip, new Date());
  console.log(`🚨 IP ${ip} bloqueado até ${new Date(Date.now() + IP_BLOCK_DURATION_HOURS * 60 * 60 * 1000)}`);
}

async function logLoginAttempt(attempt: LoginAttempt): Promise<void> {
  const message = attempt.success ? '✅ Login successful' : '⚠️  Login failed';
  console.log(`${message}: ${attempt.email} from ${attempt.ip}${attempt.reason ? ` - ${attempt.reason}` : ''}`);
}

async function handleSuccessfulLogin(attempt: LoginAttempt, attempts: LoginAttempt[]): Promise<void> {
  const recentFailures = attempts.filter(a => !a.success);
  
  // Se houve falhas recentes antes do sucesso, logar padrão suspeito
  if (recentFailures.length >= 3) {
    console.warn(`🔐 [SECURITY] Suspicious login pattern: ${attempt.email} logged in after ${recentFailures.length} failed attempts from ${attempt.ip}`);
    
    // Criar alerta de segurança para padrão suspeito
    await createSecurityAlert('SUSPICIOUS_LOGIN_PATTERN', 'Login bem-sucedido após múltiplas falhas', {
      email: attempt.email,
      ip: attempt.ip,
      previousFailures: recentFailures.length,
      userAgent: attempt.userAgent
    });
  }
}

async function handleCriticalSuspiciousActivity(attempt: LoginAttempt, failedAttempts: LoginAttempt[]): Promise<void> {
  const firstAttempt = failedAttempts[0];
  const duration = attempt.timestamp.getTime() - firstAttempt.timestamp.getTime();
  
  await createSecurityAlert('CRITICAL_BRUTE_FORCE', 'Ataque de força bruta crítico detectado', {
    email: attempt.email,
    ip: attempt.ip,
    failedAttempts: failedAttempts.length,
    attackDuration: duration,
    userAgent: attempt.userAgent,
    firstAttemptTime: firstAttempt.timestamp,
    lastAttemptTime: attempt.timestamp,
    threshold: CRITICAL_ATTEMPTS_THRESHOLD,
    action_taken: 'IP blocked'
  });
  
  console.error(`🚫 [SECURITY] IP blocked for brute force: ${attempt.ip} - ${failedAttempts.length} failed attempts for ${attempt.email}`);
}

async function handleSuspiciousActivity(attempt: LoginAttempt, failedAttempts: LoginAttempt[]): Promise<void> {
  try {
    // Calcular duração do ataque
    const firstAttempt = failedAttempts[0];
    const duration = attempt.timestamp.getTime() - firstAttempt.timestamp.getTime();
    
    await createSecurityAlert('BRUTE_FORCE_ATTACK', 'Possível ataque de força bruta detectado', {
      email: attempt.email,
      ip: attempt.ip,
      failedAttempts: failedAttempts.length,
      attackDuration: duration,
      userAgent: attempt.userAgent,
      firstAttemptTime: firstAttempt.timestamp,
      lastAttemptTime: attempt.timestamp,
      threshold: FAILED_ATTEMPTS_THRESHOLD
    });
    
  } catch (error) {
    console.error('Erro ao lidar com atividade suspeita:', error);
  }
}

async function handleMultipleFailures(attempt: LoginAttempt, failedAttempts: LoginAttempt[]): Promise<void> {
  try {
    await createSecurityAlert('MULTIPLE_LOGIN_FAILURES', 'Múltiplas falhas de login detectadas', {
      email: attempt.email,
      ip: attempt.ip,
      failedAttempts: failedAttempts.length,
      userAgent: attempt.userAgent
    });
  } catch (error) {
    console.error('Erro ao lidar com múltiplas falhas:', error);
  }
}

async function persistLoginAttempt(attempt: LoginAttempt): Promise<void> {
  try {
    await supabase.from('logs').insert([{
      level: attempt.success ? 'INFO' : 'WARNING',
      category: 'AUTHENTICATION',
      message: `Tentativa de login ${attempt.success ? 'bem-sucedida' : 'falhada'} para ${attempt.email}`,
      details: {
        email: attempt.email,
        success: attempt.success,
        userAgent: attempt.userAgent,
        reason: attempt.reason,
        timestamp: attempt.timestamp.toISOString()
      },
      ip_address: attempt.ip,
      user_agent: attempt.userAgent
    }]);
  } catch (error) {
    console.error('Erro ao persistir tentativa de login:', error);
  }
}

// ================================================
// FUNÇÃO PRINCIPAL
// ================================================

export async function trackLoginAttempt(attempt: LoginAttempt): Promise<LoginResult> {
  try {
    const key = `${attempt.email}:${attempt.ip}`;
    const now = new Date();
    
    // Verificar se IP está bloqueado
    if (isIpBlocked(attempt.ip)) {
      console.warn(`🚫 [SECURITY] Blocked IP attempted login: ${attempt.ip} - ${attempt.email}`);
      return { blocked: true, reason: 'IP bloqueado temporariamente' };
    }
    
    // Obter tentativas existentes
    let attempts = loginAttempts.get(key) || [];
    
    // Filtrar apenas tentativas recentes (últimos 30 minutos)
    const windowStart = new Date(now.getTime() - MONITOR_WINDOW_MINUTES * 60 * 1000);
    attempts = attempts.filter(a => a.timestamp > windowStart);
    
    // Adicionar nova tentativa
    attempts.push(attempt);
    loginAttempts.set(key, attempts);
    
    // Log da tentativa
    await logLoginAttempt(attempt);
    
    // Se login bem-sucedido, limpar tentativas e verificar padrões suspeitos
    if (attempt.success) {
      await handleSuccessfulLogin(attempt, attempts);
      loginAttempts.delete(key); // Limpar tentativas após sucesso
      return { success: true };
    }
    
    // Se falha, verificar se excedeu limites
    const failedAttempts = attempts.filter(a => !a.success);
    
    if (failedAttempts.length >= CRITICAL_ATTEMPTS_THRESHOLD) {
      await handleCriticalSuspiciousActivity(attempt, failedAttempts);
      blockIp(attempt.ip);
      return { blocked: true, reason: 'Muitas tentativas falhadas - IP bloqueado' };
    } else if (failedAttempts.length >= FAILED_ATTEMPTS_THRESHOLD) {
      await handleSuspiciousActivity(attempt, failedAttempts);
      return { warning: true, reason: 'Muitas tentativas falhadas' };
    } else if (failedAttempts.length >= 3) {
      await handleMultipleFailures(attempt, failedAttempts);
      
      // Disparar alerta em tempo real
      await triggerFailedLoginEvent(attempt.email, failedAttempts.length);
      return { warning: true, reason: 'Múltiplas tentativas detectadas' };
    }
    
    // Persistir no banco de dados
    await persistLoginAttempt(attempt);
    
    return { success: false, attempts: failedAttempts.length };
    
  } catch (error) {
    console.error('❌ [LOGIN MONITOR] Error tracking login attempt:', error);
    return { error: true, reason: 'Erro interno' };
  }
}

// ================================================
// FUNÇÕES DE VERIFICAÇÃO E UTILIDADES
// ================================================

export async function isIPBlocked(ip: string): Promise<boolean> {
  return isIpBlocked(ip);
}

export async function getFailedAttemptsCount(email: string, ip: string): Promise<number> {
  try {
    const key = `${email}:${ip}`;
    const attempts = loginAttempts.get(key) || [];
    const now = new Date();
    const windowStart = new Date(now.getTime() - MONITOR_WINDOW_MINUTES * 60 * 1000);
    
    return attempts.filter(a => !a.success && a.timestamp > windowStart).length;
  } catch (error) {
    console.error('Erro ao obter contagem de falhas:', error);
    return 0;
  }
}

export async function clearLoginAttempts(email: string, ip: string): Promise<void> {
  const key = `${email}:${ip}`;
  loginAttempts.delete(key);
}

export async function unblockIP(ip: string): Promise<void> {
  ipBlacklist.delete(ip);
  console.log(`🔓 [SECURITY] IP unblocked: ${ip}`);
}

export async function getBlockedIPs(): Promise<string[]> {
  const now = new Date();
  const blockedIPs: string[] = [];
  
  for (const [ip, blockTime] of ipBlacklist.entries()) {
    const blockExpires = new Date(blockTime.getTime() + IP_BLOCK_DURATION_HOURS * 60 * 60 * 1000);
    if (now <= blockExpires) {
      blockedIPs.push(ip);
    } else {
      ipBlacklist.delete(ip); // Limpar IPs expirados
    }
  }
  
  return blockedIPs;
}

// ================================================
// ESTATÍSTICAS E RELATÓRIOS
// ================================================

export async function getLoginStatistics(): Promise<{
  totalAttempts: number;
  failedAttempts: number;
  successfulLogins: number;
  blockedIPs: number;
  suspiciousActivity: number;
}> {
  let totalAttempts = 0;
  let failedAttempts = 0;
  let successfulLogins = 0;
  let suspiciousActivity = 0;
  
  const now = new Date();
  const windowStart = new Date(now.getTime() - MONITOR_WINDOW_MINUTES * 60 * 1000);
  
  for (const attempts of loginAttempts.values()) {
    const recentAttempts = attempts.filter(a => a.timestamp > windowStart);
    totalAttempts += recentAttempts.length;
    
    for (const attempt of recentAttempts) {
      if (attempt.success) {
        successfulLogins++;
      } else {
        failedAttempts++;
      }
    }
    
    const recentFailures = recentAttempts.filter(a => !a.success);
    if (recentFailures.length >= 3) {
      suspiciousActivity++;
    }
  }
  
  const blockedIPs = await getBlockedIPs();
  
  return {
    totalAttempts,
    failedAttempts,
    successfulLogins,
    blockedIPs: blockedIPs.length,
    suspiciousActivity
  };
}