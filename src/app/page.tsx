import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Music, 
  ShieldCheck, 
  Github, 
  UserPlus, 
  BookOpenCheck, 
  Heart, 
  Users, 
  Star, 
  ArrowRight,
  Search,
  Church,
  Crown,
  Shield
} from 'lucide-react';
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

      <main className="max-w-6xl mx-auto px-4 py-16 space-y-24">
        
        {/* Hero Section */}
        <section className="text-center space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Can♱ólico!
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Encontre, submeta e partilhe cânticos católicos. Um projeto aberto para servir a liturgia com música de qualidade.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button asChild size="lg">
              <Link href="/musics">
                <Music className="w-4 h-4 mr-2" />
                Explorar Cânticos
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/register">
                <UserPlus className="w-4 h-4 mr-2" />
                Criar Conta
              </Link>
            </Button>
          </div>

          {/* Simple stats */}
          <div className="flex justify-center gap-8 pt-8 text-sm text-muted-foreground">
            <div className="text-center">
              <div className="font-semibold text-foreground">500+</div>
              <div>Cânticos</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-foreground">100+</div>
              <div>Utilizadores</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-foreground">Gratuito</div>
              <div>Para sempre</div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Funcionalidades</h2>
            <p className="text-muted-foreground">Tudo o que precisa para organizar a música litúrgica</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Search className="w-8 h-8 mb-2" />
                <CardTitle>Busca Avançada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Encontre cânticos por título, momento litúrgico, instrumento ou letra.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Heart className="w-8 h-8 mb-2" />
                <CardTitle>Organização</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Crie playlists personalizadas e marque os seus cânticos favoritos.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="w-8 h-8 mb-2" />
                <CardTitle>Colaboração</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Submeta novos cânticos e contribua para a comunidade católica.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <ShieldCheck className="w-8 h-8 mb-2" />
                <CardTitle>Qualidade</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Todas as submissões são revistas por moderadores experientes.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Music className="w-8 h-8 mb-2" />
                <CardTitle>Partituras</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Acesso a partituras, acordes e letras organizadas por momento litúrgico.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Church className="w-8 h-8 mb-2" />
                <CardTitle>Liturgia</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Cânticos organizados pelos momentos da missa e celebrações.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How it works */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Como Funciona</h2>
            <p className="text-muted-foreground">Processo simples e transparente</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <span className="font-semibold text-primary">1</span>
              </div>
              <h3 className="font-semibold">Submissão</h3>
              <p className="text-muted-foreground">
                Utilizadores submetem cânticos com letra, acordes e informações litúrgicas
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <span className="font-semibold text-primary">2</span>
              </div>
              <h3 className="font-semibold">Revisão</h3>
              <p className="text-muted-foreground">
                Moderadores experientes reveem e aprovam as submissões para garantir qualidade
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <span className="font-semibold text-primary">3</span>
              </div>
              <h3 className="font-semibold">Publicação</h3>
              <p className="text-muted-foreground">
                Cânticos aprovados ficam disponíveis para toda a comunidade católica
              </p>
            </div>
          </div>
        </section>

        {/* User Roles */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Sistema de Utilizadores</h2>
            <p className="text-muted-foreground">Cresça na comunidade através da contribuição</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Music className="w-8 h-8 mb-2" />
                <CardTitle className="flex items-center gap-2">
                  Utilizador
                  <Badge variant="secondary">Início</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-muted-foreground">
                  Explore a biblioteca, crie playlists e submeta cânticos.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="w-8 h-8 mb-2" />
                <CardTitle className="flex items-center gap-2">
                  Revisor
                  <Badge variant="secondary">Confiança</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-muted-foreground">
                  Modere submissões e ajude a manter a qualidade da plataforma.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Crown className="w-8 h-8 mb-2" />
                <CardTitle className="flex items-center gap-2">
                  Admin
                  <Badge variant="secondary">Liderança</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-muted-foreground">
                  Gestão completa da plataforma e orientação da comunidade.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* About */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Sobre o Projeto</h2>
            <p className="text-muted-foreground">Open source e construído pela comunidade</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                O Cantólico! nasceu da necessidade de centralizar e organizar os cânticos católicos em língua portuguesa. 
                É um projeto totalmente gratuito e de código aberto, mantido por voluntários apaixonados pela liturgia.
              </p>
              
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">Open Source</Badge>
                <Badge variant="outline">Gratuito</Badge>
                <Badge variant="outline">Comunitário</Badge>
                <Badge variant="outline">Português</Badge>
              </div>

              <div className="flex gap-4 pt-4">
                <Button asChild variant="outline">
                  <Link href="/guide">
                    <BookOpenCheck className="w-4 h-4 mr-2" />
                    Documentação
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="https://github.com/sintzy/cantolico" target="_blank" rel="noopener noreferrer">
                    <Github className="w-4 h-4 mr-2" />
                    GitHub
                  </Link>
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="space-y-2">
                  <div className="text-2xl font-bold">100%</div>
                  <div className="text-sm text-muted-foreground">Gratuito</div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-sm text-muted-foreground">Publicidade</div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">MIT</div>
                  <div className="text-sm text-muted-foreground">Licença</div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">24/7</div>
                  <div className="text-sm text-muted-foreground">Disponível</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center space-y-6 py-16">
          <h2 className="text-3xl font-bold tracking-tight">Comece hoje</h2>
          <p className="text-muted-foreground">
            Junte-se à comunidade e descubra uma nova forma de organizar a música litúrgica.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/musics">
                Explorar Cânticos
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/register">
                Criar Conta Gratuita
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </>
  );
}
