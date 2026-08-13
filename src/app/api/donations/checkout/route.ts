import { NextRequest, NextResponse } from 'next/server';
import { getAppUrl, stripeRequest } from '@/lib/stripe';

interface StripeCheckoutSession {
  id: string;
  url: string | null;
}

const MIN_DONATION_CENTS = 50;
const MAX_DONATION_CENTS = 500000;

function parseDonationAmount(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(amount)) {
    return null;
  }

  const cents = Math.round(amount * 100);

  if (cents < MIN_DONATION_CENTS || cents > MAX_DONATION_CENTS) {
    return null;
  }

  return cents;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const amountCents = parseDonationAmount(body?.amount);

  if (!amountCents) {
    return NextResponse.json(
      { error: 'Escolhe um valor entre 0,50 € e 5.000 €.' },
      { status: 400 }
    );
  }

  try {
    const appUrl = getAppUrl();
    const session = await stripeRequest<StripeCheckoutSession>('/checkout/sessions', {
      headers: {
        'Stripe-Version': process.env.STRIPE_API_VERSION || '2025-10-29.clover',
      },
      form: {
        mode: 'payment',
        submit_type: 'donate',
        success_url: `${appUrl}/doacoes?donativo=sucesso`,
        cancel_url: `${appUrl}/doacoes?donativo=cancelado`,
        'payment_method_types[0]': 'card',
        'payment_method_types[1]': 'mb_way',
        'line_items[0][price_data][currency]': 'eur',
        'line_items[0][price_data][unit_amount]': amountCents,
        'line_items[0][price_data][product_data][name]': 'Donativo Cantólico',
        'line_items[0][price_data][product_data][description]':
          'Apoio voluntário para manter o Cantólico gratuito e em constante melhoria.',
        'line_items[0][quantity]': 1,
        'metadata[type]': 'donation',
        'metadata[project]': 'cantolico',
        'metadata[amount_cents]': amountCents,
        'payment_intent_data[metadata][type]': 'donation',
        'payment_intent_data[metadata][project]': 'cantolico',
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: 'A Stripe não devolveu URL de checkout.' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[STRIPE DONATION] Erro ao criar checkout:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Não foi possível iniciar o donativo.' },
      { status: 500 }
    );
  }
}
