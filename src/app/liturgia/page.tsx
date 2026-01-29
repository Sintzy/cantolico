import { Metadata } from 'next';
import { Calendar, Book, Heart, Clock, ChevronRight } from 'lucide-react';
import BannerDisplay from '@/components/BannerDisplay';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const metadata: Metadata = {
  title: 'Liturgia Diária | Cantolico',
  description: 'Acompanhe a liturgia do dia e dos próximos dias',
};

interface Oracao {
  coleta?: string;
  oferendas?: string;
  comunhao?: string;
  extras?: Array<{
    titulo: string;
    texto: string;
  }>;
}

interface Leitura {
  referencia: string;
  titulo: string;
  texto: string;
}

interface Salmo {
  referencia: string;
  refrao: string;
  texto: string;
}

interface Leituras {
  primeiraLeitura?: Leitura[];
  salmo?: Salmo[];
  segundaLeitura?: Leitura[];
  evangelho?: Leitura[];
  extras?: Array<{
    tipo: string;
    referencia: string;
    titulo: string;
    texto: string;
  }>;
}

interface Antifonas {
  entrada?: string;
  comunhao?: string;
}

interface LiturgiaData {
  data: string;
  liturgia: string;
  cor?: string;
  oracoes?: Oracao;
  leituras?: Leituras;
  antifonas?: Antifonas;
}

