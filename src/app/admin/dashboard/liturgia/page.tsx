import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarDays, CheckCircle2, ChevronLeft, Database, RefreshCw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getClerkSession } from '@/lib/api-middleware';
import { syncLiturgicalCalendarAction } from './actions';

type SearchParams = Promise<{
  success?: string;
  error?: string;
  calendarDays?: string;
  generatedDays?: string;
  generatedSuggestions?: string;
}>;

export default async function LiturgicalCalendarAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, params] = await Promise.all([getClerkSession(), searchParams]);
  if (!session || session.user.role !== 'ADMIN') redirect('/sign-in');

  const didSync = params.success === '1';

  return (
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground"><CalendarDays className="h-4 w-4" />Liturgia</p>
          <h1 className="text-2xl font-bold sm:text-3xl">Calendário litúrgico</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">Atualiza o calendário do SNL e prepara sugestões rotativas de cânticos na base de dados.</p>
        </div>
        <Button asChild variant="outline"><Link href="/admin/dashboard"><ChevronLeft className="mr-2 h-4 w-4" />Dashboard</Link></Button>
      </div>

      {didSync && (
        <div role="status" className="flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Calendário sincronizado.</p>
            <p className="mt-1 text-sm">{params.calendarDays || '0'} celebrações guardadas · {params.generatedDays || '0'} dias preparados · {params.generatedSuggestions || '0'} sugestões gravadas.</p>
          </div>
        </div>
      )}

      {params.error && (
        <div role="alert" className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{params.error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />Sincronizar e preparar sugestões</CardTitle>
          <CardDescription>Usa o calendário oficial do Secretariado Nacional de Liturgia. As sugestões já guardadas só são recalculadas se a celebração tiver mudado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <p><strong className="block text-foreground">Calendário completo</strong>Guarda todas as celebrações recebidas.</p>
            <p><strong className="block text-foreground">Planeamento anual</strong>Prepara 120 dias anteriores e 400 futuros.</p>
            <p><strong className="block text-foreground">Rotação consistente</strong>Evita repetir cânticos sem necessidade.</p>
          </div>
          <form action={syncLiturgicalCalendarAction}>
            <Button type="submit"><RefreshCw className="mr-2 h-4 w-4" />Sincronizar calendário e sugestões</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
