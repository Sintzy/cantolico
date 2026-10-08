'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, CalendarDays, ChevronLeft, ChevronRight, Church, Clock3, ExternalLink, Info, LoaderCircle, LocateFixed, MapPin, Search, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type Song = { id: string; title: string; slug: string | null; tags: string[] };
type Suggestion = { key: string; label: string; guidance: string; songs: Song[] };
type ChurchResult = {
  id: number;
  nome: string;
  endereco?: string | null;
  url: string;
  distancia_m?: number;
  estado?: 'a_decorrer' | 'hoje' | 'outro_dia' | 'sem_horario';
  proxima_missa?: { hora?: string | null; dia?: string | null; minutos_ate?: number | null } | null;
  horario_condicional?: boolean;
  aviso?: { texto?: string | null; missa_alternada?: boolean } | null;
};
type Data = {
  celebration: {
    date: string;
    title: string;
    color: string | null;
    summary?: {
      name?: string;
      rank?: string;
      rite?: string;
      readings: Array<{ kind: 'FIRST_READING' | 'SECOND_READING' | 'PSALM' | 'GOSPEL'; reference: string; alternative?: string }>;
      alternatives: string[];
    };
  };
  suggestions: Suggestion[];
  source: { name: string; url: string };
  catalogAvailable: boolean;
};

const colorClasses: Record<string, string> = {
  VERDE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  ROXO: 'border-violet-200 bg-violet-50 text-violet-800',
  BRANCO: 'border-stone-200 bg-stone-100 text-stone-600',
  VERMELHO: 'border-red-200 bg-red-50 text-red-800',
  ROSA: 'border-pink-200 bg-pink-50 text-pink-800',
};

function localToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function moveDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString('en-CA');
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
}

function isoDateInLisbon(value: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
}

function nextMassDate(church: ChurchResult) {
  const minutes = church.proxima_missa?.minutos_ate;
  if (typeof minutes !== 'number' || minutes < 0) return null;
  return isoDateInLisbon(new Date(Date.now() + minutes * 60_000));
}

function massLabel(church: ChurchResult) {
  const next = church.proxima_missa;
  if (!next?.hora || !next.dia) return 'Horário de missa indisponível';
  if (church.estado === 'a_decorrer') return `Missa a decorrer · começou às ${next.hora}`;
  return `${next.dia}, ${next.hora}`;
}

