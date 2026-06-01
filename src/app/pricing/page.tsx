import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { PricingTable } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { Button } from '@/components/ui/button';
import { buildMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Planos | Cantólico',
  description: 'Planos Free e Premium do Cantólico para preparar repertórios, missas, PDFs e PowerPoint.',
  path: '/pricing',
  type: 'website',
});

const premiumHighlights = [
  'Playlists ilimitadas',
  'Missas e repertórios ilimitados',
  'PDFs sem marca Cantólico',
  'Exportação PowerPoint',
  'Duplicar missas',
];

export default async function PricingPage() {
  const { userId } = await auth();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border px-5 pt-24 pb-12 md:pt-28 md:pb-16">
        <div className="mx-auto max-w-screen-lg">
          <Link href="/" className="mb-8 inline-flex text-sm text-muted-foreground transition-colors hover:text-foreground">
            Voltar ao início
          </Link>

          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <span className="h-px w-6 bg-border" />
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Planos
                </span>
              </div>
              <h1 className="font-display text-[clamp(2.5rem,6vw,4.8rem)] leading-none">
                Mais organização para quem prepara cânticos.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
                O acesso às músicas continua gratuito. O Premium desbloqueia organização ilimitada,
                PDFs limpos e PowerPoint para quem prepara missas e ensaios com frequência.
              </p>
            </div>

            <div className="grid gap-2 rounded-lg border border-border bg-card p-4">
              {premiumHighlights.map(feature => (
                <div key={feature} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-card-foreground">
                  <Check className="h-4 w-4 text-rose-700 dark:text-rose-300" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="clerk-pricing-table" className="px-5 py-10 md:py-14">
        <div className="mx-auto max-w-screen-lg">
          {userId ? (
            <div className="rounded-lg border border-border bg-card p-3 md:p-5">
              <PricingTable
                for="user"
                newSubscriptionRedirectUrl="/pricing?checkout=success"
              />
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card px-6 py-10 text-center">
              <h2 className="text-xl font-semibold">Entra para escolher o plano</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                O plano fica associado à tua conta Cantólico para desbloquear limites e exportações automaticamente.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild>
                  <Link href="/sign-up?redirect_url=/pricing">Criar conta</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/sign-in?redirect_url=/pricing">Entrar</Link>
                </Button>
              </div>
            </div>
          )}

          <p className="mt-5 text-center text-xs text-muted-foreground">
            O plano gratuito continua disponível para pesquisar, cantar, guardar favoritos e preparar repertórios simples.
          </p>
        </div>
      </section>

      <section className="border-t border-border px-5 py-10">
        <div className="mx-auto flex max-w-screen-lg flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-base font-semibold">Ainda estás a explorar?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Podes continuar a usar a biblioteca gratuitamente.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/musics">
              Ver cânticos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
