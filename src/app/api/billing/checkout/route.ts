import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk-auth';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { getAppUrl, getStripeLifetimePriceId, stripeRequest } from '@/lib/stripe';
import { isPremiumState } from '@/lib/premium';

interface StripeCheckoutSession {
  id: string;
  url: string | null;
}

export async function POST(_request: NextRequest) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: 'Login necessario' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const { data: dbUser, error } = await supabase
    .from('User')
    .select('stripeCustomerId, plan, planStatus, premiumUntil')
    .eq('id', user.supabaseUserId)
    .single();

  if (error) {
    console.error('[STRIPE CHECKOUT] Erro ao procurar utilizador:', error);
    return NextResponse.json({ error: 'Nao foi possivel iniciar o pagamento' }, { status: 500 });
  }

  if (isPremiumState(dbUser || {})) {
    return NextResponse.json({ error: 'Esta conta já tem acesso Premium.' }, { status: 409 });
  }

  let session: StripeCheckoutSession;

  try {
    const appUrl = getAppUrl();
    session = await stripeRequest<StripeCheckoutSession>('/checkout/sessions', {
      headers: {
        'Stripe-Version': process.env.STRIPE_API_VERSION || '2025-10-29.clover',
      },
      form: {
        mode: 'payment',
        success_url: `${appUrl}/pricing?checkout=success`,
        cancel_url: `${appUrl}/pricing?checkout=cancelled`,
        'line_items[0][price]': getStripeLifetimePriceId(),
        'line_items[0][quantity]': 1,
        customer: dbUser?.stripeCustomerId || undefined,
        customer_email: dbUser?.stripeCustomerId ? undefined : user.email,
        client_reference_id: String(user.supabaseUserId),
        allow_promotion_codes: true,
        'metadata[type]': 'premium_lifetime',
        'metadata[userId]': String(user.supabaseUserId),
        'metadata[clerkUserId]': user.clerkUserId,
        'payment_intent_data[metadata][type]': 'premium_lifetime',
        'payment_intent_data[metadata][userId]': String(user.supabaseUserId),
        'payment_intent_data[metadata][clerkUserId]': user.clerkUserId,
      },
    });
  } catch (checkoutError) {
    console.error('[STRIPE CHECKOUT] Erro ao criar checkout:', checkoutError);
    return NextResponse.json(
      { error: checkoutError instanceof Error ? checkoutError.message : 'Nao foi possivel iniciar o pagamento' },
      { status: 500 }
    );
  }

  if (!session.url) {
    return NextResponse.json({ error: 'Stripe nao devolveu URL de checkout' }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
