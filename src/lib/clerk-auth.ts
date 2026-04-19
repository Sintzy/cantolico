import { auth, currentUser } from '@clerk/nextjs/server';
import { createAdminSupabaseClient } from './supabase-admin';

export type UserRole = 'USER' | 'TRUSTED' | 'REVIEWER' | 'ADMIN';

export interface ClerkUserMetadata {
  role?: UserRole;
  isBanned?: boolean;
  suspendedUntil?: string;
  supabaseUserId?: number;
}

export interface AuthenticatedUser {
  clerkUserId: string;
  supabaseUserId: number;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  isBanned: boolean;
  suspendedUntil: string | null;
}

/**
 * Obtém o utilizador autenticado atual com dados do Supabase
 * Retorna null se não autenticado
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return null;
  }

  const metadata = sessionClaims?.metadata as ClerkUserMetadata | undefined;
  const supabase = createAdminSupabaseClient();

  // Buscar utilizador no Supabase pelo clerkUserId
  const { data: user, error } = await supabase
    .from('User')
    .select('id, email, name, image, role')
    .eq('clerkUserId', userId)
    .single();

  if (error || !user) {
    console.error('❌ [CLERK AUTH] Utilizador não encontrado no Supabase:', userId);
    return null;
  }

  return {
    clerkUserId: userId,
    supabaseUserId: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: (metadata?.role || user.role || 'USER') as UserRole,
    isBanned: metadata?.isBanned || false,
    suspendedUntil: metadata?.suspendedUntil || null,
  };
}

/**
 * Verifica se o utilizador tem uma das roles especificadas
 */
export async function requireRole(...allowedRoles: UserRole[]): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error('Não autenticado');
  }

  if (!allowedRoles.includes(user.role)) {
    throw new Error('Permissões insuficientes');
  }

  return user;
}

/**
 * Verifica se o utilizador é admin
 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  return requireRole('ADMIN');
}

/**
 * Verifica se o utilizador é admin ou reviewer
 */
export async function requireAdminOrReviewer(): Promise<AuthenticatedUser> {
  return requireRole('ADMIN', 'REVIEWER');
}

/**
 * Obtém apenas o userId do Clerk (para verificações rápidas)
 */
export async function getClerkUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Obtém o supabaseUserId a partir do clerkUserId
 */
export async function getSupabaseUserId(clerkUserId: string): Promise<number | null> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from('User')
    .select('id')
    .eq('clerkUserId', clerkUserId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.id;
}
