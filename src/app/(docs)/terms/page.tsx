"use client";

import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { FileText, User, Music, Shield, Scale, AlertTriangle, RefreshCw, MapPin, Calendar, ArrowRight } from "lucide-react";

export default function TermsPage() {
  const [active, setActive] = useState<string | undefined>(undefined);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full px-4 py-2 mb-6">
            <FileText className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-600 font-medium">Termos e Condições</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            Termos de Utilização
          </h1>
          
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Ao utilizar o Cantólico, está a concordar com os presentes termos de utilização. 
            Leia com atenção para compreender os seus direitos e responsabilidades.
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-4xl mx-auto px-6 pb-24">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gray-900 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Importante</h2>
                <p className="text-sm text-gray-600">A utilização deste website implica a aceitação plena e sem reservas destes termos.</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <Accordion type="single" collapsible className="space-y-6" value={active} onValueChange={setActive}>
              <AccordionItem value="1" className="border rounded-lg">
                <AccordionTrigger className="flex items-center gap-3 px-6 py-4 hover:no-underline hover:bg-gray-50/50 rounded-t-lg">
                  <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Shield className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">1. Objeto e Titularidade</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 space-y-4">
                  <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Music className="h-4 w-4" />
                      Sobre o Cantólico
                    </h4>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      O Cantólico é uma plataforma digital católica dedicada à preservação, partilha e descoberta de cânticos litúrgicos. 
                      O nosso objetivo é servir a comunidade católica global com um cancioneiro digital acessível e abrangente.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-900">Proprietário:</span>
                        <span className="text-gray-600 ml-2">Cantólico!</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Natureza do Serviço:</span>
                        <span className="text-gray-600 ml-2">Cancioneiro digital católico gratuito</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Público-Alvo:</span>
                        <span className="text-gray-600 ml-2">Comunidade católica, músicos, liturgistas e fiéis</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 italic">
                      A utilização do site implica a aceitação plena e sem reservas dos presentes termos de utilização.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="2" className="border rounded-lg">
                <AccordionTrigger className="flex items-center gap-3 px-6 py-4 hover:no-underline hover:bg-gray-50/50 rounded-t-lg">
                  <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">2. Acesso e Registo de Utilizadores</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3">Acesso Livre:</h4>
                      <ul className="text-sm text-gray-700 space-y-2">
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          Consulta do cancioneiro
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          Pesquisa de músicas
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          Visualização de perfis públicos
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          Navegação geral do site
                        </li>
                      </ul>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3">Requer Registo:</h4>
                      <ul className="text-sm text-gray-700 space-y-2">
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          Submissão de músicas
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          Sistema de estrelas (likes)
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          Criação de playlists
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          Comentários e interações
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="border border-gray-200 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Compromissos do Utilizador:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                      <div className="flex items-start gap-2">
                        <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Fornecer informação verdadeira e atualizada no registo</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Manter a confidencialidade da palavra-passe</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Notificar imediatamente qualquer uso não autorizado da conta</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Respeitar os direitos de autor e propriedade intelectual</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Utilizar o serviço de forma responsável e ética</span>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Outros acordeões simplificados */}
              <AccordionItem value="3" className="border rounded-lg">
                <AccordionTrigger className="flex items-center gap-3 px-6 py-4 hover:no-underline hover:bg-gray-50/50 rounded-t-lg">
                  <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Music className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">3. Conteúdo Submetido pelos Utilizadores</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 space-y-4">
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Responsabilidade do Utilizador
                    </h4>
                    <p className="text-gray-700 text-sm">
                      Todo o conteúdo submetido (letras, acordes, PDFs, áudio, etc.) é da exclusiva responsabilidade do utilizador. 
                      Deve garantir que possui os direitos necessários para partilhar o conteúdo.
                    </p>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Tipos de Conteúdo Aceite:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Cânticos católicos tradicionais e contemporâneos</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Letras com cifras e acordes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Partituras em formato PDF</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Gravações áudio (quando autorizado)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="4" className="border rounded-lg">
                <AccordionTrigger className="flex items-center gap-3 px-6 py-4 hover:no-underline hover:bg-gray-50/50 rounded-t-lg">
                  <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">4. Conteúdo Proibido e Sanções</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 space-y-4">
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Conteúdo Estritamente Proibido:</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-2 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Conteúdo não católico ou anticristão</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Material com direitos de autor protegidos</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Conteúdo ofensivo ou inadequado</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Spam ou publicidade não autorizada</span>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Material pornográfico ou violento</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Informações falsas ou enganosas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Vírus ou código malicioso</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Violação da privacidade de terceiros</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="5" className="border rounded-lg">
                <AccordionTrigger className="flex items-center gap-3 px-6 py-4 hover:no-underline hover:bg-gray-50/50 rounded-t-lg">
                  <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Shield className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">5. Limitações de Responsabilidade</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 space-y-4">
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">O Cantólico NÃO se responsabiliza por:</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-2 text-sm text-gray-700">
                        <div className="flex items-start gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span>Falhas técnicas ou indisponibilidade do serviço</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span>Perda de dados por motivos técnicos</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span>Conteúdos submetidos por terceiros</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span>Violações de direitos de autor por utilizadores</span>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-gray-700">
                        <div className="flex items-start gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span>Danos diretos ou indiretos pelo uso do site</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span>Precisão absoluta das informações</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span>Comportamentos inadequados de utilizadores</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span>Links externos ou conteúdo de terceiros</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="6" className="border rounded-lg">
                <AccordionTrigger className="flex items-center gap-3 px-6 py-4 hover:no-underline hover:bg-gray-50/50 rounded-t-lg">
                  <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">6. Contacto e Suporte</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 space-y-4">
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Para questões sobre estes termos ou o serviço:</h4>
                    <div className="space-y-2 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Email Principal:</span>
                        <a href="mailto:cantolico@cantolico.pt" className="text-gray-900 hover:underline">cantolico@cantolico.pt</a>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Suporte Técnico:</span>
                        <a href="mailto:miguel@cantolico.pt" className="text-gray-900 hover:underline">miguel@cantolico.pt</a>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Tempo de Resposta:</span>
                        <span>Até 48 horas úteis</span>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* Footer Section */}
        <div className="mt-16 space-y-6">
          <Separator />
          
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">Missão do Cantólico</h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                O Cantólico tem como missão servir a comunidade católica global, preservando e partilhando 
                o rico património musical da Igreja. Estes termos existem para proteger tanto os utilizadores 
                quanto a integridade da plataforma, garantindo um ambiente seguro e respeitoso para todos.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
            <h3 className="font-semibold text-gray-900 mb-2">Obrigado por fazer parte da nossa comunidade!</h3>
            <p className="text-sm text-gray-600 mb-4">
              Juntos, estamos a construir o maior cancioneiro católico digital do mundo. 
              A sua participação respeitosa e construtiva é fundamental para este projeto.
            </p>
            <Button asChild className="bg-gray-900 hover:bg-gray-800">
              <a href="/musics">
                Explorar Cancioneiro
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>

          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">
              <strong>Termos e Condições de Utilização do Cantólico</strong>
            </p>
            <p className="text-xs text-gray-400">
              Versão 2.0 - Atualizada em 07/08/2025<br />
              Este documento substitui todas as versões anteriores e é efetivo a partir da data indicada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}