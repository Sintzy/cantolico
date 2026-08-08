import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Heart, ReceiptText, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DonationCheckout } from '@/components/DonationCheckout';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Doações | Cantólico',
  description: 'Apoia o Cantólico com um donativo livre e ajuda a manter a biblioteca gratuita para todos.',
  path: '/doacoes',
  type: 'website',
});

const freeCommitments = [
  'Pesquisar e consultar cânticos continua gratuito',
  'Favoritos e repertórios simples continuam disponíveis',
  'As funcionalidades essenciais não ficam atrás de uma barreira de pagamento',
  'O Premium existe apenas para ferramentas extra e uso mais intensivo',
];

const costAreas = [
  {
    title: 'Infraestrutura',
    description: 'Servidores, base de dados, armazenamento de ficheiros e largura de banda para manter o site rápido e disponível.',
  },
  {
    title: 'Comunicação',
    description: 'Emails transacionais, notificações, domínios e serviços necessários para contas, convites e segurança.',
  },
  {
    title: 'Manutenção',
    description: 'Correções, melhorias, backups, moderação, suporte e desenvolvimento de novas funcionalidades úteis.',
  },
];

export default function DonationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ donativo?: string }>;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border px-4 pt-20 pb-10 sm:px-6 md:pt-28 md:pb-14">
        <div className="mx-auto max-w-screen-xl">
          <Link href="/pricing" className="mb-8 inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar aos planos
          </Link>

          <article
            id="donativo"
            className="scroll-mt-24 rounded-xl border border-rose-700/30 bg-card p-5 shadow-sm dark:border-rose-300/25 sm:p-7 lg:p-8"
          >
            <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,430px)] lg:items-center">
              <div className="min-w-0">
                <div className="mb-5 flex items-center gap-3">
                  <span className="h-px w-6 bg-border" />
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Apoiar o projeto
                  </span>
                </div>
                <h1 className="font-display text-[clamp(2.45rem,10vw,5rem)] leading-none">
                  Ajuda o Cantólico a continuar gratuito para todos.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
                  O Cantólico nasceu para servir comunidades, coros e paróquias. A biblioteca e as funções
                  básicas continuam gratuitas; há apenas algumas opções Premium para quem precisa de ferramentas
                  extra e quer ajudar a sustentar os custos do projeto.
                </p>
                <div className="mt-7 flex flex-wrap gap-2">
                  <span className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                    Donativo voluntário
                  </span>
                  <span className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                    Pagamento seguro Stripe
                  </span>
                  <span className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                    Tu escolhes o valor
                  </span>
                </div>
              </div>

              <div className="min-w-0 rounded-lg border border-border bg-background/70 p-4 sm:p-5">
                <p className="text-sm font-medium text-muted-foreground">Donativo livre</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">Tu escolhes o valor.</h2>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  Escolhe o valor aqui e segue para o checkout seguro da Stripe, com os métodos de pagamento disponíveis.
                </p>
                <DonationStatus searchParams={searchParams} />
                <div className="mt-6 min-w-0">
                  <DonationCheckout />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Para MB WAY, o pagamento tem de ser único, em EUR e elegível para clientes em Portugal.
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 md:py-14">
        <div className="mx-auto grid max-w-screen-xl gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
          <article className="min-w-0 rounded-lg border border-border bg-card p-5 sm:p-6 md:p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-700/10 text-rose-700 dark:bg-rose-300/10 dark:text-rose-200">
                <Heart className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Transparência</p>
                <h2 className="text-xl font-semibold">Para que seriam usados os donativos?</h2>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Os donativos servem para ajudar a cobrir custos reais do Cantólico e para manter o projeto
              sustentável sem retirar o acesso gratuito às funcionalidades essenciais. Não compram acesso
              especial, prioridade ou influência editorial sobre os conteúdos.
            </p>

            <div className="mt-6 rounded-md border border-rose-700/20 bg-rose-700/5 p-4 dark:border-rose-300/20 dark:bg-rose-300/5">
              <h3 className="text-sm font-semibold">Custos mensais recorrentes</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Mesmo sendo gratuito para a maioria dos utilizadores, o Cantólico tem custos todos os meses:
                alojamento, base de dados, armazenamento, emails, domínio, segurança e ferramentas de manutenção.
                Os donativos ajudam a manter esses custos cobertos de forma transparente e sustentável.
              </p>
            </div>

            <div className="mt-7 grid gap-3 md:grid-cols-3">
              {costAreas.map(area => (
                <div key={area.title} className="rounded-md border border-border bg-muted/30 p-4">
                  <ReceiptText className="mb-3 h-5 w-5 text-rose-700 dark:text-rose-300" />
                  <h3 className="text-sm font-semibold">{area.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{area.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-md border border-border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-rose-700 dark:text-rose-300" />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Disclaimer: os donativos são voluntários e destinam-se ao funcionamento, manutenção e
                  melhoria do Cantólico. Sempre que houver margem, o apoio será reinvestido no projeto:
                  desempenho, segurança, armazenamento, novas ferramentas e qualidade da biblioteca.
                </p>
              </div>
            </div>
          </article>

          <aside className="min-w-0 rounded-lg border border-border bg-card p-5 sm:p-6 md:p-7">
            <p className="text-sm font-medium text-muted-foreground">Compromisso</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">O essencial fica gratuito.</h2>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              {freeCommitments.map(commitment => (
                <li key={commitment} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-rose-700 dark:text-rose-300" />
                  <span>{commitment}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 rounded-md border border-border bg-muted/30 p-4">
              <Sparkles className="mb-3 h-5 w-5 text-rose-700 dark:text-rose-300" />
              <h3 className="text-sm font-semibold">Premium também ajuda</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Se usas muito o Cantólico, o Premium desbloqueia extras e contribui de forma recorrente
                para a sustentabilidade do projeto.
              </p>
            </div>

            <div className="mt-7 space-y-3">
              <Button asChild className="w-full">
                <a href="#donativo">
                  Fazer donativo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/pricing">Ver opções Premium</Link>
              </Button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

async function DonationStatus({
  searchParams,
}: {
  searchParams?: Promise<{ donativo?: string }>;
}) {
  const params = await searchParams;
  const status = params?.donativo;

  if (status === 'sucesso') {
    return (
      <div className="mt-4 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
        Obrigado pelo apoio. O teu donativo foi recebido pela Stripe.
      </div>
    );
  }

  if (status === 'cancelado') {
    return (
      <div className="mt-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Checkout cancelado. Podes voltar a tentar quando quiseres.
      </div>
    );
  }

  return null;
}
