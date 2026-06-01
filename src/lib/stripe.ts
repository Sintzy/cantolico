const STRIPE_API_BASE = 'https://api.stripe.com/v1';

export type BillingInterval = 'monthly' | 'yearly';
export type StripePlanStatus = 'inactive' | 'active' | 'past_due' | 'canceled';

export interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  current_period_end?: number;
  metadata?: Record<string, string | undefined>;
}

export function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  return key;
}

export function getStripePriceId(interval: BillingInterval): string {
  const envName = interval === 'yearly'
    ? 'STRIPE_PREMIUM_YEARLY_PRICE_ID'
    : 'STRIPE_PREMIUM_MONTHLY_PRICE_ID';
  const priceId = process.env[envName];

  if (!priceId) {
    throw new Error(`${envName} is not configured`);
  }

  return priceId;
}

export function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://cantolico.pt').replace(/\/$/, '');
}

export function mapStripeSubscriptionStatus(status?: string | null): {
  plan: 'free' | 'premium';
  planStatus: StripePlanStatus;
} {
  switch (status) {
    case 'active':
    case 'trialing':
      return { plan: 'premium', planStatus: 'active' };
    case 'past_due':
      return { plan: 'premium', planStatus: 'past_due' };
    case 'canceled':
      return { plan: 'free', planStatus: 'canceled' };
    default:
      return { plan: 'free', planStatus: 'inactive' };
  }
}

export async function stripeRequest<T>(
  path: string,
  init: RequestInit & { form?: Record<string, string | number | boolean | null | undefined> } = {}
): Promise<T> {
  const { form, headers, ...rest } = init;
  const body = form
    ? new URLSearchParams(
        Object.entries(form)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, String(value)])
      )
    : undefined;

  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    ...rest,
    method: rest.method || (body ? 'POST' : 'GET'),
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...headers,
    },
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || `Stripe request failed: ${response.status}`);
  }

  return data as T;
}

export async function retrieveSubscription(subscriptionId: string): Promise<StripeSubscription> {
  return stripeRequest<StripeSubscription>(`/subscriptions/${subscriptionId}`);
}
