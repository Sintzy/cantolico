import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
        
        {/* Hero Section - Template Style */}
        <section className="relative">
          {/* Background decoration */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute left-1/2 top-0 -translate-x-1/2">
              <div className="h-80 w-80 rounded-full bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-[120px]" />
            </div>
          </div>
          
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            {/* Hero content */}
            <div className="pb-12 pt-16 md:pb-20 md:pt-32 lg:pt-40">
              {/* Section header */}
              <div className="pb-8 text-center md:pb-16">
                <div
                  className="mb-4 md:mb-6 border-y [border-image:linear-gradient(to_right,transparent,theme(colors.slate.300/.8),transparent)1]"
                  data-aos="zoom-y-out"
                >
                  <div className="-mx-0.5 flex justify-center -space-x-2 md:-space-x-3 py-2 md:py-3">
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs md:text-sm font-bold">♱</span>
                    </div>
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs md:text-sm font-bold">🎵</span>
                    </div>
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs md:text-sm font-bold">📖</span>
                    </div>
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs md:text-sm font-bold">✨</span>
                    </div>
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs md:text-sm font-bold">🎼</span>
                    </div>
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs md:text-sm font-bold">🙏</span>
                    </div>
                  </div>
                </div>
                <h1
                  className="mb-4 md:mb-6 border-y text-3xl md:text-5xl lg:text-6xl font-bold [border-image:linear-gradient(to_right,transparent,theme(colors.slate.300/.8),transparent)1] leading-tight"
                  data-aos="zoom-y-out"
                  data-aos-delay={150}
                >
                  A maior biblioteca de <br className="hidden sm:inline" />
                  cânticos católicos
                </h1>
                <div className="mx-auto max-w-3xl">
                  <p
                    className="mb-6 md:mb-8 text-base md:text-lg text-gray-700 px-4 sm:px-0"
                    data-aos="zoom-y-out"
                    data-aos-delay={300}
                  >
                    O Cantólico! é uma plataforma digital e gratuita criada para centralizar e organizar 
                    os cânticos católicos de língua portuguesa. Construída pela comunidade, para a comunidade.
                  </p>
                  <div className="relative before:absolute before:inset-0 before:border-y before:[border-image:linear-gradient(to_right,transparent,theme(colors.slate.300/.8),transparent)1]">
                    <div
                      className="mx-auto max-w-xs sm:flex sm:max-w-none sm:justify-center gap-3 md:gap-4 px-4 sm:px-0 relative z-10"
                      data-aos="zoom-y-out"
                      data-aos-delay={450}
                    >
                      <Button 
                        asChild 
                        size="lg" 
                        className="mb-3 sm:mb-0 w-full bg-gradient-to-t from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 sm:w-auto text-base md:text-lg px-6 md:px-8 py-4 md:py-6 relative z-10 pointer-events-auto"
                      >
                        <Link href="/musics" className="relative z-10">
                          Explorar Cânticos →
                        </Link>
                      </Button>
                      <Button 
                        asChild 
                        variant="outline" 
                        size="lg" 
                        className="w-full bg-white text-gray-800 hover:bg-gray-50 sm:w-auto text-base md:text-lg px-6 md:px-8 py-4 md:py-6 border-2 relative z-10 pointer-events-auto"
                      >
                        <Link href="/register" className="relative z-10">
                          Criar Conta!
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - Template Style */}
        <section className="py-12 md:py-20 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="pb-8 md:pb-12 lg:pb-20 text-center">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
                Funcionalidades Principais
              </h2>
              <p className="text-base md:text-lg text-gray-700 max-w-2xl mx-auto px-4 sm:px-0">
                Tudo o que precisas para organizar a música litúrgica católica
              </p>
            </div>
              <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="group text-center sm:text-left border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 to-blue-400 shadow-lg mb-3 md:mb-4 mx-auto sm:mx-0">
                    <Search className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <h3 className="mb-2 text-lg md:text-xl font-semibold">Pesquisa Inteligente</h3>
                  <p className="text-sm md:text-base text-gray-700">
                    Encontra cânticos por título, momento litúrgico, instrumento ou até mesmo por partes da letra.
                  </p>
                </CardContent>
              </Card>

              <Card className="group text-center sm:text-left border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-green-500 to-green-400 shadow-lg mb-3 md:mb-4 mx-auto sm:mx-0">
                    <Music className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <h3 className="mb-2 text-lg md:text-xl font-semibold">Playlists Personalizadas</h3>
                  <p className="text-sm md:text-base text-gray-700">
                    Cria e organiza playlists para diferentes momentos, épocas litúrgicas ou ocasiões especiais.
                  </p>
                </CardContent>
              </Card>

              <Card className="group text-center sm:text-left border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-500 to-purple-400 shadow-lg mb-3 md:mb-4 mx-auto sm:mx-0">
                    <Smartphone className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <h3 className="mb-2 text-lg md:text-xl font-semibold">Mobile Friendly</h3>
                  <p className="text-sm md:text-base text-gray-700">
                    Acede de qualquer lugar pelo telemóvel, tablet ou computador. Sempre disponível quando precisares.
                  </p>
                </CardContent>
              </Card>

              <Card className="group text-center sm:text-left border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-500 to-orange-400 shadow-lg mb-3 md:mb-4 mx-auto sm:mx-0">
                    <Shield className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <h3 className="mb-2 text-lg md:text-xl font-semibold">Conteúdo Verificado</h3>
                  <p className="text-sm md:text-base text-gray-700">
                    Todos os cânticos são revisados por moderadores experientes para garantir qualidade e precisão.
                  </p>
                </CardContent>
              </Card>

              <Card className="group text-center sm:text-left border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 to-pink-400 shadow-lg mb-3 md:mb-4 mx-auto sm:mx-0">
                    <Globe className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <h3 className="mb-2 text-lg md:text-xl font-semibold">Acesso Livre</h3>
                  <p className="text-sm md:text-base text-gray-700">
                    Sem paywall, sem limites. Todo o conteúdo é livre e acessível para toda a comunidade católica.
                  </p>
                </CardContent>
              </Card>

              <Card className="group text-center sm:text-left border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-400 shadow-lg mb-3 md:mb-4 mx-auto sm:mx-0">
                    <Users className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <h3 className="mb-2 text-lg md:text-xl font-semibold">Colaboração</h3>
                  <p className="text-sm md:text-base text-gray-700">
                    Contribui com novos cânticos, correções e melhorias. A plataforma cresce com a participação de todos.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-12 md:py-20 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
              <div className="space-y-4 md:space-y-6 text-center lg:text-left">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
                  O que é o Cantólico?
                </h2>
                <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                  O Cantólico é mais que uma simples biblioteca de cânticos - é um verdadeiro 
                  <strong> livro de orações cantadas</strong>. Inspirados pela sabedoria de Santo Agostinho 
                  de que "quem canta reza duas vezes", criámos uma plataforma onde cada música 
                  é cuidadosamente selecionada para enriquecer a tua experiência litúrgica.
                </p>
                <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                  Aqui encontras cânticos preparados com atenção e carinho, organizados para 
                  cada momento da celebração. Porque acreditamos que a música na Liturgia 
                  deve ser bonita, cuidada e, acima de tudo, adequada ao momento sagrado que vivemos.
                </p>
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-center gap-3 justify-center lg:justify-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span className="text-sm md:text-base text-gray-800">Cânticos organizados por momentos litúrgicos</span>
                  </div>
                  <div className="flex items-center gap-3 justify-center lg:justify-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span className="text-sm md:text-base text-gray-800">Música cuidada e preparada para a celebração</span>
                  </div>
                  <div className="flex items-center gap-3 justify-center lg:justify-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span className="text-sm md:text-base text-gray-800">Transformando o canto em oração verdadeira</span>
                  </div>
                </div>
                
                <div className="mt-6 md:mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                  <p className="text-sm md:text-base text-gray-600 italic text-center">
                    "Quem canta reza duas vezes" - Santo Agostinho
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 md:gap-6 mt-8 lg:mt-0">
                <Card className="text-center bg-gray-50 border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-4 md:p-6">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2 md:mb-3">
                      <Music className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 md:mb-2 text-sm md:text-base">Cânticos</h3>
                    <p className="text-xs md:text-sm text-gray-600">Biblioteca completa e organizada</p>
                  </CardContent>
                </Card>
                <Card className="text-center bg-gray-50 border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-4 md:p-6">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2 md:mb-3">
                      <Search className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 md:mb-2 text-sm md:text-base">Pesquisa</h3>
                    <p className="text-xs md:text-sm text-gray-600">Encontra rapidamente o que precisas</p>
                  </CardContent>
                </Card>
                <Card className="text-center bg-gray-50 border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-4 md:p-6">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2 md:mb-3">
                      <Heart className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 md:mb-2 text-sm md:text-base">Favoritos</h3>
                    <p className="text-xs md:text-sm text-gray-600">Organiza os teus cânticos preferidos</p>
                  </CardContent>
                </Card>
                <Card className="text-center bg-gray-50 border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-4 md:p-6">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2 md:mb-3">
                      <Users className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 md:mb-2 text-sm md:text-base">Comunidade</h3>
                    <p className="text-xs md:text-sm text-gray-600">Partilha e colabora com outros</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-12 md:py-20 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 md:mb-4">
                Como Funciona
              </h2>
              <p className="text-base md:text-lg text-gray-700">
                Processo simples e transparente para garantir qualidade
              </p>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-8 lg:gap-12">
              <div className="text-center space-y-3 md:space-y-4">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-tr from-blue-500 to-blue-400 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <span className="text-xl md:text-2xl font-bold text-white">1</span>
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-900">Submissão</h3>
                <p className="text-sm md:text-base text-gray-700 px-2 sm:px-0">
                  Qualquer utilizador pode submeter novos cânticos com letra, acordes e informações litúrgicas completas.
                </p>
              </div>

              <div className="text-center space-y-3 md:space-y-4">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-tr from-green-500 to-green-400 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <span className="text-xl md:text-2xl font-bold text-white">2</span>
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-900">Revisão</h3>
                <p className="text-sm md:text-base text-gray-700 px-2 sm:px-0">
                  Moderadores experientes em música litúrgica revêem cada submissão para garantir precisão e qualidade.
                </p>
              </div>

              <div className="text-center space-y-3 md:space-y-4 sm:col-span-2 md:col-span-1">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-tr from-purple-500 to-purple-400 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <span className="text-xl md:text-2xl font-bold text-white">3</span>
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-900">Publicação</h3>
                <p className="text-sm md:text-base text-gray-700 px-2 sm:px-0">
                  Após aprovação, o cântico fica disponível para toda a comunidade com busca e organização automática.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action Final */}
        <section className="relative py-12 md:py-20">
          {/* Background gradient */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true" />
          
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="py-8 md:py-12 lg:py-20">
              <div className="relative mx-auto max-w-3xl text-center">
                {/* Background decoration */}
                <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
                  <div className="absolute left-1/2 top-0 -translate-x-1/2">
                    <div className="h-60 w-60 md:h-80 md:w-80 rounded-full bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-[120px]" />
                  </div>
                </div>
                
                <h2 className="mb-4 md:mb-6 text-2xl md:text-3xl lg:text-4xl font-bold">
                  Pronto para começares?
                </h2>
                <p className="mb-6 md:mb-8 text-base md:text-lg text-gray-700 px-4 sm:px-0">
                  Junta-te a centenas de músicos, cantores e comunidades católicas que já 
                  utilizam o Cantólico para organizar e partilhar música litúrgica.
                </p>
                
                <div className="mx-auto max-w-xs sm:flex sm:max-w-none sm:justify-center gap-3 md:gap-4 px-4 sm:px-0 relative z-10">
                  <Button 
                    asChild 
                    size="lg" 
                    className="mb-3 sm:mb-0 w-full bg-gradient-to-t from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 sm:w-auto text-base md:text-lg px-6 md:px-8 py-4 md:py-6 relative z-10 pointer-events-auto"
                  >
                    <Link href="/musics" className="relative z-10">
                      Explorar Cânticos →
                    </Link>
                  </Button>
                  <Button 
                    asChild 
                    variant="outline" 
                    size="lg" 
                    className="w-full bg-white text-gray-800 hover:bg-gray-50 sm:w-auto text-base md:text-lg px-6 md:px-8 py-4 md:py-6 border-2 relative z-10 pointer-events-auto"
                  >
                    <Link href="/register" className="relative z-10">
                      Criar Conta Gratuita
                    </Link>
                  </Button>
                </div>
                
                <div className="mt-6 md:mt-8 text-xs md:text-sm text-gray-500">
                  Sem custos ocultos • Sem limites de utilização • Sempre gratuito
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
