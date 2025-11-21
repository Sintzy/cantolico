/**
 * Sistema de Correlação de Requests
 * 
 * Gerencia request_id e correlation_id usando AsyncLocalStorage
 * para rastreamento de requests e workflows através do sistema
 */

import { AsyncLocalStorage } from 'async_hooks';

/**
 * Contexto de correlação armazenado no AsyncLocalStorage
 */
interface CorrelationContext {
  request_id: string;
  correlation_id?: string;
  parent_request_id?: string;
  user_id?: string | number;
  user_email?: string;
  user_role?: string;
  ip_address?: string;
  user_agent?: string;
  startTime?: number;
}

/**
 * AsyncLocalStorage para armazenar contexto de correlação
 */
const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

/**
 * Gerar um ID único para request
 */
export function generateRequestId(): string {
  // Use Web Crypto API (compatível com Edge Runtime)
  return crypto.randomUUID();
}

/**
 * Gerar um ID único para correlation
 */
export function generateCorrelationId(): string {
  // Use Web Crypto API (compatível com Edge Runtime)
  return crypto.randomUUID();
}

/**
 * Obter o contexto de correlação atual
 */
export function getCorrelationContext(): CorrelationContext | undefined {
  return correlationStorage.getStore();
}

/**
 * Obter o request_id atual
 */
export function getRequestId(): string | undefined {
  return correlationStorage.getStore()?.request_id;
}

/**
 * Obter o correlation_id atual
 */
export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore()?.correlation_id;
}

/**
 * Definir/atualizar o correlation_id no contexto atual
 */
export function setCorrelationId(correlationId: string): void {
  const store = correlationStorage.getStore();
  if (store) {
    store.correlation_id = correlationId;
  }
}

/**
 * Executar callback com contexto de correlação
 */
export function runWithCorrelationContext<T>(
  context: CorrelationContext,
  callback: () => T
): T {
  return correlationStorage.run(context, callback);
}

/**
 * Executar callback assíncrono com contexto de correlação
 */
export async function runWithCorrelationContextAsync<T>(
  context: CorrelationContext,
  callback: () => Promise<T>
): Promise<T> {
  return correlationStorage.run(context, callback);
}

/**
 * Criar novo contexto de correlação com request_id único
 */
export function createCorrelationContext(
  options: Partial<CorrelationContext> = {}
): CorrelationContext {
  return {
    request_id: options.request_id || generateRequestId(),
    correlation_id: options.correlation_id,
    parent_request_id: options.parent_request_id,
    user_id: options.user_id,
    user_email: options.user_email,
    user_role: options.user_role,
    ip_address: options.ip_address,
    user_agent: options.user_agent,
    startTime: options.startTime || Date.now(),
  };
}

/**
 * Atualizar contexto atual com informações do usuário
 */
export function setUserContext(user: {
  user_id?: string | number;
  user_email?: string;
  user_role?: string;
}): void {
  const store = correlationStorage.getStore();
  if (store) {
    if (user.user_id) store.user_id = user.user_id;
    if (user.user_email) store.user_email = user.user_email;
    if (user.user_role) store.user_role = user.user_role;
  }
}

/**
 * Obter informações do usuário do contexto atual
 */
export function getUserContext(): {
  user_id?: string | number;
  user_email?: string;
  user_role?: string;
} | undefined {
  const store = correlationStorage.getStore();
  if (!store) return undefined;

  return {
    user_id: store.user_id,
    user_email: store.user_email,
    user_role: store.user_role,
  };
}

/**
 * Obter tempo decorrido desde o início da request (em ms)
 */
export function getRequestDuration(): number | undefined {
  const store = correlationStorage.getStore();
  if (!store?.startTime) return undefined;
  
  return Date.now() - store.startTime;
}

/**
 * Enriquecer dados de log com contexto de correlação atual
 */
export function enrichWithCorrelationContext<T extends Record<string, any>>(data: T): T {
  const context = getCorrelationContext();
  if (!context) return data;

  const enriched: any = { ...data };

  // Adicionar correlation context
  if (context.request_id || context.correlation_id) {
    enriched.correlation = {
      ...(enriched.correlation || {}),
      request_id: context.request_id,
      correlation_id: context.correlation_id,
      parent_request_id: context.parent_request_id,
    };
  }

  // Adicionar user context se não estiver presente
  if ((context.user_id || context.user_email) && !enriched.user) {
    enriched.user = {
      user_id: context.user_id,
      user_email: context.user_email,
      user_role: context.user_role,
    };
  }

  // Adicionar network context se não estiver presente
  if ((context.ip_address || context.user_agent) && !enriched.network) {
    enriched.network = {
      ip_address: context.ip_address,
      user_agent: context.user_agent,
    };
  }

  return enriched;
}

/**
 * Helper para criar um correlation_id compartilhado entre operações relacionadas
 * Útil para workflows que envolvem múltiplas ações (ex: submissão → aprovação → email)
 */
export function withCorrelationId<T>(
  correlationId: string,
  callback: () => T
): T {
  const currentContext = getCorrelationContext();
  const newContext = {
    ...currentContext,
    request_id: currentContext?.request_id || generateRequestId(),
    correlation_id: correlationId,
  } as CorrelationContext;

  return correlationStorage.run(newContext, callback);
}

/**
 * Helper assíncrono para criar um correlation_id compartilhado
 */
export async function withCorrelationIdAsync<T>(
  correlationId: string,
  callback: () => Promise<T>
): Promise<T> {
  const currentContext = getCorrelationContext();
  const newContext = {
    ...currentContext,
    request_id: currentContext?.request_id || generateRequestId(),
    correlation_id: correlationId,
  } as CorrelationContext;

  return correlationStorage.run(newContext, callback);
}

/**
 * Exportar storage para uso avançado
 */
export { correlationStorage };
