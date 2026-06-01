import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import {
  mapStripeSubscriptionStatus,
  retrieveCustomer,
  retrieveSubscription,
  StripeSubscription,
} from '@/lib/stripe';

export const runtime = 'nodejs';

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  return secret;
}

function parseStripeSignature(signature: string): { timestamp: string | null; signatures: string[] } {
  return signature.split(',').reduce<{ timestamp: string | null; signatures: string[] }>(
    (acc, part) => {
      const [key, value] = part.split('=');

      if (key === 't') acc.timestamp = value || null;
      if (key === 'v1' && value) acc.signatures.push(value);

      return acc;
    },
    { timestamp: null, signatures: [] as string[] }
  );
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, 'hex');
  const bBuffer = Buffer.from(b, 'hex');

  if (aBuffer.length !== bBuffer.length) return false;

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function verifyStripeSignature(rawBody: string, signatureHeader: string): boolean {
  const { timestamp, signatures } = parseStripeSignature(signatureHeader);

  if (!timestamp || signatures.length === 0) return false;

  const timestampMs = Number(timestamp) * 1000;
  const fiveMinutesMs = 5 * 60 * 1000;

  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > fiveMinutesMs) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', getStripeWebhookSecret())
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  return signatures.some(signature => timingSafeEqualHex(expected, signature));
}

function periodEndToIso(subscription: StripeSubscription): string | null {
  return subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
}

async function findUserIdForSubscription(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  subscription: StripeSubscription
): Promise<number | null> {
  const metadataUserId = subscription.metadata?.userId ? Number(subscription.metadata.userId) : null;

  if (metadataUserId && Number.isFinite(metadataUserId)) {
    return metadataUserId;
  }

  const { data: userByCustomer } = await supabase
    .from('User')
    .select('id')
    .eq('stripeCustomerId', subscription.customer)
    .maybeSingle();

  if (userByCustomer?.id) {
    return userByCustomer.id;
  }

  const customer = await retrieveCustomer(subscription.customer).catch(error => {
    console.warn('[STRIPE WEBHOOK] Nao foi possivel obter customer:', error);
    return null;
  });

  if (!customer?.email) {
    return null;
  }

  const { data: userByEmail } = await supabase
    .from('User')
    .select('id')
    .eq('email', customer.email)
    .maybeSingle();

  return userByEmail?.id || null;
}

async function syncSubscription(subscription: StripeSubscription) {
  const supabase = createAdminSupabaseClient();
  const { plan, planStatus } = mapStripeSubscriptionStatus(subscription.status);
  const userId = await findUserIdForSubscription(supabase, subscription);

  if (!userId) {
    console.warn('[STRIPE WEBHOOK] Subscricao sem utilizador correspondente:', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
    });
    return;
  }

  const update = {
    plan,
    planStatus,
    premiumUntil: periodEndToIso(subscription),
    stripeCustomerId: subscription.customer,
    stripeSubscriptionId: subscription.id,
    updatedAt: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('User')
    .update(update)
    .eq('id', userId);

  if (error) {
    console.error('[STRIPE WEBHOOK] Erro ao sincronizar subscricao:', error);
    throw error;
  }
}

async function handleCheckoutCompleted(session: any) {
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
  const customerId = typeof session.customer === 'string' ? session.customer : null;
  const userId = session.metadata?.userId || session.client_reference_id;

  if (!subscriptionId || !customerId || !userId) {
    console.warn('[STRIPE WEBHOOK] Checkout sem dados suficientes:', session.id);
    return;
  }

  const subscription = await retrieveSubscription(subscriptionId);

  await syncSubscription({
    ...subscription,
    customer: customerId,
    metadata: {
      ...subscription.metadata,
      userId: String(userId),
    },
  });
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const rawBody = await request.text();

  if (!signature) {
    return new NextResponse('Missing signature', { status: 400 });
  }

  if (!verifyStripeSignature(rawBody, signature)) {
    return new NextResponse('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(rawBody) as StripeEvent;

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object as StripeSubscription);
        break;
      default:
        console.log(`[STRIPE WEBHOOK] Evento ignorado: ${event.type}`);
    }
  } catch (error) {
    console.error('[STRIPE WEBHOOK] Erro ao processar evento:', error);
    return new NextResponse('Webhook handler failed', { status: 500 });
  }

  return NextResponse.json({ received: true });
}
