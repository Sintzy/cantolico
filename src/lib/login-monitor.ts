import { supabase } from '@/lib/supabase-client';
import { createSecurityAlert } from '@/lib/logging-middleware';
import { triggerFailedLoginEvent } from '@/lib/realtime-alerts';

// ================================================
// SISTEMA DE MONITORAMENTO DE FALHAS DE LOGIN
// ================================================

interface LoginAttempt {
  email: string;
  ip: string;
  success: boolean;
  timestamp: Date;
  userAgent?: string;
}

// Cache em memória para tentativas recentes (em produção usar Redis)
const loginAttempts = new Map<string, LoginAttempt[]>();

// Limites de segurança
const FAILED_ATTEMPTS_THRESHOLD = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const MONITOR_WINDOW_MINUTES = 30;

export async function trackLoginAttempt(attempt: LoginAttempt) {
  try {
    const key = `${attempt.email}:${attempt.ip}`;
    const now = new Date();
    
    // Obter tentativas existentes
    let attempts = loginAttempts.get(key) || [];
    
    // Filtrar apenas tentativas recentes (últimos 30 minutos)
    const windowStart = new Date(now.getTime() - MONITOR_WINDOW_MINUTES * 60 * 1000);
    attempts = attempts.filter(a => a.timestamp > windowStart);
    
    // Adicionar nova tentativa
    attempts.push(attempt);
    loginAttempts.set(key, attempts);
    
    // Se falha, verificar se excedeu limites
    if (!attempt.success) {
      const failedAttempts = attempts.filter(a => !a.success);
      
      if (failedAttempts.length >= FAILED_ATTEMPTS_THRESHOLD) {
        await handleSuspiciousActivity(attempt, failedAttempts);
      } else if (failedAttempts.length >= 3) {
        await handleMultipleFailures(attempt, failedAttempts);
        
        // Disparar alerta em tempo real
        await triggerFailedLoginEvent(attempt.email, failedAttempts.length);
      }
    } else {
      // Login bem-sucedido, limpar cache de falhas
      loginAttempts.delete(key);
    }
    
    // Persistir no banco de dados
    await persistLoginAttempt(attempt);
    
  } catch (error) {
    console.error('Erro ao rastrear tentativa de login:', error);
  }
}

async function handleSuspiciousActivity(attempt: LoginAttempt, failedAttempts: LoginAttempt[]) {
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
    }, 5); // Severidade máxima

    // Adicionar IP à lista de bloqueio temporário
    await addToTemporaryBlocklist(attempt.ip, attempt.email);
    
  } catch (error) {
    console.error('Erro ao lidar com atividade suspeita:', error);
  }
}

async function handleMultipleFailures(attempt: LoginAttempt, failedAttempts: LoginAttempt[]) {
  try {
    await createSecurityAlert('MULTIPLE_LOGIN_FAILURES', 'Múltiplas falhas de login detectadas', {
      email: attempt.email,
      ip: attempt.ip,
      failedAttempts: failedAttempts.length,
      userAgent: attempt.userAgent
    }, 3);
  } catch (error) {
    console.error('Erro ao lidar com múltiplas falhas:', error);
  }
}

async function persistLoginAttempt(attempt: LoginAttempt) {
  try {
    await supabase.from('logs').insert([{
      level: attempt.success ? 'INFO' : 'WARNING',
      category: 'AUTHENTICATION',
      message: `Tentativa de login ${attempt.success ? 'bem-sucedida' : 'falhada'} para ${attempt.email}`,
      details: {
        email: attempt.email,
        success: attempt.success,
        userAgent: attempt.userAgent,
        timestamp: attempt.timestamp.toISOString()
      },
      ip_address: attempt.ip,
      user_agent: attempt.userAgent
    }]);
  } catch (error) {
    console.error('Erro ao persistir tentativa de login:', error);
  }
}

async function addToTemporaryBlocklist(ip: string, email: string) {
  try {
    const expiresAt = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    
    // Criar entrada na tabela de bloqueios temporários
    // (Nota: Esta tabela precisaria ser criada na base de dados)
    console.log(`🚨 IP ${ip} temporariamente bloqueado por tentativas de login em ${email} até ${expiresAt}`);
    
    // Aqui poderíamos inserir numa tabela de IP blocks ou usar cache Redis
    // Por agora, apenas logamos
    
  } catch (error) {
    console.error('Erro ao adicionar à lista de bloqueio:', error);
  }
}

// ================================================
// FUNÇÕES DE VERIFICAÇÃO
// ================================================

export async function isIPBlocked(ip: string): Promise<boolean> {
  try {
    // Verificar se IP está na lista de bloqueio
    // Por agora retorna false, mas pode ser implementado com Redis ou DB
    return false;
  } catch (error) {
    console.error('Erro ao verificar bloqueio de IP:', error);
    return false;
  }
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

// ================================================
// FUNÇÕES DE LIMPEZA
// ================================================

export function cleanupOldAttempts() {
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - MONITOR_WINDOW_MINUTES * 60 * 1000);
    
    for (const [key, attempts] of loginAttempts.entries()) {
      const recentAttempts = attempts.filter(a => a.timestamp > cutoff);
      
      if (recentAttempts.length === 0) {
        loginAttempts.delete(key);
      } else {
        loginAttempts.set(key, recentAttempts);
      }
    }
  } catch (error) {
    console.error('Erro na limpeza de tentativas antigas:', error);
  }
}

// Executar limpeza a cada 5 minutos
setInterval(cleanupOldAttempts, 5 * 60 * 1000);

export {
  FAILED_ATTEMPTS_THRESHOLD,
  LOCKOUT_DURATION_MINUTES,
  MONITOR_WINDOW_MINUTES
};