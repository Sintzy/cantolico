'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, ChevronLeft, ChevronRight, Church, Eye, Globe, Lock, Music2, RefreshCw, Search, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/hooks/useClerkSession';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { LITURGICAL_MOMENT_LABELS, MassVisibility } from '@/types/mass';

interface AdminMass {
  id: string;
  name: string;
  date: string | null;
  parish: string | null;
  celebrant: string | null;
  visibility: MassVisibility;
  hiddenMoments: (keyof typeof LITURGICAL_MOMENT_LABELS)[];
  user: { id: number; name: string | null; email: string } | null;
  _count: { items: number };
}

interface MassesResponse {
  masses: AdminMass[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

const visibilityDetails: Record<MassVisibility, { label: string; icon: typeof Globe }> = {
  PUBLIC: { label: 'Pública', icon: Globe },
  PRIVATE: { label: 'Privada', icon: Lock },
  NOT_LISTED: { label: 'Não listada', icon: Eye },
};

export default function MassesManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [masses, setMasses] = useState<AdminMass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [visibility, setVisibility] = useState<'all' | MassVisibility>('all');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Pick<MassesResponse, 'totalCount' | 'totalPages' | 'currentPage'>>({ totalCount: 0, totalPages: 1, currentPage: 1 });

  const loadMasses = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '12' });
      if (search.trim()) params.set('search', search.trim());
      if (visibility !== 'all') params.set('visibility', visibility);
      const response = await fetch(`/api/admin/masses?${params}`);
      if (!response.ok) throw new Error('Não foi possível carregar as missas');
      const data: MassesResponse = await response.json();
      setMasses(data.masses);
      setResult(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar missas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, search, visibility]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'ADMIN') {
      router.replace('/');
      return;
    }
    const timeout = window.setTimeout(() => void loadMasses(), search ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [session, status, router, loadMasses, search]);

  useEffect(() => setPage(1), [search, visibility]);

  const deleteMass = async (mass: AdminMass) => {
    if (!window.confirm(`Apagar a missa “${mass.name}”? Esta ação não pode ser desfeita.`)) return;
    try {
      const response = await fetch(`/api/admin/masses/${mass.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Não foi possível apagar a missa');
      toast.success('Missa apagada');
      await loadMasses(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao apagar missa');
    }
  };

  if (status === 'loading' || (loading && !masses.length)) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Spinner variant="circle" size={32} className="text-black" /></div>;
  }

  return (
    <main className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-primary"><Church className="h-5 w-5" /><span className="text-sm font-medium">Administração</span></div>
          <h1 className="text-3xl font-bold tracking-tight">Gerir Missas</h1>
          <p className="mt-1 text-muted-foreground">Consulta e edita as missas de todos os utilizadores.</p>
        </div>
        <Button variant="outline" onClick={() => void loadMasses(true)} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Atualizar
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar por nome da missa…" /></div>
          <Select value={visibility} onValueChange={(value) => setVisibility(value as 'all' | MassVisibility)}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Visibilidade" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas as visibilidades</SelectItem><SelectItem value="PUBLIC">Públicas</SelectItem><SelectItem value="PRIVATE">Privadas</SelectItem><SelectItem value="NOT_LISTED">Não listadas</SelectItem></SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground"><span>{result.totalCount} missa{result.totalCount === 1 ? '' : 's'} encontrada{result.totalCount === 1 ? '' : 's'}</span><span>Página {result.currentPage} de {result.totalPages}</span></div>

      <div className="grid gap-4">
        {masses.map((mass) => {
          const details = visibilityDetails[mass.visibility];
          const VisibilityIcon = details.icon;
          return (
            <Card key={mass.id} className="transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-semibold">{mass.name}</h2><Badge variant="secondary" className="gap-1"><VisibilityIcon className="h-3 w-3" />{details.label}</Badge>{mass.hiddenMoments.length > 0 && <Badge variant="outline">{mass.hiddenMoments.length} momentos ocultos</Badge>}</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{mass.user?.name || mass.user?.email || 'Utilizador removido'}</span>
                    {mass.date && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(mass.date))}</span>}
                    {mass.parish && <span className="flex items-center gap-1"><Church className="h-3.5 w-3.5" />{mass.parish}</span>}
                    <span className="flex items-center gap-1"><Music2 className="h-3.5 w-3.5" />{mass._count.items} cântico{mass._count.items === 1 ? '' : 's'}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2"><Button asChild><Link href={`/missas/${mass.id}`}>Abrir e editar</Link></Button><Button variant="outline" size="icon" aria-label={`Apagar ${mass.name}`} onClick={() => void deleteMass(mass)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
              </CardContent>
            </Card>
          );
        })}
        {!masses.length && <Card><CardHeader><CardTitle>Nenhuma missa encontrada</CardTitle><CardDescription>Altera os filtros ou tenta novamente mais tarde.</CardDescription></CardHeader></Card>}
      </div>

      <div className="flex items-center justify-end gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Anterior</Button><Button variant="outline" size="sm" disabled={page >= result.totalPages} onClick={() => setPage((value) => value + 1)}>Seguinte<ChevronRight className="ml-1 h-4 w-4" /></Button></div>
    </main>
  );
}