function distanceLabel(meters?: number) {
  if (typeof meters !== 'number') return null;
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toLocaleString('pt-PT', { maximumFractionDigits: 1 })} km`;
}

const readingLabels = {
  FIRST_READING: '1ª leitura',
  SECOND_READING: '2ª leitura',
  PSALM: 'Salmo',
  GOSPEL: 'Evangelho',
} as const;

export default function SuggestionsPageClient() {
  const [date, setDate] = useState(localToday);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locality, setLocality] = useState('');
  const [churches, setChurches] = useState<ChurchResult[]>([]);
  const [churchLoading, setChurchLoading] = useState(false);
  const [churchError, setChurchError] = useState<string | null>(null);
  const [selectedChurch, setSelectedChurch] = useState<ChurchResult | null>(null);
  const [isChurchSearchOpen, setIsChurchSearchOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetch(`/api/sugestoes?date=${date}&format=2`, { signal: controller.signal, cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(setData)
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date]);

  const celebrationSummary = data?.celebration.summary;
  const alternativeCelebrations = celebrationSummary?.alternatives || [];

  async function findChurches(url: string) {
    setChurchLoading(true);
    setChurchError(null);
    setSelectedChurch(null);
    try {
      const response = await fetch(url, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível pesquisar igrejas.');
      setChurches(payload.igrejas || []);
    } catch (searchError) {
      setChurches([]);
      setChurchError(searchError instanceof Error ? searchError.message : 'Não foi possível pesquisar igrejas.');
    } finally {
      setChurchLoading(false);
    }
  }

  function searchLocality(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = locality.trim();
    if (query.length < 2) {
      setChurchError('Escreve pelo menos 2 caracteres para pesquisar uma localidade.');
      return;
    }
    void findChurches(`/api/horarios-missas?mode=locality&q=${encodeURIComponent(query)}`);
  }

  function useLocation() {
    if (!navigator.geolocation) {
      setChurchError('Este navegador não suporta a localização. Pesquisa pela localidade.');
      return;
    }
    setChurchError(null);
    navigator.geolocation.getCurrentPosition(
      position => void findChurches(`/api/horarios-missas?mode=near&lat=${position.coords.latitude}&lng=${position.coords.longitude}`),
      () => setChurchError('Não foi possível obter a tua localização. Pesquisa pela localidade.'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  function prepareForChurch(church: ChurchResult) {
    setSelectedChurch(church);
    const churchDate = nextMassDate(church);
    if (churchDate) setDate(churchDate);
    setIsChurchSearchOpen(false);
  }

  return (
    <div className="relative min-h-screen w-full bg-white">
      <header className="border-b border-stone-100 bg-white pt-20 pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <Link href="/musics" className="mb-6 inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-900">
            <ChevronLeft className="h-3.5 w-3.5" /> Músicas
          </Link>
          <div className="mb-3 flex items-center gap-3">
            <span className="text-sm text-rose-700">✝</span>
            <span className="h-px w-6 bg-stone-300" />
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-stone-400">Preparação da Missa</span>
          </div>
          <h1 className="mb-3 font-display text-3xl leading-tight text-stone-900 sm:text-4xl md:text-5xl">Sugestões de cânticos</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-stone-500 sm:text-base">Prepara cada momento da Missa a partir do calendário litúrgico e da biblioteca Cantólico.</p>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-3 py-6 pb-20 sm:gap-10 sm:px-4 sm:py-8 sm:pb-8 md:px-8 md:py-14">
        <section className="border-b border-stone-100 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-3">
              <button aria-label="Dia anterior" onClick={() => setDate(current => moveDate(current, -1))} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-stone-200 text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"><ChevronLeft className="h-4 w-4" /></button>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-400">Celebração escolhida</p>
                <p className="mt-1 font-medium text-stone-900">{dateLabel(date)}</p>
              </div>
              <button aria-label="Dia seguinte" onClick={() => setDate(current => moveDate(current, 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-stone-200 text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-2">
              <input aria-label="Escolher data" type="date" value={date} onChange={event => setDate(event.target.value)} className="h-9 min-w-0 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-700 outline-none transition-colors focus:border-rose-700 focus:ring-2 focus:ring-rose-700/15" />
              <button onClick={() => setDate(localToday())} className="h-9 rounded-md bg-stone-900 px-3 text-sm font-medium text-white transition-colors hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700">Hoje</button>
            </div>
          </div>
        </section>

        <section className="border-b border-stone-100 pb-6">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setIsChurchSearchOpen(current => !current)} aria-expanded={isChurchSearchOpen} className="group inline-flex h-9 items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 text-sm text-stone-600 shadow-sm transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"><MapPin className="h-3.5 w-3.5 text-rose-700" /><span>Onde vais à Missa?</span><ChevronRight className={`h-3.5 w-3.5 text-stone-400 transition-transform group-hover:text-rose-700 ${isChurchSearchOpen ? 'rotate-90' : ''}`} /></button>
            {selectedChurch && <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-stone-500"><Church className="h-3.5 w-3.5 shrink-0 text-rose-700" /><span className="truncate">{selectedChurch.nome}</span><span className="text-stone-300">·</span><span className="shrink-0">{massLabel(selectedChurch)}</span></span>}
          </div>

          {isChurchSearchOpen && <div className="mt-4 max-w-3xl border-l-2 border-rose-200 pl-4 sm:pl-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="flex-1 text-sm text-stone-500">Encontra uma igreja e prepara os cânticos para a próxima celebração.</p>
              <button type="button" onClick={useLocation} disabled={churchLoading} className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 text-sm font-medium text-stone-600 transition-colors hover:text-rose-800 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"><LocateFixed className="h-3.5 w-3.5" /> Usar localização</button>
            </div>

            <form onSubmit={searchLocality} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="church-locality">Localidade</label>
              <div className="relative flex-1"><MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input id="church-locality" value={locality} onChange={event => setLocality(event.target.value)} placeholder="Localidade, por exemplo Fátima" className="h-10 w-full rounded-md border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm text-stone-800 outline-none transition-colors placeholder:text-stone-400 focus:border-rose-700 focus:ring-2 focus:ring-rose-700/15" /></div>
              <button type="submit" disabled={churchLoading} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-stone-900 px-4 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"><Search className="h-4 w-4" /> Pesquisar</button>
            </form>

            {churchLoading && <p className="mt-3 flex items-center gap-2 text-sm text-stone-500"><LoaderCircle className="h-4 w-4 animate-spin text-rose-700" /> A procurar missas…</p>}
            {churchError && <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{churchError}</p>}
            {!churchLoading && !churchError && churches.length === 0 && <p className="mt-3 text-sm text-stone-500">Pesquisa uma localidade ou usa a localização.</p>}

            {churches.length > 0 && (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {churches.map(church => {
                  const isSelected = selectedChurch?.id === church.id;
                  const scheduledDate = nextMassDate(church);
                  return <article key={church.id} className={`rounded-lg border bg-white p-4 transition-colors ${isSelected ? 'border-rose-300 ring-2 ring-rose-700/15' : 'border-stone-200'}`}>
                    <div className="flex gap-3"><Church className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-medium text-stone-900">{church.nome}</h3>{distanceLabel(church.distancia_m) && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{distanceLabel(church.distancia_m)}</span>}</div>{church.endereco && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-500">{church.endereco}</p>}</div></div>
                    <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-stone-700"><Clock3 className="h-4 w-4 text-rose-700" />{massLabel(church)}</p>
                    {(church.horario_condicional || church.aviso?.texto || church.aviso?.missa_alternada) && <p className="mt-2 text-xs leading-relaxed text-amber-800">{church.aviso?.texto || 'Horário sujeito a confirmação.'}</p>}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><a href={church.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-stone-500 underline underline-offset-2 hover:text-stone-800">Fonte: horariosmissas.pt <ExternalLink className="h-3 w-3" /></a><button type="button" onClick={() => prepareForChurch(church)} disabled={!scheduledDate} className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-stone-300">{isSelected ? 'Missa escolhida' : scheduledDate ? 'Preparar esta missa' : 'Sem próxima missa'}</button></div>
                  </article>;
                })}
              </div>
            )}
          </div>}
        </section>

        {loading && <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-stone-500"><LoaderCircle className="h-5 w-5 animate-spin text-rose-700" /> A preparar sugestões…</div>}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-800"><CalendarDays className="mx-auto mb-3 h-8 w-8" /><p className="font-semibold">Não foi possível consultar o calendário agora.</p><p className="mt-1 text-sm opacity-80">Tenta novamente dentro de instantes.</p></div>}

        {!loading && data && (
          <>
            <section className="rounded-xl border border-stone-200 bg-white p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600"><BookOpen className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-400">Liturgia do dia · {dateLabel(data.celebration.date)}</p>
                    <h2 className="mt-2 font-display text-2xl leading-tight text-stone-900 sm:text-3xl">{data.celebration.summary?.name || data.celebration.title}</h2>
                    {data.celebration.summary?.name && <p className="mt-2 text-sm text-stone-500">{data.celebration.title}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 pl-[54px] sm:pl-0">
                  {data.celebration.summary?.rank && <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">{data.celebration.summary.rank}</span>}
                  {data.celebration.color && <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${colorClasses[data.celebration.color] || 'border-stone-200 bg-stone-100 text-stone-600'}`}>{data.celebration.color}</span>}
                </div>
              </div>
              {data.celebration.summary?.rite && (
                <div className="ml-[54px] mt-3 flex items-center gap-1.5 text-sm text-stone-500">
                  <p>{data.celebration.summary.rite}</p>
                  {alternativeCelebrations.length > 0 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <button aria-label="Ver celebrações particulares e notas do calendário" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700">
                          <Info className="h-4 w-4" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[80vh] overflow-y-auto bg-white sm:max-w-xl">
                        <DialogHeader>
                          <DialogTitle>Outras celebrações neste dia</DialogTitle>
                          <DialogDescription>Indicações próprias de dioceses, institutos e comunidades presentes na Agenda Litúrgica do SNL.</DialogDescription>
                        </DialogHeader>
                        <ul className="space-y-3">
                          {alternativeCelebrations.map((alternative, index) => (
                            <li key={alternative} className="border-l-2 border-rose-200 pl-3 text-sm leading-relaxed text-stone-600"><span className="mr-2 text-xs font-semibold text-rose-700">{index + 1}.</span>{alternative}</li>
                          ))}
                        </ul>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              )}
              {data.celebration.summary?.readings.length ? (
                <div className="mt-5 grid overflow-hidden rounded-lg border border-stone-200 sm:grid-cols-2 lg:grid-cols-4">
                  {data.celebration.summary.readings.map((reading, index) => (
                    <div key={reading.kind} className={`bg-white px-4 py-3 ${index > 0 ? 'border-t border-stone-100 sm:border-t-0 lg:border-l' : ''}`}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{readingLabels[reading.kind]}</p>
                      <p className="mt-1 text-sm font-medium leading-snug text-stone-700">{reading.reference}</p>
                      {reading.alternative && <p className="mt-1.5 text-xs leading-snug text-stone-500"><span className="font-semibold text-stone-600">Ou:</span> {reading.alternative}</p>}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section>
              <div className="mb-5 flex items-center gap-3">
                <span className="text-sm text-rose-700">✝</span>
                <span className="h-px w-6 bg-stone-300" />
                <h2 className="font-display text-2xl text-stone-900">Cânticos por momento</h2>
              </div>
              {!data.catalogAvailable && <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">A celebração foi carregada, mas a biblioteca de cânticos está temporariamente indisponível.</p>}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.suggestions.map(suggestion => (
                  <section key={suggestion.key} className="flex min-h-52 flex-col rounded-xl border border-stone-200 bg-white p-5">
                    <h3 className="font-semibold text-stone-900">{suggestion.label}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-stone-500">{suggestion.guidance}</p>
                    <div className="mt-4 space-y-2">
                      {suggestion.songs.length ? suggestion.songs.map((song, index) => (
                        <Link key={song.id} href={`/musics/${song.slug || song.id}`} className={`group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${index === 0 ? 'border border-rose-200 bg-rose-50 text-rose-900 shadow-sm hover:border-rose-300 hover:bg-rose-100' : 'bg-stone-50 text-stone-700 hover:bg-rose-50 hover:text-rose-800'}`}>
                          <span className="min-w-0 truncate">{index === 0 && <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-rose-700 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-white"><Sparkles className="h-2.5 w-2.5" />Principal</span>}{song.title}</span><ChevronRight className={`h-4 w-4 shrink-0 ${index === 0 ? 'text-rose-700' : 'text-stone-400 group-hover:text-rose-700'}`} />
                        </Link>
                      )) : <p className="rounded-lg bg-stone-50 px-3 py-3 text-sm text-stone-500">Ainda não há cânticos classificados neste momento.</p>}
                    </div>
                  </section>
                ))}
              </div>
            </section>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-stone-400">Calendário: <a href={data.source.url} target="_blank" rel="noreferrer" className="underline transition-colors hover:text-stone-700">{data.source.name}</a><ExternalLink className="h-3 w-3" /> · As sugestões são uma ajuda à preparação; confirma sempre as leituras e as orientações da tua comunidade.</p>
          </>
        )}
      </main>
    </div>
  );
}
