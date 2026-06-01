import { adminSupabase as supabase } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export type UserPlan = 'free' | 'premium';
export type UserPlanStatus = 'inactive' | 'active' | 'past_due' | 'canceled';

export type PremiumFeature =
  | 'unlimited_playlists'
  | 'unlimited_masses'
  | 'export_pdf_without_logo'
  | 'export_ppt'
  | 'duplicate_mass';

export const FREE_LIMITS = {
  playlists: 3,
  masses: 3,
} as const;

export interface PremiumState {
  plan: UserPlan;
  status: UserPlanStatus;
  premiumUntil: string | null;
  isPremium: boolean;
  canManageBilling: boolean;
  premiumSource: 'stripe' | 'internal' | 'manual' | 'free';
}

function premiumDateIsValid(premiumUntil: string | null): boolean {
  if (!premiumUntil) return true;
  return new Date(premiumUntil).getTime() > Date.now();
}

export function isPremiumState(input: {
  plan?: string | null;
  status?: string | null;
  premiumUntil?: string | null;
  role?: string | null;
}): boolean {
  if (input.role === 'ADMIN' || input.role === 'SUPER_ADMIN') return true;
  if (input.plan !== 'premium') return false;

  if (input.status === 'active') {
    return premiumDateIsValid(input.premiumUntil || null);
  }

  return (
    input.status === 'canceled' &&
    Boolean(input.premiumUntil) &&
    premiumDateIsValid(input.premiumUntil || null)
  );
}

export async function getUserPremiumState(userId: number): Promise<PremiumState> {
  const { data, error } = await supabase
    .from('User')
    .select('plan, planStatus, premiumUntil, role, stripeCustomerId')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return {
      plan: 'free',
      status: 'inactive',
      premiumUntil: null,
      isPremium: false,
      canManageBilling: false,
      premiumSource: 'free',
    };
  }

  const plan = (data.plan || 'free') as UserPlan;
  const status = (data.planStatus || 'inactive') as UserPlanStatus;
  const premiumUntil = data.premiumUntil || null;

  const isPremium = isPremiumState({ plan, status, premiumUntil, role: data.role });
  const canManageBilling = Boolean(data.stripeCustomerId);
  const premiumSource = canManageBilling
    ? 'stripe'
    : data.role === 'ADMIN' || data.role === 'SUPER_ADMIN'
      ? 'internal'
      : isPremium
        ? 'manual'
        : 'free';

  return {
    plan,
    status,
    premiumUntil,
    isPremium,
    canManageBilling,
    premiumSource,
  };
}

export async function userCanUseFeature(userId: number, feature: PremiumFeature): Promise<boolean> {
  const state = await getUserPremiumState(userId);
  if (state.isPremium) return true;

  switch (feature) {
    case 'unlimited_playlists':
    case 'unlimited_masses':
    case 'export_pdf_without_logo':
    case 'export_ppt':
    case 'duplicate_mass':
      return false;
    default:
      return false;
  }
}

export async function getUserResourceCount(
  userId: number,
  table: 'Playlist' | 'Mass'
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('userId', userId);

  if (error) {
    console.error(`[PREMIUM] Failed to count ${table}:`, error);
    return 0;
  }

  return count || 0;
}

export async function canCreatePlaylist(userId: number): Promise<{ allowed: boolean; limit: number; current: number }> {
  const state = await getUserPremiumState(userId);
  const current = await getUserResourceCount(userId, 'Playlist');
  return {
    allowed: state.isPremium || current < FREE_LIMITS.playlists,
    limit: FREE_LIMITS.playlists,
    current,
  };
}

export async function canCreateMass(userId: number): Promise<{ allowed: boolean; limit: number; current: number }> {
  const state = await getUserPremiumState(userId);
  const current = await getUserResourceCount(userId, 'Mass');
  return {
    allowed: state.isPremium || current < FREE_LIMITS.masses,
    limit: FREE_LIMITS.masses,
    current,
  };
}

export function premiumRequiredResponse(feature: PremiumFeature, message: string) {
  return NextResponse.json(
    {
      error: message,
      code: 'PREMIUM_REQUIRED',
      feature,
    },
    { status: 402 }
  );
}
