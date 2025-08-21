import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Music, 
  Search, 
  Heart, 
  Users, 
  Smartphone,
  Globe,
  Shield
} from 'lucide-react';
import { generateStructuredData } from '@/lib/structured-data';
import { PAGE_METADATA } from '@/lib/metadata';
import BannerDisplay from '@/components/BannerDisplay';

export const metadata = PAGE_METADATA.home();

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

      <main className="min-h-screen">
        
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-white">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="max-w-4xl mx-auto space-y-8">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900">
                Can♱ólico
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
                A maior biblioteca de cânticos católicos em português.<br/>
                <span className="text-gray-900 font-medium">Gratuito, open source e construído pela comunidade.</span>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                <Button asChild size="lg" className="text-lg px-8 py-6">
                  <Link href="/musics">
                    Explorar Cânticos
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                  <Link href="/register">
                    Juntar-se Grátis
                  </Link>
                </Button>
              </div>

              {/* Stats */}
              
            </div>
          </div>
        </section>

        {/* O que é o Cantólico */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                  O que é o Cantólico?
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  O Cantólico é uma plataforma digital criada para centralizar e organizar 
                  os cânticos católicos em língua portuguesa. Nasceu da necessidade de ter 
                  um local onde músicos, cantores e comunidades católicas (paróquias, colégios, etc) possam encontrar, 
                  partilhar e organizar música litúrgica de qualidade.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-gray-900 rounded-full flex-shrink-0"></div>
                    <span className="text-gray-700">Biblioteca completa de cânticos organizados por momento litúrgico</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-gray-900 rounded-full flex-shrink-0"></div>
                    <span className="text-gray-700">Partituras, acordes e letras sempre disponíveis</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-gray-900 rounded-full flex-shrink-0"></div>
                    <span className="text-gray-700">Criado pela comunidade católica, para a comunidade católica</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Music className="w-6 h-6 text-gray-700" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Cânticos</h3>
                  <p className="text-sm text-gray-600">Biblioteca completa e organizada</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6 text-gray-700" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Pesquisa</h3>
                  <p className="text-sm text-gray-600">Encontre rapidamente o que precisa</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Heart className="w-6 h-6 text-gray-700" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Favoritos</h3>
                  <p className="text-sm text-gray-600">Organize os seus cânticos preferidos</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-gray-700" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Comunidade</h3>
                  <p className="text-sm text-gray-600">Partilhe e colabore com outros</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Funcionalidades Principais */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Funcionalidades
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Tudo o que precisa para organizar a música litúrgica
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="p-8 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-gray-700" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Pesquisa Inteligente</h3>
                <p className="text-gray-600">
                  Encontre cânticos por título, momento litúrgico, instrumento ou até mesmo por trechos da letra.
                </p>
              </div>

              <div className="p-8 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <Music className="w-6 h-6 text-gray-700" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Playlists Personalizadas</h3>
                <p className="text-gray-600">
                  Crie e organize playlists para diferentes celebrações, épocas litúrgicas ou ocasiões especiais.
                </p>
              </div>

              <div className="p-8 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <Smartphone className="w-6 h-6 text-gray-700" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Mobile Friendly</h3>
                <p className="text-gray-600">
                  Acesse de qualquer lugar pelo telemóvel, tablet ou computador. Sempre disponível quando precisar.
                </p>
              </div>

              <div className="p-8 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-gray-700" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Conteúdo Verificado</h3>
                <p className="text-gray-600">
                  Todos os cânticos são revisados por moderadores experientes para garantir qualidade e precisão.
                </p>
              </div>

              <div className="p-8 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-gray-700" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Acesso Livre</h3>
                <p className="text-gray-600">
                  Sem paywall, sem limites. Todo o conteúdo é livre e acessível para toda a comunidade católica.
                </p>
              </div>

              <div className="p-8 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-gray-700" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Colaboração</h3>
                <p className="text-gray-600">
                  Contribua com novos cânticos, correções e melhorias. A plataforma cresce com a participação de todos.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Como Funciona */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Como Funciona
              </h2>
              <p className="text-lg text-gray-600">
                Processo simples e transparente para garantir qualidade
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Submissão</h3>
                <p className="text-gray-600">
                  Qualquer utilizador pode submeter novos cânticos com letra, acordes e informações litúrgicas completas.
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Revisão</h3>
                <p className="text-gray-600">
                  Moderadores experientes em música litúrgica reveem cada submissão para garantir precisão e qualidade.
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Publicação</h3>
                <p className="text-gray-600">
                  Após aprovação, o cântico fica disponível para toda a comunidade com busca e organização automática.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action Final */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto space-y-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Vamos começar!
              </h2>
              <p className="text-xl text-gray-600">
                Junta-te a centenas de músicos, cantores e comunidades católicas que já 
                utilizam o Cantólico para organizar e partilhar música litúrgica.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                <Button asChild size="lg" className="text-lg px-8 py-6">
                  <Link href="/musics">
                    Explorar Cânticos
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                  <Link href="/register">
                    Criar Conta Gratuita
                  </Link>
                </Button>
              </div>

              <div className="text-sm text-gray-500 pt-4">
                Sem custos ocultos • Sem limites de utilização • Sempre gratuito
              </div>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
