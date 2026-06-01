import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk-auth';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { BillingInterval, getAppUrl, getStripePriceId, stripeRequest } from '@/lib/stripe';

interface StripeCheckoutSession {
  id: string;
  url: string | null;
}

function isBillingInterval(value: unknown): value is BillingInterval {
  return value === 'monthly' || value === 'yearly';
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: 'Login necessario' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const interval = body?.interval;

  if (!isBillingInterval(interval)) {
    return NextResponse.json({ error: 'Plano invalido' }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data: dbUser, error } = await supabase
    .from('User')
    .select('stripeCustomerId')
    .eq('id', user.supabaseUserId)
    .single();

  if (error) {
    console.error('[STRIPE CHECKOUT] Erro ao procurar utilizador:', error);
    return NextResponse.json({ error: 'Nao foi possivel iniciar o pagamento' }, { status: 500 });
  }

  const appUrl = getAppUrl();
  const session = await stripeRequest<StripeCheckoutSession>('/checkout/sessions', {
    form: {
      mode: 'subscription',
      success_url: `${appUrl}/pricing?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
      'line_items[0][price]': getStripePriceId(interval),
      'line_items[0][quantity]': 1,
      customer: dbUser?.stripeCustomerId || undefined,
      customer_email: dbUser?.stripeCustomerId ? undefined : user.email,
      client_reference_id: String(user.supabaseUserId),
      allow_promotion_codes: true,
      'metadata[userId]': String(user.supabaseUserId),
      'metadata[clerkUserId]': user.clerkUserId,
      'subscription_data[metadata][userId]': String(user.supabaseUserId),
      'subscription_data[metadata][clerkUserId]': user.clerkUserId,
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: 'Stripe nao devolveu URL de checkout' }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
