/**
 * Middleware Logging Helpers
 * 
 * Funções de logging específicas para o middleware do Next.js.
 * Este módulo NÃO importa winston-loki para ser compatível com Edge Runtime.
 * Os logs são enviados para API routes que executam em Node.js runtime.
 */

import { SecurityLogData } from '@/types/logging';

/**
 * Envia log de segurança para API route (que roda em Node.js runtime)
 */
async function sendSecurityLog(data: SecurityLogData & { severity: string; message: string }): Promise<void> {
  try {
    await fetch('/api/internal/logs/security', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    // Falha silenciosa - não podemos fazer muito no Edge Runtime
    console.error('Failed to send security log:', data.message);
  }
}

/**
 * Log de tentativa de acesso não autorizado
 */
export async function logUnauthorizedAccess(data: Omit<SecurityLogData, 'event_type'>): Promise<void> {
  await sendSecurityLog({
    ...data,
    event_type: 'unauthorized_access',
    message: 'Unauthorized access attempt detected',
    severity: 'MEDIUM',
  });
}

/**
 * Log de tentativa de acesso sem permissões suficientes
 */
export async function logForbiddenAccess(data: Omit<SecurityLogData, 'event_type'>): Promise<void> {
  await sendSecurityLog({
    ...data,
    event_type: 'forbidden_access',
    message: 'Forbidden access attempt detected',
    severity: 'MEDIUM',
  });
}
