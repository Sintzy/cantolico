import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Music, Info, ShieldCheck, Github, UserPlus, BookOpenCheck } from 'lucide-react';
import { generateStructuredData } from '@/lib/structured-data';
import { Metadata } from 'next';
import { SITE_CONFIG } from '@/lib/site-images';
import BannerDisplay from '@/components/BannerDisplay';

export const metadata: Metadata = {
  title: SITE_CONFIG.name,
  description: SITE_CONFIG.description,
  keywords: [
    'cânticos católicos',
    'música religiosa',
    'liturgia',
    'cancioneiro',
    'igreja católica',
    'música sacra',
    'partituras',
    'acordes',
    'missa',
    'celebração',
  ],
  openGraph: {
    title: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    type: 'website',
    locale: 'pt_PT',
    url: 'https://cantolico.pt',
    siteName: SITE_CONFIG.name,
  },
  alternates: {
    canonical: 'https://cantolico.pt',
  },
};

export default function HomePage() {
  const websiteStructuredData = generateStructuredData({
    type: 'website',
  });

  const organizationStructuredData = generateStructuredData({
    type: 'organization',
  });

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteStructuredData),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationStructuredData),
        }}
      />

      {/* Banners do topo */}
      <BannerDisplay page="HOME" />

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
            <CardContent className="p-6 text-center space-y-3">
              <Music className="w-12 h-12 mx-auto text-blue-600" />
              <h3 className="text-xl font-semibold">Vasta Coleção</h3>
              <p className="text-muted-foreground">
                Centenas de cânticos católicos com letra, acordes e partituras organizados por momentos litúrgicos.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <UserPlus className="w-12 h-12 mx-auto text-green-600" />
              <h3 className="text-xl font-semibold">Contribuição Aberta</h3>
              <p className="text-muted-foreground">
                Qualquer pessoa pode submeter novos cânticos para enriquecer a nossa base de dados comunitária.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <ShieldCheck className="w-12 h-12 mx-auto text-purple-600" />
              <h3 className="text-xl font-semibold">Moderação</h3>
              <p className="text-muted-foreground">
                Todas as submissões são revistas por moderadores para garantir qualidade e adequação litúrgica.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Estatísticas rápidas */}
        <section className="bg-muted rounded-lg p-8">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Projeto Comunitário</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              O Cantólico! é um projeto open-source desenvolvido para servir as comunidades católicas portuguesas. 
              Acreditamos que a música é uma forma poderosa de oração e queremos torná-la acessível a todos.
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <Button asChild variant="outline">
                <Link href="/guide">
                  <BookOpenCheck className="w-4 h-4 mr-2" />
                  Como usar
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="https://github.com/sintzy/cantolico" target="_blank" rel="noopener noreferrer">
                  <Github className="w-4 h-4 mr-2" />
                  Ver no GitHub
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Call to action */}
        <section className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Começa já a explorar</h2>
          <p className="text-muted-foreground">
            Descobre a nossa coleção de cânticos ou contribui com os teus próprios.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Button asChild size="lg">
              <Link href="/musics">Explorar cânticos</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/register">Criar conta</Link>
            </Button>
          </div>
        </section>

        {/* Informações adicionais */}
        <section className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Info className="w-5 h-5" />
              Sobre o projeto
            </h3>
            <p className="text-muted-foreground">
              O Cantólico! nasceu da necessidade de centralizar e organizar os cânticos católicos em língua portuguesa. 
              O nosso objetivo é criar uma plataforma colaborativa onde as comunidades possam encontrar, partilhar e 
              descobrir música litúrgica de qualidade.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">Open Source</Badge>
              <Badge variant="secondary">Gratuito</Badge>
              <Badge variant="secondary">Comunitário</Badge>
              <Badge variant="secondary">Português</Badge>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Como funciona
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                  1
                </div>
                <p className="text-muted-foreground">
                  Os utilizadores submetem cânticos com letra, acordes e informações litúrgicas
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                  2
                </div>
                <p className="text-muted-foreground">
                  Os moderadores reveem e aprovam as submissões para garantir qualidade
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                  3
                </div>
                <p className="text-muted-foreground">
                  Os cânticos aprovados ficam disponíveis para toda a comunidade
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
