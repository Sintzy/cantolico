"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Globe,
  Heart,
  Music,
  Search,
  Shield,
  Users,
} from "lucide-react";
import { useSession } from "@/hooks/useClerkSession";

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
}

export default function HomePageClient() {
  const { data: session } = useSession();
  const hasUser = !!session?.user;
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {

    fetch("/api/news?limit=3")
      .then(r => r.json())
      .then(d => setNews(Array.isArray(d) ? d : []))
      .catch(() => setNews([]))
      .finally(() => setNewsLoading(false));
  }, []);

  const formatDate = (v?: string | null) => {
    if (!v) return "";
    try {
      return new Date(v).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
    } catch { return ""; }
  };

  return (
    <div className="bg-white text-stone-900">

      {/* ─── HERO ─────────────────────────────────────────────────── */}
      <section className="relative border-b border-stone-100 px-5 pb-20 pt-16 md:pt-20 lg:pb-28">
        <div className="mx-auto grid max-w-screen-xl gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">

          {/* Left */}
          <div>
            <div className="mb-8 flex items-center gap-3">
              <span className="text-rose-700 text-sm leading-none">✝</span>
              <span className="h-px w-6 bg-stone-300" />
              <span className="text-xs font-medium tracking-[0.18em] text-stone-500 uppercase">
                Repretório de Cânticos Católicos
              </span>
            </div>

            <h1 className="font-display text-[clamp(2.6rem,6vw,4.8rem)] leading-[1.08] text-stone-900">
              Encontra os cânticos<br />
              para cada momento da liturgia.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-relaxed text-stone-500 md:text-lg">
              Pesquisa imediata, playlists colaborativas e preparação de missas.
              Tudo num só lugar, para todos os fieis!
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/musics"
                prefetch={false}
                className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-7 py-3.5 text-sm font-medium tracking-wide text-white transition-colors duration-200 hover:bg-rose-700"
              >
                Explorar Cânticos
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              {!hasUser && (
                <Link
                  href="/register"
                  prefetch={false}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-7 py-3.5 text-sm font-medium tracking-wide text-stone-700 transition-colors duration-200 hover:border-stone-400 hover:text-stone-900"
                >
                  Criar conta
                </Link>
              )}
            </div>
          </div>

          {/* Right: product preview card */}
          <div className="hidden lg:block">
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-200/40">
              <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
                <span className="text-sm font-semibold text-stone-800">Cânticos</span>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-stone-200" />
                  <span className="h-2.5 w-2.5 rounded-full bg-stone-200" />
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                </div>
              </div>
              <div className="px-5 pt-4 pb-2">
                <div className="flex items-center gap-2 rounded-lg bg-stone-50 border border-stone-200 px-3 py-2.5">
                  <Search className="h-3.5 w-3.5 text-stone-400" />
                  <span className="text-sm text-stone-400">Pesquisar cânticos...</span>
                </div>
              </div>
              <div className="divide-y divide-stone-100 px-3 pb-4 pt-1">
                {[
                  { title: "Deus está Aqui", moment: "Entrada", extra: "Javier Gacias" },
                  { title: "Fiat", moment: "Final", extra: "Maite López" },
                  { title: "Cordeiro de Deus I", moment: "Cordeiro", extra: "Tradicional" },
                  { title: "Hino Missão País 2025", moment: "Final", extra: "MP" },
                ].map(s => (
                  <div key={s.title} className="flex items-center gap-3 px-2 py-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-rose-50">
                      <Music className="h-3.5 w-3.5 text-rose-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stone-900">{s.title}</p>
                      <p className="text-xs text-stone-400">{s.moment} · {s.extra}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ────────────────────────────────────────────── */}
      <section className="border-b border-stone-100 px-5 py-20 md:py-24">
        <div className="mx-auto max-w-screen-xl">
          <div className="grid gap-16 lg:grid-cols-[1fr_1.6fr] lg:items-start">

            {/* Left: sticky heading */}
            <div className="lg:sticky lg:top-24">
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-rose-700">
                Funcionalidades
              </p>
              <h2 className="font-display text-[clamp(1.9rem,3.2vw,3rem)] leading-tight text-stone-900">
                Tudo para preparar e partilhar música litúrgica.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-stone-500">
                Desenhado para coros, músicos e equipas pastorais que precisam de rapidez e organização.
              </p>
              <Link
                href="/musics"
                prefetch={false}
                className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-stone-900 hover:text-rose-700 transition-colors"
              >
                Explorar a biblioteca
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Right: feature grid */}
            <div className="grid gap-px rounded-2xl border border-stone-200 bg-stone-200 overflow-hidden">
              {[
                { icon: Music,  title: "Biblioteca completa",  text: "Cânticos organizados por momento litúrgico, tema e contexto celebrativo." },
                { icon: Search, title: "Pesquisa eficiente",   text: "Encontra por título, letra, acordes ou momento em menos de um segundo." },
                { icon: Heart,  title: "Playlists pessoais",   text: "Cria e guarda repertórios para missas, grupos e ensaios." },
                { icon: Shield, title: "Conteúdo revisto",     text: "Submissões verificadas por moderadores para garantir consistência." },
                { icon: Globe,  title: "Acesso gratuito",      text: "Plataforma aberta para todas as comunidades de língua portuguesa." },
                { icon: Users,  title: "Comunidade ativa",     text: "Contribuições contínuas de músicos e equipas pastorais de todo o mundo." },
              ].map(f => (
                <div key={f.title} className="group flex items-start gap-4 bg-white p-6 transition-colors hover:bg-stone-50/70">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 transition-colors group-hover:bg-rose-100">
                    <f.icon className="h-4 w-4 text-stone-600 group-hover:text-rose-700 transition-colors" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-sm font-semibold text-stone-900">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-stone-500">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ────────────────────────────────────────── */}
      <section className="border-b border-stone-100 bg-stone-50/50 px-5 py-20 md:py-24">
        <div className="mx-auto max-w-screen-xl">
          <div className="mb-14 text-center">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-rose-700">Processo</p>
            <h2 className="font-display text-[clamp(1.7rem,3.2vw,2.8rem)] text-stone-900">
              Da submissão à partilha em 3 passos.
            </h2>
          </div>

          <div className="relative grid gap-10 md:grid-cols-3">
            {/* Connecting line */}
            <div className="absolute top-5 left-[calc(16.7%+20px)] right-[calc(16.7%+20px)] hidden h-px bg-stone-200 md:block" />

            {[
              { n: "01", title: "Submeter", text: "Envia letra, acordes e contexto litúrgico pelo formulário simples." },
              { n: "02", title: "Revisar",  text: "A equipa de moderadores valida o conteúdo para garantir qualidade." },
              { n: "03", title: "Partilhar", text: "Cântico publicado e disponível para toda a comunidade." },
            ].map(s => (
              <div key={s.n} className="relative z-10 flex flex-col items-center gap-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white">
                  <span className="font-mono text-xs font-semibold text-stone-400">{s.n}</span>
                </div>
                <div>
                  <h3 className="mb-2 text-base font-semibold text-stone-900">{s.title}</h3>
                  <p className="mx-auto max-w-[200px] text-sm leading-relaxed text-stone-500">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── NEWS ────────────────────────────────────────────────── */}
      {(newsLoading || news.length > 0) && (
        <section className="border-b border-stone-100 px-5 py-20 md:py-24">
          <div className="mx-auto max-w-screen-xl">
            <div className="mb-12 flex items-end justify-between">
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-rose-700">Novidades</p>
                <h2 className="font-display text-[clamp(1.7rem,3.2vw,2.8rem)] text-stone-900">
                  Notícias do Cantólico.
                </h2>
              </div>
              <Link href="/noticia" className="flex items-center gap-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900">
                Ver todas <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {newsLoading ? (
              <div className="grid gap-6 md:grid-cols-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="h-64 animate-pulse rounded-2xl bg-stone-100" />
                ))}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {news.map(item => {
                  const href = item.slug ? `/noticia/${item.slug}` : `/noticia/${item.id}`;
                  return (
                    <Link key={item.id} href={href} className="group overflow-hidden rounded-2xl border border-stone-200 bg-white transition-all duration-300 hover:shadow-lg hover:shadow-stone-200/60">
                      {item.coverImageUrl && (
                        <div className="h-44 overflow-hidden bg-stone-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.coverImageUrl} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        </div>
                      )}
                      <div className="p-6">
                        {item.publishedAt && (
                          <p className="mb-2 font-mono text-xs text-stone-400">{formatDate(item.publishedAt)}</p>
                        )}
                        <h3 className="mb-2 text-base font-semibold leading-snug text-stone-900 transition-colors group-hover:text-rose-700">
                          {item.title}
                        </h3>
                        {item.summary && (
                          <p className="line-clamp-2 text-sm leading-relaxed text-stone-500">{item.summary}</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── CTA ─────────────────────────────────────────────────── */}
      <section className="px-5 py-20 md:py-24">
        <div className="mx-auto max-w-screen-xl">
          <div className="relative overflow-hidden rounded-3xl bg-stone-900 px-8 py-16 text-center sm:px-14">
            {/* Subtle texture overlay */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
                backgroundSize: "24px 24px",
              }}
            />

            <div className="relative z-10">
              <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-rose-400">
                Começa agora
              </p>
              <h2 className="font-display text-[clamp(1.9rem,4.5vw,3.8rem)] leading-tight text-white">
                Pronto para preparar<br />
                a próxima celebração?
              </h2>
              <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-stone-400">
                Organiza o repertório, cria playlists e trabalha com a tua equipa num só lugar.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/musics"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-medium tracking-wide text-stone-900 transition-colors duration-200 hover:bg-rose-50"
                >
                  Ver Cânticos
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                {!hasUser && (
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 rounded-full border border-stone-600 px-8 py-3.5 text-sm font-medium tracking-wide text-stone-300 transition-colors duration-200 hover:border-stone-400 hover:text-white"
                  >
                    Criar conta gratuita
                  </Link>
                )}
              </div>
              <p className="mt-8 text-xs font-medium text-stone-600">
                100% gratuito · Sem publicidade · Sem cartão de crédito
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
