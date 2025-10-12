import { Metadata } from 'next';
import Link from 'next/link';
import { Music, Search, Download, Heart, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: '🎵 Melhor Alternativa ao MusiCristo e VitaminaC | Cantólico - Cânticos Católicos Grátis',
  description: '⭐ Cantólico é MELHOR que MusiCristo e VitaminaC! +1000 cânticos católicos GRÁTIS com letras, acordes e partituras. Interface moderna, busca rápida e sem limitações!',
  keywords: [
    // Competidores diretos
    'melhor que musicristo', 'alternativa musicristo', 'musicristo gratis',
    'melhor que vitamina c', 'alternativa vitaminac', 'vitamina c canticos',
    'substituir musicristo', 'trocar vitaminac',
    
    // Comparações
    'musicristo vs cantolico', 'vitaminac vs cantolico', 
    'melhor site canticos catolicos', 'melhor cancioneiro online',
    
    // Vantagens
    'canticos gratis sem limite', 'site canticos moderno', 
    'canticos sem cadastro', 'acordes gratis ilimitados',
    'melhor interface canticos', 'site canticos rapido'
  ],
  openGraph: {
    title: 'Cantólico - Melhor que MusiCristo e VitaminaC!',
    description: '🎵 A verdadeira evolução dos cânticos católicos online! Interface moderna, +1000 cânticos grátis, sem limitações.',
    type: 'website',
    url: 'https://cantolico.pt/melhor-alternativa',
  }
};

export default function MelhorAlternativaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full mb-6">
            <Zap className="h-4 w-4" />
            <span className="font-semibold">A Evolução dos Cânticos Online</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Cantólico é <span className="text-blue-600">MELHOR</span> que<br />
            <span className="text-red-500">MusiCristo</span> e <span className="text-orange-500">VitaminaC</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            🎵 Descobre porque milhares de músicos e líderes de liturgia já escolheram o Cantólico como a melhor alternativa moderna e gratuita!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/musics">
                <Music className="h-5 w-5 mr-2" />
                Explorar +1000 Cânticos
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/playlists/explore">
                <Users className="h-5 w-5 mr-2" />
                Ver Playlists da Comunidade
              </Link>
            </Button>
          </div>
        </div>

        {/* Comparison Table */}
        <Card className="mb-12">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-center mb-8">Comparação Direta</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Funcionalidade</th>
                    <th className="text-center p-4 font-semibold text-blue-600">🎵 Cantólico</th>
                    <th className="text-center p-4 font-semibold text-red-500">MusiCristo</th>
                    <th className="text-center p-4 font-semibold text-orange-500">VitaminaC</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Cânticos Disponíveis</td>
                    <td className="text-center p-4 text-blue-600 font-bold">+1000 📈</td>
                    <td className="text-center p-4 text-gray-500">Limitado</td>
                    <td className="text-center p-4 text-gray-500">Básico</td>
                  </tr>
                  <tr className="border-b bg-green-50">
                    <td className="p-4 font-medium">Totalmente Grátis</td>
                    <td className="text-center p-4 text-green-600 font-bold">✅ SIM</td>
                    <td className="text-center p-4 text-red-500">❌ Limitações</td>
                    <td className="text-center p-4 text-red-500">❌ Pago</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Interface Moderna</td>
                    <td className="text-center p-4 text-blue-600 font-bold">✅ 2024</td>
                    <td className="text-center p-4 text-gray-500">Antiga</td>
                    <td className="text-center p-4 text-gray-500">Básica</td>
                  </tr>
                  <tr className="border-b bg-blue-50">
                    <td className="p-4 font-medium">Busca Inteligente</td>
                    <td className="text-center p-4 text-blue-600 font-bold">✅ Avançada</td>
                    <td className="text-center p-4 text-gray-500">Simples</td>
                    <td className="text-center p-4 text-gray-500">Limitada</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Playlists Colaborativas</td>
                    <td className="text-center p-4 text-green-600 font-bold">✅ Sim</td>
                    <td className="text-center p-4 text-red-500">❌ Não</td>
                    <td className="text-center p-4 text-red-500">❌ Não</td>
                  </tr>
                  <tr className="border-b bg-green-50">
                    <td className="p-4 font-medium">Download PDF</td>
                    <td className="text-center p-4 text-green-600 font-bold">✅ Grátis</td>
                    <td className="text-center p-4 text-orange-500">💰 Pago</td>
                    <td className="text-center p-4 text-red-500">❌ Não</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Mobile Responsivo</td>
                    <td className="text-center p-4 text-blue-600 font-bold">✅ Perfeito</td>
                    <td className="text-center p-4 text-gray-500">Básico</td>
                    <td className="text-center p-4 text-gray-500">Problemático</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Advantages Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Search className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold">Busca Superinteligente</h3>
              </div>
              <p className="text-gray-600">
                Encontra qualquer cântico por título, primeira linha, momento litúrgico ou até mesmo por acordes. Nossa busca é mais avançada que MusiCristo e VitaminaC juntos!
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Download className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold">Tudo Gratuito</h3>
              </div>
              <p className="text-gray-600">
                Zero limitações! Diferente do MusiCristo que cobra por funcionalidades básicas, no Cantólico tudo é 100% grátis para sempre.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold">Comunidade Ativa</h3>
              </div>
              <p className="text-gray-600">
                Playlists colaborativas, comentários e uma comunidade que cresce cada dia. Recursos que nem MusiCristo nem VitaminaC oferecem!
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Heart className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold">Feito com Amor</h3>
              </div>
              <p className="text-gray-600">
                Desenvolvido por músicos para músicos. Interface moderna, rápida e pensada para quem realmente usa cânticos católicos na liturgia.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Testimonials Section */}
        <Card className="mb-12">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-center mb-8">O que dizem os utilizadores</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="italic mb-4 text-gray-700">
                  "Depois de anos usando MusiCristo, descobri o Cantólico e não volto mais. A interface é muito mais moderna e tudo é grátis!"
                </p>
                <p className="font-semibold text-gray-900">- Pedro, Músico da Paróquia</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="italic mb-4 text-gray-700">
                  "O Cantólico tem muito mais cânticos que o VitaminaC e a busca funciona perfeitamente. Recomendo a todas as equipas de liturgia!"
                </p>
                <p className="font-semibold text-gray-900">- Maria, Coordenadora de Música</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para fazer a mudança?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Junta-te aos milhares que já descobriram a melhor alternativa!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/musics">
                Começar Agora - É Grátis!
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/register">
                Criar Conta Gratuita
              </Link>
            </Button>
          </div>
          
          <p className="text-sm text-gray-500 mt-4">
            Sem compromissos • Sempre gratuito • Cancela quando quiseres (mas não vais querer! 😉)
          </p>
        </div>

      </div>
    </div>
  );
}