async function fetchLiturgia(periodo?: number): Promise<LiturgiaData> {
  try {
    const url = periodo 
      ? `https://liturgia.up.railway.app/v2/?periodo=${periodo}`
      : 'https://liturgia.up.railway.app/v2/';
    
    const response = await fetch(url, {
      next: { revalidate: 3600 } // Cache por 1 hora
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar liturgia');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar liturgia:', error);
    throw error;
  }
}

function getCorClass(cor?: string): string {
  if (!cor) return 'border-l-gray-500 bg-gray-500/5';
  
  const corLower = cor.toLowerCase();
  
  if (corLower.includes('branco')) return 'border-l-white bg-white/5';
  if (corLower.includes('vermelho')) return 'border-l-red-500 bg-red-500/5';
  if (corLower.includes('verde')) return 'border-l-green-500 bg-green-500/5';
  if (corLower.includes('roxo') || corLower.includes('violeta')) return 'border-l-purple-500 bg-purple-500/5';
  if (corLower.includes('rosa')) return 'border-l-pink-500 bg-pink-500/5';
  
  return 'border-l-gray-500 bg-gray-500/5';
}

function getCorBadge(cor?: string): string {
  if (!cor) return 'bg-gray-500 text-white';
  
  const corLower = cor.toLowerCase();
  
  if (corLower.includes('branco')) return 'bg-white text-gray-900';
  if (corLower.includes('vermelho')) return 'bg-red-500 text-white';
  if (corLower.includes('verde')) return 'bg-green-500 text-white';
  if (corLower.includes('roxo') || corLower.includes('violeta')) return 'bg-purple-500 text-white';
  if (corLower.includes('rosa')) return 'bg-pink-500 text-white';
  
  return 'bg-gray-500 text-white';
}

function cleanLeituraText(text: string): string {
  // Remove números no início de parágrafos/linhas (padrão: número seguido de letra maiúscula)
  return text.replace(/^(\d+)([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ])/gm, '$2')
             .replace(/\s(\d+)([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ])/g, ' $2');
}

function LiturgiaCard({ liturgia, isToday = false }: { liturgia: LiturgiaData; isToday?: boolean }) {
  const corClass = getCorClass(liturgia.cor);
  const corBadge = getCorBadge(liturgia.cor);

  return (
    <Card className={`group relative overflow-hidden transition-all hover:shadow-lg border-l-4 ${isToday ? 'ring-2 ring-primary shadow-md' : ''} ${corClass}`}>
      {isToday && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="bg-blue-600 text-white shadow-md">
            <Clock className="w-3 h-3 mr-1" />
            Hoje
          </Badge>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1">{liturgia.data}</CardTitle>
            <CardDescription className="text-sm font-medium">{liturgia.liturgia}</CardDescription>
          </div>
          {liturgia.cor && (
            <Badge className={`${corBadge} shrink-0`}>
              {liturgia.cor}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {liturgia.leituras && (
          <>
            {liturgia.leituras.primeiraLeitura && liturgia.leituras.primeiraLeitura[0] && (
              <div className="flex items-start gap-2 text-sm">
                <Book className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">1ª Leitura</p>
                  <p className="text-muted-foreground text-xs truncate">{liturgia.leituras.primeiraLeitura[0].referencia}</p>
                </div>
              </div>
            )}
            
            {liturgia.leituras.salmo && liturgia.leituras.salmo[0] && (
              <div className="flex items-start gap-2 text-sm">
                <Heart className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">Salmo</p>
                  <p className="text-muted-foreground text-xs truncate">{liturgia.leituras.salmo[0].referencia}</p>
                </div>
              </div>
            )}
            
            {liturgia.leituras.evangelho && liturgia.leituras.evangelho[0] && (
              <div className="flex items-start gap-2 text-sm">
                <Book className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">Evangelho</p>
                  <p className="text-amber-700 text-xs font-medium truncate">{liturgia.leituras.evangelho[0].referencia}</p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default async function LiturgiaPage() {
  let liturgiaHoje: LiturgiaData | null = null;
  let liturgiasProximas: LiturgiaData[] = [];
  let error: string | null = null;

  try {
    // Buscar liturgia de hoje
    liturgiaHoje = await fetchLiturgia();

    // Buscar liturgias dos próximos 7 dias
    const promises = Array.from({ length: 7 }, (_, i) => fetchLiturgia(i + 1));
    liturgiasProximas = await Promise.all(promises);
  } catch (err) {
    error = 'Não foi possível carregar as liturgias no momento.';
    console.error(err);
  }

  if (error) {
    return (
      <>
        <BannerDisplay page="LITURGIA" />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-3xl font-bold mb-2">Erro ao Carregar Liturgia</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <BannerDisplay page="LITURGIA" />
      
      {/* Hero Section - Estilo /musics */}
      <section className="bg-gradient-to-br from-slate-50 via-white to-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
          <div className="text-center mb-6 sm:mb-8 md:mb-12">
            {/* Decorative border */}
            <div className="mb-4 border-y [border-image:linear-gradient(to_right,transparent,--theme(--color-slate-300/.8),transparent)1]">
              <div className="-mx-0.5 flex justify-center -space-x-2 py-2">
                <div className="w-6 h-6 bg-linear-to-r from-rose-500 to-pink-600 rounded-full flex items-center justify-center">
                  <Calendar className="text-white text-xs w-3 h-3" />
                </div>
                <div className="w-6 h-6 bg-linear-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Book className="text-white text-xs w-3 h-3" />
                </div>
                <div className="w-6 h-6 bg-linear-to-r from-rose-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Heart className="text-white text-xs w-3 h-3" />
                </div>
              </div>
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 border-y [border-image:linear-gradient(to_right,transparent,--theme(--color-slate-300/.8),transparent)1] leading-tight">
              Liturgia Diária
            </h1>
            <p className="text-base sm:text-lg text-gray-700 max-w-2xl mx-auto px-4">
              Acompanhe as leituras e orações da Santa Missa
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-12">
          {liturgiaHoje && (
            <div className="mb-12">
              {/* Liturgia de Hoje - Destaque */}
              <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                  <Clock className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold text-primary">Liturgia de Hoje</h2>
                </div>
              </div>

              <LiturgiaCard liturgia={liturgiaHoje} isToday={true} />

              {/* Leituras Completas - Tabs */}
              {liturgiaHoje.leituras && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Book className="w-5 h-5 text-primary" />
                      Leituras Completas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="primeira" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-6 bg-muted/50 p-1 rounded-lg">
                        {liturgiaHoje.leituras.primeiraLeitura && (
                          <TabsTrigger value="primeira" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">1ª Leitura</TabsTrigger>
                        )}
                        {liturgiaHoje.leituras.salmo && (
                          <TabsTrigger value="salmo" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Salmo</TabsTrigger>
                        )}
                        {liturgiaHoje.leituras.segundaLeitura && (
                          <TabsTrigger value="segunda" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">2ª Leitura</TabsTrigger>
                        )}
                        {liturgiaHoje.leituras.evangelho && (
                          <TabsTrigger value="evangelho" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Evangelho</TabsTrigger>
                        )}
                      </TabsList>

                      {/* 1ª Leitura */}
                      {liturgiaHoje.leituras.primeiraLeitura && (
                        <TabsContent value="primeira" className="space-y-4">
                          {liturgiaHoje.leituras.primeiraLeitura.map((leitura, idx) => (
                            <div key={idx} className="space-y-3">
                              <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                                <Book className="w-5 h-5 text-muted-foreground mt-0.5" />
                                <div>
                                  <Badge variant="outline" className="mb-2">{leitura.referencia}</Badge>
                                  <p className="text-sm text-foreground">{leitura.titulo}</p>
                                </div>
                              </div>
                              <div className="prose prose-sm max-w-none">
                                <p className="text-muted-foreground leading-7 whitespace-pre-line">
                                  {cleanLeituraText(leitura.texto)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </TabsContent>
                      )}

                      {/* Salmo */}
                      {liturgiaHoje.leituras.salmo && (
                        <TabsContent value="salmo" className="space-y-4">
                          {liturgiaHoje.leituras.salmo.map((salmo, idx) => (
                            <div key={idx} className="space-y-3">
                              <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-rose-50 to-amber-100/50 rounded-lg border border-rose-200">
                                <Heart className="w-5 h-5 text-purple-600 mt-0.5" />
                                <div>
                                  <Badge variant="outline" className="mb-2 border-purple-300">{salmo.referencia}</Badge>
                                  <p className="text-sm text-purple-700 italic">Refrão: {salmo.refrao}</p>
                                </div>
                              </div>
                              <div className="prose prose-sm max-w-none">
                                <p className="text-muted-foreground leading-7 whitespace-pre-line">
                                  {cleanLeituraText(salmo.texto)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </TabsContent>
                      )}

                      {/* 2ª Leitura */}
                      {liturgiaHoje.leituras.segundaLeitura && (
                        <TabsContent value="segunda" className="space-y-4">
                          {liturgiaHoje.leituras.segundaLeitura.map((leitura, idx) => (
                            <div key={idx} className="space-y-3">
                              <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                                <Book className="w-5 h-5 text-muted-foreground mt-0.5" />
                                <div>
                                  <Badge variant="outline" className="mb-2">{leitura.referencia}</Badge>
                                  <p className="text-sm text-foreground">{leitura.titulo}</p>
                                </div>
                              </div>
                              <div className="prose prose-sm max-w-none">
                                <p className="text-muted-foreground leading-7 whitespace-pre-line">
                                  {cleanLeituraText(leitura.texto)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </TabsContent>
                      )}

                      {/* Evangelho */}
                      {liturgiaHoje.leituras.evangelho && (
                        <TabsContent value="evangelho" className="space-y-4">
                          {liturgiaHoje.leituras.evangelho.map((evangelho, idx) => (
                            <div key={idx} className="space-y-3">
                              <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-lg border-2 border-amber-300">
                                <Book className="w-5 h-5 text-amber-700 mt-0.5" />
                                <div>
                                  <Badge className="mb-2 bg-amber-100 text-amber-900 border-amber-300">{evangelho.referencia}</Badge>
                                  <p className="text-sm text-foreground">{evangelho.titulo}</p>
                                </div>
                              </div>
                              <div className="prose prose-sm max-w-none">
                                <p className="text-muted-foreground leading-7 whitespace-pre-line">
                                  {cleanLeituraText(evangelho.texto)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </TabsContent>
                      )}
                    </Tabs>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Próximos 7 Dias - Grid de Calendário */}
          {liturgiasProximas.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-xl font-bold">Próximos 7 Dias</h2>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {liturgiasProximas.map((liturgia, index) => {
                  const corClass = getCorClass(liturgia.cor);
                  const [dia, mes] = (liturgia.data || '').split('/').slice(0, 2);
                  
                  return (
                    <Card key={index} className={`group hover:shadow-lg transition-all border-t-4 ${corClass.replace('border-l-4', 'border-t-4')}`}>
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-foreground mb-1">{dia}</div>
                        <div className="text-xs text-muted-foreground uppercase mb-3">
                          {mes && ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][parseInt(mes) - 1]}
                        </div>
                        <Separator className="my-2" />
                        <div className="space-y-2 mt-3">
                          <p className="text-xs font-medium text-foreground line-clamp-2 min-h-[2rem]">{liturgia.liturgia}</p>
                          {liturgia.cor && (
                            <Badge variant="outline" className="text-[10px] w-full justify-center">
                              {liturgia.cor}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer Info */}
      <section className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Dados litúrgicos fornecidos pela{' '}
            <a 
              href="https://liturgia.up.railway.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              API de Liturgia Diária
              <ChevronRight className="w-3 h-3" />
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
