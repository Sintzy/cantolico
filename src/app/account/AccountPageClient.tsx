'use client';

import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { FileText, Heart, ListMusic, Loader2, Music, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface UserStats {
  songs: number;
  playlists: number;
  stars: number;
  submissions: number;
}

interface AccountPageClientProps {
  initialStats: UserStats;
}

const statsConfig = [
  { key: 'songs', label: 'Musicas aprovadas', icon: Music, color: 'text-rose-600' },
  { key: 'playlists', label: 'Playlists', icon: ListMusic, color: 'text-stone-600 dark:text-stone-300' },
  { key: 'stars', label: 'Favoritos', icon: Heart, color: 'text-amber-500' },
  { key: 'submissions', label: 'Submissoes', icon: FileText, color: 'text-stone-500 dark:text-stone-400' },
] as const;

export default function AccountPageClient({ initialStats }: AccountPageClientProps) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-rose-700" />
      </div>
    );
  }

  if (!user) return null;

  const primaryEmail = user.primaryEmailAddress?.emailAddress;
  const role = typeof user.publicMetadata?.role === 'string' ? user.publicMetadata.role : 'USER';
  const joinedAt = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-background pt-24 pb-10">
        <div className="mx-auto max-w-screen-lg px-5">
          <Link href="/" className="mb-8 inline-flex text-sm text-muted-foreground transition-colors hover:text-foreground">
            Voltar ao inicio
          </Link>

          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <span className="text-sm leading-none text-rose-700">+ </span>
                <span className="h-px w-6 bg-border" />
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Conta Cantolico
                </span>
              </div>
              <h1 className="font-display text-[clamp(2.4rem,5vw,4.4rem)] leading-none">
                Informacoes do Perfil
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
                Dados e estatisticas da tua atividade no Cantolico.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <div className="h-12 w-12 overflow-hidden rounded-full border border-border bg-muted">
                {user.imageUrl ? (
                  <Image src={user.imageUrl} alt={user.fullName || 'Utilizador'} width={48} height={48} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-card-foreground">{user.fullName || 'Utilizador'}</p>
                <p className="truncate text-xs text-muted-foreground">{primaryEmail}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-screen-lg px-5 py-8 md:py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsConfig.map(({ key, label, icon: Icon, color }) => (
            <Card key={key} className="border-border bg-card shadow-none">
              <CardContent className="p-5">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <p className="text-3xl font-semibold leading-none">{initialStats[key]}</p>
                <p className="mt-2 text-sm text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-border bg-card shadow-none">
            <CardContent className="p-6">
              <div className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h2 className="text-base font-semibold">Perfil</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Informacao publica e atividade principal.</p>
                </div>
                <Badge variant="secondary" className="uppercase tracking-wide">
                  {role}
                </Badge>
              </div>

              <dl className="grid gap-5 sm:grid-cols-2">
                <ProfileField label="Nome" value={user.fullName || 'Nao definido'} />
                <ProfileField label="Email" value={primaryEmail || 'Nao definido'} />
                <ProfileField label="Username" value={user.username || 'Nao definido'} />
                <ProfileField label="Membro desde" value={joinedAt || 'Nao definido'} />
              </dl>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-none">
            <CardContent className="p-6">
              <h2 className="text-base font-semibold">Gestao de conta</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Email, password, contas ligadas, sessoes e autenticacao ficam agora no painel de conta do Clerk,
                aberto pelo botao de perfil na navbar.
              </p>
              <div className="mt-5 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                Esta pagina fica reservada para informacoes e estatisticas proprias do Cantolico.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-card-foreground">{value}</dd>
    </div>
  );
}
