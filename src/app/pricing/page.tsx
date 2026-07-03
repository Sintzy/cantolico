import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { auth } from '@clerk/nextjs/server';
import { Button } from '@/components/ui/button';
import { PricingCheckout } from '@/components/PricingCheckout';
import { buildMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Planos | Cantólico',
  description: 'Planos Free e Premium do Cantólico para preparar repertórios, missas, PDFs e PowerPoint.',
  path: '/pricing',
  type: 'website',
});

const freeFeatures = [
  'Pesquisar e ver músicas',
  'Favoritos',
  'Até 3 playlists',
  'Até 3 missas/repertórios',
  'PDFs com marca Cantólico',
];

const premiumFeatures = [
  'Playlists ilimitadas',
  'Missas e repertórios ilimitados',
  'PDFs sem marca Cantólico',
  'Exportação PowerPoint',
  'Duplicar missas',
];

function FeatureList({ features }: { features: string[] }) {
  return (
    <ul className="space-y-3 text-sm text-muted-foreground">
      {features.map(feature => (
        <li key={feature} className="flex items-start gap-3">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-rose-700 dark:text-rose-300" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function PricingPage() {
  const { userId } = await auth();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border px-5 pt-24 pb-12 md:pt-28 md:pb-16">
        <div className="mx-auto max-w-screen-lg">
          <Link href="/" className="mb-8 inline-flex text-sm text-muted-foreground transition-colors hover:text-foreground">
            Voltar ao início
          </Link>

          <div className="max-w-3xl">
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
        </div>
      </section>

      <section className="px-5 py-10 md:py-14">
        <div className="mx-auto grid max-w-screen-lg gap-5 lg:grid-cols-2">
          <article className="flex min-h-[420px] flex-col rounded-lg border border-border bg-card p-6 md:p-7">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Free</p>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-4xl font-semibold tracking-tight">0 €</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Para pesquisar, guardar favoritos e preparar repertórios simples.
              </p>
            </div>

            <div className="mt-7">
              <FeatureList features={freeFeatures} />
            </div>

            <div className="mt-auto pt-8">
              <Button asChild variant="outline" className="w-full">
                <Link href="/musics">Continuar grátis</Link>
              </Button>
            </div>
          </article>

          <article className="flex min-h-[420px] flex-col rounded-lg border border-rose-700/30 bg-card p-6 shadow-sm dark:border-rose-300/25 md:p-7">
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-muted-foreground">Premium</p>
                <span className="rounded-full border border-rose-700/20 bg-rose-700/10 px-3 py-1 text-xs font-medium text-rose-700 dark:border-rose-300/25 dark:bg-rose-300/10 dark:text-rose-200">
                  Recomendado
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-x-2 gap-y-1">
                <span className="text-4xl font-semibold tracking-tight">24,99 €</span>
                <span className="pb-1 text-sm text-muted-foreground">/ano</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Também disponível por 2,99 €/mês.</p>
            </div>

            <div className="mt-7">
              <FeatureList features={premiumFeatures} />
            </div>

            <div className="mt-auto pt-8">
              {userId ? (
                <Suspense fallback={<Button className="w-full" disabled>A carregar</Button>}>
                  <PricingCheckout />
                </Suspense>
              ) : (
                <div className="space-y-3">
                  <Button asChild className="w-full">
                    <Link href="/sign-up?redirect_url=/pricing">Criar conta e aderir</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/sign-in?redirect_url=/pricing">Entrar</Link>
                  </Button>
                </div>
              )}
            </div>
          </article>
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
