'use client';

import { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const suggestedAmounts = [1, 2, 5, 10];

export function DonationCheckout() {
  const [amount, setAmount] = useState('2');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startDonation() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/donations/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount.replace(',', '.')) }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.url) {
        throw new Error(data?.error || 'Não foi possível iniciar o donativo.');
      }

      window.location.href = data.url;
    } catch (donationError) {
      setError(donationError instanceof Error ? donationError.message : 'Erro ao iniciar o donativo.');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {suggestedAmounts.map(suggestedAmount => (
          <Button
            key={suggestedAmount}
            type="button"
            variant={amount === String(suggestedAmount) ? 'default' : 'outline'}
            className="w-full"
            onClick={() => setAmount(String(suggestedAmount))}
            disabled={loading}
          >
            {suggestedAmount} €
          </Button>
        ))}
      </div>

      <div>
        <label htmlFor="donation-amount" className="mb-2 block text-sm font-medium">
          Outro valor
        </label>
        <div className="relative">
          <Input
            id="donation-amount"
            inputMode="decimal"
            min="0.5"
            max="5000"
            step="0.5"
            value={amount}
            onChange={event => setAmount(event.target.value)}
            disabled={loading}
            className="pr-10"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            €
          </span>
        </div>
      </div>

      <Button className="w-full" onClick={startDonation} disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
        Doar com Stripe
      </Button>

      <p className="text-xs leading-relaxed text-muted-foreground">
        No checkout, a Stripe deve mostrar Cartão e MB WAY quando o pagamento for elegível. Apple Pay/Google Pay
        aparecem automaticamente conforme o browser, dispositivo e carteira configurada.
      </p>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
