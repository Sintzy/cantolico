"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Music, Sparkles, Users, Heart, Play, ArrowRight, Zap, Shield, Globe } from 'lucide-react';
import { useSession } from 'next-auth/react';

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
    const loadNews = async () => {
      try {
        const res = await fetch('/api/news?limit=3');
        const data = await res.json();
        setNews(Array.isArray(data) ? data : []);
      } catch {
        setNews([]);
      } finally {
        setNewsLoading(false);
      }
    };

    loadNews();
  }, []);

  const formatDate = (value?: string | null) => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  return (
    <>
      {/* Hero Section - Modern White */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-200/15 rounded-full mix-blend-screen filter blur-3xl animate-float"></div>
          <div className="absolute top-40 right-1/4 w-96 h-96 bg-orange-200/15 rounded-full mix-blend-screen filter blur-3xl animate-float-delayed"></div>
          <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-yellow-200/10 rounded-full mix-blend-screen filter blur-3xl animate-float"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
          {/* Badge */}
          <div className="mb-5 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-rose-50 border border-rose-200/60 text-rose-600">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">Cânticos católicos num só lugar</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-4 text-slate-900 leading-tight">
            A melhor forma de encontrar
            <span className="block text-rose-600">canticos católicos</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-slate-700 max-w-2xl mx-auto mb-10 font-medium">
            Pesquisa, cria playlists e prepara celebrações em minutos. Simples, bonito e feito para a comunidade.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <Button 
              asChild 
              size="lg" 
              className="bg-rose-600 hover:bg-rose-700 text-white text-lg px-8 py-5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group font-semibold"
            >
              <Link href="/musics" prefetch={false} className="flex items-center gap-2">
                Ver Cânticos
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            {!hasUser && (
              <Button 
                asChild 
                size="lg" 
                className="border-2 border-slate-300 hover:border-slate-400 bg-white text-slate-800 text-lg px-8 py-5 rounded-xl transition-all duration-300 font-semibold"
              >
                <Link href="/register" prefetch={false}>
                  Criar Conta
                </Link>
              </Button>
            )}
          </div>

        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="animate-bounce">
            <div className="w-6 h-10 border-2 border-slate-400 rounded-full flex items-start justify-center p-2">
              <div className="w-1 h-2 bg-slate-400 rounded-full animate-scroll"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Modern Cards */}
      <section className="py-16 bg-white relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-rose-50 text-rose-600 mb-3 border border-rose-200">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-bold">Funcionalidades</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 leading-tight">
              Tudo o que precisas
            </h2>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-medium">
              Pesquisa rápida, playlists e gestão simples num só sítio
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Feature 1 */}
            <Card className="group relative border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden bg-white">
              <CardContent className="p-6 relative z-10">
                <div className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center mb-4">
                  <Music className="w-6 h-6 text-rose-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Biblioteca</h3>
                <p className="text-slate-700 leading-relaxed font-medium text-sm">
                  Cânticos organizados por momento litúrgico e tema.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="group relative border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden bg-white">
              <CardContent className="p-6 relative z-10">
                <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center mb-4">
                  <Play className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Pesquisa rápida</h3>
                <p className="text-slate-700 leading-relaxed font-medium text-sm">
                  Encontra por título, letra, momento ou instrumento.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="group relative border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden bg-white">
              <CardContent className="p-6 relative z-10">
                <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Playlists</h3>
                <p className="text-slate-700 leading-relaxed font-medium text-sm">
                  Cria coleções para missas e ensaios.
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="group relative border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden bg-white">
              <CardContent className="p-6 relative z-10">
                <div className="w-11 h-11 bg-yellow-50 rounded-xl flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-yellow-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Revisão</h3>
                <p className="text-slate-700 leading-relaxed font-medium text-sm">
                  Conteúdo revisto por moderadores.
                </p>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card className="group relative border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden bg-white">
              <CardContent className="p-6 relative z-10">
                <div className="w-11 h-11 bg-pink-50 rounded-xl flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-pink-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Sem custos</h3>
                <p className="text-slate-700 leading-relaxed font-medium text-sm">
                  Acesso livre a toda a biblioteca.
                </p>
              </CardContent>
            </Card>

            {/* Feature 6 */}
            <Card className="group relative border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden bg-white">
              <CardContent className="p-6 relative z-10">
                <div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Comunidade ativa</h3>
                <p className="text-slate-700 leading-relaxed font-medium text-sm">
                  Partilha, cria e ajuda a melhorar.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="py-16 bg-white relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-rose-50 text-rose-600 mb-3 border border-rose-200">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-bold">Notícias</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 leading-tight">
              Novidades do Cantólico
            </h2>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-medium">
              Atualizações rápidas para a comunidade
            </p>
          </div>

          {newsLoading ? (
            <div className="text-center text-slate-600">A carregar notícias...</div>
          ) : news.length === 0 ? (
            <div className="text-center text-slate-600">Sem notícias ainda.</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {news.map((item) => {
                const link = item.slug ? `/noticia/${item.slug}` : `/noticia/${item.id}`;
                return (
                  <Card key={item.id} className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden bg-white">
                    {item.coverImageUrl && (
                      <div className="h-40 w-full overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.coverImageUrl} alt={item.title} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <CardContent className="p-5">
                      <p className="text-xs text-slate-500 mb-2">{formatDate(item.publishedAt)}</p>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                      {item.summary && (
                        <p className="text-sm text-slate-600 mb-3">{item.summary}</p>
                      )}
                      <Link href={link} className="text-sm font-semibold text-rose-600 hover:underline">
                        Ler notícia
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* About Section - Modern Layout */}
      <section className="py-16 bg-slate-50 relative overflow-hidden">
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-rose-200/20 rounded-full -translate-y-1/2 blur-3xl opacity-60"></div>
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Left Content */}
            <div className="space-y-5">
              <div>
                <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white text-rose-600 mb-3 border border-slate-200">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-semibold">Sobre o Cantólico</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-4">
                  Tudo o que precisas para cantar na missa
                </h2>
                <p className="text-slate-700 text-lg leading-relaxed">
                  Uma plataforma pensada para facilitar a vida de quem canta nas celebrações. Organização simples, pesquisa rápida e conteúdos sempre à mão.
                </p>
              </div>

              <Button asChild size="lg" className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-xl shadow-md w-auto group">
                <Link href="/musics" className="flex items-center gap-2">
                  Explorar
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>

            {/* Right Side - Clean Preview */}
            <div className="relative">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-rose-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Tudo pronto a usar</h3>
                      <p className="text-xs text-slate-600">Pesquisa rápida e organização clara</p>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  <div className="flex items-center gap-3 py-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                      <Music className="w-4 h-4 text-rose-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Organizadas por momento</p>
                      <p className="text-xs text-slate-600">Entrada, comunhão, envio…</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 py-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Play className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Informações pertinentes</p>
                      <p className="text-xs text-slate-600">Acordes, partituras, audios, etc...</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 py-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                      <Globe className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Partilha fácil</p>
                      <p className="text-xs text-slate-600">Cria playlists com as tuas músicas favoritas</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-16 bg-white relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Section Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-rose-50 text-rose-600 mb-3 border border-rose-200">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-bold">Como Funciona</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 leading-tight">
              Em três passos
            </h2>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-medium">
              Submete, revê e publica. Simples e rápido.
            </p>
          </div>

          {/* Process Timeline */}
          <div className="grid md:grid-cols-3 gap-5 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-16 left-0 right-0 h-1 bg-gradient-to-r from-rose-200 via-orange-200 to-amber-200"></div>

            {/* Step 1 */}
            <div className="relative">
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-rose-600 rounded-full flex items-center justify-center mb-5 shadow-lg relative z-20">
                  <span className="text-2xl font-black text-white">1</span>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 text-center">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Submete</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    Envia letra, acordes e tags.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center mb-5 shadow-lg relative z-20">
                  <span className="text-2xl font-black text-white">2</span>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 text-center">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Revisão</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    A equipa valida e melhora.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center mb-5 shadow-lg relative z-20">
                  <span className="text-2xl font-black text-white">3</span>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 text-center">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Online</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    Fica disponível para todos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final Section */}
      <section className="py-16 bg-white relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-200/15 rounded-full mix-blend-screen filter blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-200/15 rounded-full mix-blend-screen filter blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 leading-tight">
            Pronto para começar?
          </h2>
          <p className="text-lg md:text-xl text-slate-700 mb-10 max-w-2xl mx-auto font-medium">
            Explora, cria playlists e prepara a tua próxima celebração.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Button 
              asChild 
              size="lg" 
              className="bg-rose-600 hover:bg-rose-700 text-white text-lg px-8 py-5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group font-semibold"
            >
              <Link href="/musics" className="flex items-center gap-2">
                Ver Cânticos
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            {!hasUser && (
              <Button 
                asChild 
                size="lg" 
                className="border-2 border-slate-300 text-slate-800 hover:bg-slate-50 text-lg px-8 py-5 rounded-xl bg-white transition-all duration-300 font-semibold"
              >
                <Link href="/register">
                  Criar Conta
                </Link>
              </Button>
            )}
          </div>

          {/* Footer note */}
          <p className="text-sm text-slate-600 font-medium">
            100% gratuito • Sem publicidade
          </p>
        </div>
      </section>
    </>
  );
}
