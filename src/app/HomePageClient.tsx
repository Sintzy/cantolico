"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Music, Search, Heart, Users, Smartphone, Globe, Shield, 
  ArrowRight, BookOpen, CheckCircle2, Sparkles, AudioLines, 
  ListMusic, RadioTower
} from 'lucide-react';
import { useUser } from '@clerk/nextjs';

export default function HomePageClient() {
  const { user } = useUser();

  return (
    <main className="relative min-h-screen selection:bg-red-500/20 selection:text-red-700 overflow-hidden">
      {/* Background Gradients & Grid (Transparent to blend with body) */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_800px_at_50%_-100px,#fecdd3_50%,transparent_100%)] opacity-[0.25]"></div>
      </div>

      {/* Hero Section */}
      <section className="relative px-6 pt-32 pb-20 md:pt-48 md:pb-32 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-red-100 text-red-600 text-sm font-medium mb-8 shadow-sm">
          <Sparkles className="h-4 w-4" />
          <span>Acesso gratuito para toda a comunidade</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-extrabold tracking-tight text-zinc-900 leading-[1.05] mb-8 max-w-5xl">
          A biblioteca de <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-rose-400">cânticos católicos</span> que faltava.
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-600 max-w-2xl mx-auto mb-12 leading-relaxed font-light">
          Letras, acordes e partituras organizados por momento litúrgico. 
          Uma plataforma moderna construída para elevar a música na liturgia.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto bg-zinc-900 text-white hover:bg-zinc-800 text-base px-8 py-6 rounded-full shadow-xl shadow-zinc-900/10 transition-all hover:-translate-y-0.5"
          >
            <Link href="/musics">
              Explorar Cânticos
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          {!user && (
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto text-base px-8 py-6 rounded-full border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-all bg-white/50 backdrop-blur-sm"
            >
              <Link href="/sign-up">
                Criar Conta
              </Link>
            </Button>
          )}
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="py-20 border-y border-zinc-100/50 bg-white/30 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-16 max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 mb-4">
              Tudo o que precisas, num só lugar.
            </h2>
            <p className="text-lg text-zinc-600">
              Ferramentas avançadas desenhadas especificamente para músicos, coros e animadores litúrgicos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6 lg:gap-8 auto-rows-[250px]">
            <div className="md:col-span-2 md:row-span-1 rounded-3xl bg-white border border-zinc-200/60 p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-red-100/50 text-red-600 flex items-center justify-center mb-6">
                    <Search className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">Pesquisa Inteligente</h3>
                  <p className="text-zinc-600 max-w-md leading-relaxed">
                    Encontra rapidamente qualquer cântico por tags, autor, momento litúrgico ou nome.
                  </p>
                </div>
              </div>
            </div>

            <div className="md:col-span-1 md:row-span-1 rounded-3xl bg-rose-50 border border-rose-100/60 p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/50 rounded-full blur-2xl group-hover:bg-white/80 transition-colors" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-white/60 text-rose-600 flex items-center justify-center mb-6 shadow-sm">
                    <ListMusic className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">Playlists Dinâmicas</h3>
                  <p className="text-zinc-700 leading-relaxed text-sm">
                    Organiza o repertório das missas e partilha facilmente com o teu coro.
                  </p>
                </div>
              </div>
            </div>

            <div className="md:col-span-1 md:row-span-1 rounded-3xl bg-white border border-zinc-200/60 p-8 shadow-sm hover:shadow-md transition-shadow relative">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                <Smartphone className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">Multi-dispositivo</h3>
              <p className="text-zinc-600 leading-relaxed text-sm">
                Acesso perfeito no telemóvel para os ensaios ou no tablet durante a celebração.
              </p>
            </div>

            <div className="md:col-span-2 md:row-span-1 rounded-3xl bg-white border border-zinc-200/60 p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6">
                  <Music className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">Transposição de Acordes</h3>
                  <p className="text-zinc-600 leading-relaxed max-w-xl">
                  Transpõe instantaneamente qualquer cântico para a tonalidade perfeita. Adapta-se à voz do cantor ou às capacidades do coro em segundos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* O que é o Cantólico */}
      <section className="py-24 relative bg-zinc-50/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 mb-6">
                  O que é o Cantólico?
                </h2>
                <div className="space-y-4 text-lg text-zinc-600 leading-relaxed">
                  <p>
                    O Cantólico é muito mais que uma simples base de dados de musicas. Vemos o projeto como um verdadeiro <strong className="font-semibold text-zinc-900">"livro de orações cantadas da era digital"</strong>.
                  </p>
                  <p>
                    Inspirados pela premissa de que a música na Liturgia deve ser cuidada e adequada ao mistério que se celebra, criámos um ecossistema onde a qualidade técnica e a profundidade espiritual se encontram.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                {[
                  "Repertório organizado por tempos litúrgicos.",
                  "Transposição instantânea de acordes.",
                  "Uma plataforma para elevar o serviço musical."
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="mt-1 bg-red-50 p-1 rounded-full text-red-600">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <span className="text-zinc-700 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-red-100/60 to-rose-50 rounded-[2.5rem] blur-2xl opacity-60" />
              <div className="relative bg-white/80 backdrop-blur-xl border border-zinc-200/50 rounded-[2rem] p-10 shadow-xl shadow-zinc-200/40">
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-6">
                  <BookOpen className="h-6 w-6 text-red-500" />
                </div>
                <blockquote className="text-2xl font-medium tracking-tight text-zinc-900 leading-snug mb-8">
                  "Cantar é rezar duas vezes."
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-zinc-200" />
                  <cite className="text-sm font-semibold text-zinc-500 uppercase tracking-wider not-italic">Santo Agostinho</cite>
                  <div className="h-px flex-1 bg-zinc-200" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona - LIGHT MODE V2 */}
      <section className="py-24 bg-white border-t border-zinc-100 overflow-hidden relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 mb-4">
              Como funciona
            </h2>
            <p className="text-zinc-600 text-lg">
              Em três passos simples, a sua equipa estará pronta para animar a celebração.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-8 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-zinc-200 to-transparent z-0" />
            
            {[
              { icon: Search, title: "1. Encontra", desc: "Pesquisa no nosso vasto diretório o cântico perfeito." },
              { icon: ListMusic, title: "2. Organiza", desc: "Adiciona à sua playlist para o próximo Domingo com um clique." },
              { icon: Users, title: "3. Partilha", desc: "Envia facilmente a playlist aos membros do seu coro." }
            ].map((step, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center mb-6 shadow-sm relative group">
                  <div className="absolute -inset-2 bg-red-500/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  <step.icon className="h-7 w-7 text-red-500 relative z-10" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-zinc-900">{step.title}</h3>
                <p className="text-zinc-600 leading-relaxed max-w-xs">{step.desc}</p>
              </div>
            ))}
          </div>

          {!user && (
            <div className="mt-24 text-center">
              <Button
                asChild
                size="lg"
                className="bg-red-600 text-white hover:bg-red-500 text-base px-10 py-6 rounded-full shadow-[0_8px_30px_-10px_rgba(220,38,38,0.4)] transition-all hover:-translate-y-0.5"
              >
                <Link href="/sign-up">
                  Começar Agora Gratuitamente
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
