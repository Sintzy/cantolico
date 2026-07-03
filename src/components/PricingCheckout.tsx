'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CheckoutInterval = 'monthly' | 'yearly';

interface PlanState {
  isPremium: boolean;
  canManageBilling: boolean;
  premiumSource: 'stripe' | 'manual' | 'free';
  status: string;
}

export function PricingCheckout() {
  const searchParams = useSearchParams();
  const [planState, setPlanState] = useState<PlanState | null>(null);
  const [loading, setLoading] = useState<CheckoutInterval | 'portal' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const checkoutStatus = searchParams.get('checkout');

  useEffect(() => {
    let mounted = true;

    fetch('/api/user/plan')
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (mounted && data) {
          setPlanState({
            isPremium: Boolean(data.isPremium),
            canManageBilling: Boolean(data.canManageBilling),
            premiumSource: data.premiumSource || 'free',
            status: data.status || 'inactive',
          });
        }
      })
      .catch(() => {
        if (mounted) setPlanState(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function redirectToStripe(endpoint: string, payload?: Record<string, string>) {
    setError(null);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: payload ? { 'Content-Type': 'application/json' } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.url) {
      throw new Error(data?.error || 'Não foi possível abrir o Stripe');
    }

    window.location.href = data.url;
  }

  async function startCheckout(interval: CheckoutInterval) {
    setLoading(interval);

    try {
      await redirectToStripe('/api/billing/checkout', { interval });
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Erro ao iniciar pagamento');
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading('portal');

    try {
      await redirectToStripe('/api/billing/portal');
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : 'Erro ao abrir gestão da subscrição');
      setLoading(null);
    }
  }

  const checkoutButtons = (
    <>
      <Button className="w-full" onClick={() => startCheckout('yearly')} disabled={Boolean(loading)}>
        {loading === 'yearly' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
        Aderir anual - 24,99 €/ano
      </Button>
      <Button className="w-full" variant="outline" onClick={() => startCheckout('monthly')} disabled={Boolean(loading)}>
        {loading === 'monthly' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Aderir mensal - 2,99 €/mês
      </Button>
    </>
  );

  if (planState?.canManageBilling) {
    return (
      <div className="space-y-3">
        <Button className="w-full" onClick={openPortal} disabled={loading === 'portal'}>
          {loading === 'portal' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
          Gerir subscrição
        </Button>
        <p className="text-xs text-muted-foreground">
          O teu Premium está ativo. Alterações e faturas ficam no portal seguro do Stripe.
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {checkoutStatus === 'success' && (
        <div className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          Pagamento recebido. O Premium fica ativo assim que o webhook do Stripe confirmar a subscrição.
        </div>
      )}
      {checkoutStatus === 'cancelled' && (
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Checkout cancelado. Podes voltar a tentar quando quiseres.
        </div>
      )}
      {planState?.isPremium && (
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Esta conta já tem acesso Premium, mas ainda não tem uma subscrição Stripe associada.
        </div>
      )}
      {checkoutButtons}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
