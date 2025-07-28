'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Music, Info, ShieldCheck, Github, UserPlus, BookOpenCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-12 space-y-16">
      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-blue-800">
          Can♱ólico!
        </h1>
        <p className="text-muted-foreground text-lg">
          Encontra, submete e partilha cânticos católicos. Um projeto aberto para servir a liturgia com música de qualidade.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Button asChild>
            <Link href="/musics">Ver músicas</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/musics/create">Submeter música</Link>
          </Button>
        </div>
      </section>

      {/* Funcionalidades principais */}
      <section className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 space-y-2">
            <Music className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Cancioneiro Organizado</h2>
            <p className="text-sm text-muted-foreground">
              Pesquise por título, tags, momento litúrgico ou instrumento. Simples, rápido e bonito.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-2">
            <UserPlus className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Comunidade colaborativa</h2>
            <p className="text-sm text-muted-foreground">
              Todos podem enviar músicas. Utilizadores de confiança são aprovados automaticamente.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-2">
            <BookOpenCheck className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Markdown + PDF</h2>
            <p className="text-sm text-muted-foreground">
              Suporta envio de partitura PDF ou acordes em formato markdown com preview em tempo real.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Sobre o projeto */}
      <section className="space-y-4 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Info className="text-blue-600" /> Sobre o Projeto
        </h2>
        <p>
          Cantar aproxima-nos de Deus. Santo Agostinho ensinou-nos que "cantar é rezar duas vezes". Este cancioneiro nasce com o desejo de tornar as músicas litúrgicas mais acessíveis, bonitas e bem preparadas, para que possam acompanhar as nossas Missas, Noites de Oração ou momentos de devoção com alegria e beleza.
        </p>
        <p>
          Cada música é cuidadosamente organizada com momentos litúrgicos, instrumentos e fontes (PDF, markdown, áudio). A comunidade é chamada a contribuir, submeter, rever e usar este espaço com amor e dedicação.
        </p>
      </section>

      {/* Segurança e termos */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="text-blue-600" /> Segurança e Legalidade
        </h2>
        <p className="text-muted-foreground text-sm">
          Os conteúdos submetidos são moderados. Apenas músicas adequadas à liturgia e dentro dos direitos legais são aceites.
        </p>
        <div className="flex gap-4">
          <Button variant="link" asChild>
            <Link href="/terms">Termos & Condições</Link>
          </Button>
        </div>
      </section>

    
    </main>
  );
}
