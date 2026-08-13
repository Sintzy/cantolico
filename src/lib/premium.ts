import { adminSupabase as supabase } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import {
  mapStripeSubscriptionStatus,
  retrieveLatestCustomerSubscription,
  retrieveSubscription,
  StripeSubscription,
} from '@/lib/stripe';

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
  premiumSource: 'stripe' | 'manual' | 'free';
}

function premiumDateIsValid(premiumUntil: string | null): boolean {
  if (!premiumUntil) return true;
  return new Date(premiumUntil).getTime() > Date.now();
}

export function isPremiumState(input: {
  plan?: string | null;
  status?: string | null;
  premiumUntil?: string | null;
}): boolean {
  if (input.plan !== 'premium') return false;

  if (input.status === 'canceled') {
    return Boolean(input.premiumUntil) && premiumDateIsValid(input.premiumUntil || null);
  }

  return premiumDateIsValid(input.premiumUntil || null);
}

function periodEndToIso(subscription: StripeSubscription): string | null {
  return subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
}

async function syncPremiumStateFromStripe(data: {
  id: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}) {
  let subscription = data.stripeSubscriptionId
    ? await retrieveSubscription(data.stripeSubscriptionId)
    : data.stripeCustomerId
      ? await retrieveLatestCustomerSubscription(data.stripeCustomerId)
      : null;

  if (
    subscription &&
    !['active', 'trialing', 'past_due'].includes(subscription.status) &&
    data.stripeCustomerId
  ) {
    subscription = await retrieveLatestCustomerSubscription(data.stripeCustomerId);
  }

  if (!subscription) return null;

  const { plan, planStatus } = mapStripeSubscriptionStatus(subscription.status);
  const premiumUntil = periodEndToIso(subscription);
  const stripeCustomerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : data.stripeCustomerId;

  const update = {
    plan,
    planStatus,
    premiumUntil,
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    updatedAt: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('User')
    .update(update)
    .eq('id', data.id);

  if (error) {
    console.error('[PREMIUM] Failed to sync Stripe state:', error);
  }

  return {
    plan,
    status: planStatus,
    premiumUntil,
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
  };
}

export async function getUserPremiumState(userId: number): Promise<PremiumState> {
  const { data, error } = await supabase
    .from('User')
    .select('id, plan, planStatus, premiumUntil, stripeCustomerId, stripeSubscriptionId')
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

  let plan = (data.plan || 'free') as UserPlan;
  let status = (data.planStatus || 'inactive') as UserPlanStatus;
  let premiumUntil = data.premiumUntil || null;

  let isPremium = isPremiumState({ plan, status, premiumUntil });
  let stripeCustomerId = data.stripeCustomerId || null;

  if (!isPremium && (data.stripeSubscriptionId || data.stripeCustomerId)) {
    const synced = await syncPremiumStateFromStripe({
      id: data.id,
      stripeCustomerId: data.stripeCustomerId || null,
      stripeSubscriptionId: data.stripeSubscriptionId || null,
    }).catch(error => {
      console.error('[PREMIUM] Stripe fallback sync failed:', error);
      return null;
    });

    if (synced) {
      plan = synced.plan;
      status = synced.status;
      premiumUntil = synced.premiumUntil;
      stripeCustomerId = synced.stripeCustomerId || stripeCustomerId;
      isPremium = isPremiumState({ plan, status, premiumUntil });
    }
  }

  const canManageBilling = Boolean(stripeCustomerId);
  const premiumSource = canManageBilling
    ? 'stripe'
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
