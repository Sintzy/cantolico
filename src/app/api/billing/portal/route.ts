import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk-auth';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { getAppUrl, stripeRequest } from '@/lib/stripe';

interface StripePortalSession {
  id: string;
  url: string;
}

export async function POST() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: 'Login necessario' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const { data: dbUser, error } = await supabase
    .from('User')
    .select('stripeCustomerId')
    .eq('id', user.supabaseUserId)
    .single();

  if (error || !dbUser?.stripeCustomerId) {
    return NextResponse.json({ error: 'Subscricao Stripe nao encontrada' }, { status: 404 });
  }

  const appUrl = getAppUrl();
  const session = await stripeRequest<StripePortalSession>('/billing_portal/sessions', {
    form: {
      customer: dbUser.stripeCustomerId,
      return_url: `${appUrl}/pricing`,
    },
  });

  return NextResponse.json({ url: session.url });
}
