"use client";

import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Shield, User, Database, Cookie, Mail, Eye, Trash2, FileText, ArrowRight } from "lucide-react";

export default function PrivacyPolicyPage() {
  const [active, setActive] = useState<string | undefined>(undefined);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full px-4 py-2 mb-6">
            <Shield className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-600 font-medium">Política de Privacidade</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            Política de Privacidade
          </h1>
          
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            A sua privacidade é importante para nós. Esta política explica como recolhemos, utilizamos e protegemos os seus dados pessoais no Cantólico.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Button asChild className="bg-gray-900 hover:bg-gray-800">
              <a href="/musics">
                Explorar Cancioneiro
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
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
                <h2 className="text-xl font-semibold text-gray-900">Resumo</h2>
                <p className="text-sm text-gray-600">Recolhemos apenas os dados essenciais para o funcionamento do site. Os seus dados nunca são vendidos ou partilhados com terceiros.</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <Accordion type="single" collapsible className="space-y-6" value={active} onValueChange={setActive}>
              <AccordionItem value="1" className="border rounded-lg">
                <AccordionTrigger className="flex items-center gap-3 px-6 py-4 hover:no-underline hover:bg-gray-50/50 rounded-t-lg">
                  <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Database className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">1. Dados Pessoais Recolhidos</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 space-y-4">
                  <p className="text-gray-700">No Cantólico, recolhemos apenas os dados estritamente necessários para o funcionamento do serviço:</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="h-2 w-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="font-medium text-gray-900">Nome:</span>
                          <span className="text-gray-600 ml-2">Para identificação no site e autoria de submissões</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="h-2 w-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="font-medium text-gray-900">Email:</span>
                          <span className="text-gray-600 ml-2">Para autenticação e comunicações essenciais</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="h-2 w-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="font-medium text-gray-900">Palavra-passe:</span>
                          <span className="text-gray-600 ml-2">Armazenada de forma encriptada (hash) para segurança</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="h-2 w-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="font-medium text-gray-900">Imagem de perfil:</span>
                          <span className="text-gray-600 ml-2">Opcional, para personalização do perfil</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="h-2 w-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="font-medium text-gray-900">Biografia:</span>
                          <span className="text-gray-600 ml-2">Opcional, para descrição pessoal no perfil</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 italic">
                      <strong>Nota:</strong> Não recolhemos dados sensíveis como número de telefone, morada, ou informações financeiras.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="2" className="border rounded-lg">
                <AccordionTrigger className="flex items-center gap-3 px-6 py-4 hover:no-underline hover:bg-gray-50/50 rounded-t-lg">
                  <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Eye className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">2. Como Utilizamos os Seus Dados</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 space-y-4">
                  <p className="text-gray-700">Os seus dados pessoais são utilizados exclusivamente para:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                    <div className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span><strong>Autenticação:</strong> Permitir o acesso seguro à sua conta</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span><strong>Identificação:</strong> Mostrar o seu nome nas submissões e perfil público</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span><strong>Comunicação:</strong> Notificações sobre o estado das suas submissões</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span><strong>Funcionalidades:</strong> Playlists pessoais, sistema de estrelas, histórico</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span><strong>Moderação:</strong> Contactar em caso de violação dos termos de utilização</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                    <p className="text-sm text-gray-800">
                      <strong>Garantia:</strong> Os seus dados nunca são utilizados para publicidade, marketing não solicitado ou vendidos a terceiros.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="3" className="border rounded-lg">
                <AccordionTrigger className="flex items-center gap-3 px-6 py-4 hover:no-underline hover:bg-gray-50/50 rounded-t-lg">
                  <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">3. Visibilidade dos Dados</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 space-y-4">
                  <p className="text-gray-700">Transparência sobre que informações são visíveis para outros utilizadores:</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3">Visível Publicamente:</h4>
                      <div className="space-y-2 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Nome completo</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Email (para contacto)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Imagem de perfil</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Biografia</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Submissões públicas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Playlists públicas</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3">Sempre Privado:</h4>
                      <div className="space-y-2 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Palavra-passe</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Playlists privadas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Histórico de navegação</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Dados de sessão</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Endereço IP</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Preferências pessoais</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Outros acordeões simplificados */}
              <AccordionItem value="4" className="border rounded-lg">
                <AccordionTrigger className="flex items-center gap-3 px-6 py-4 hover:no-underline hover:bg-gray-50/50 rounded-t-lg">
                  <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Cookie className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">4. Cookies e Tecnologias de Rastreamento</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 space-y-4">
                  <p className="text-gray-700">Utilizamos cookies e tecnologias similares para melhorar a sua experiência:</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">Cookies Essenciais:</h4>
                      <div className="space-y-1 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Sessão de autenticação (manter login ativo)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Preferências de interface (tema, idioma)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Dados temporários de formulários</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">Dados de Analytics:</h4>
                      <div className="space-y-1 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Páginas visitadas (para melhorar o site)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Tempo de permanência</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                          <span>Funcionalidades mais utilizadas</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 italic">
                    <strong>Nota:</strong> Pode desativar cookies no seu navegador, mas algumas funcionalidades podem ficar limitadas.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="5" className="border rounded-lg">
                <AccordionTrigger className="flex items-center gap-3 px-6 py-4 hover:no-underline hover:bg-gray-50/50 rounded-t-lg">
                  <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Mail className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">5. Contacto e Questões</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 space-y-4">
                  <p className="text-gray-700">Para questões sobre privacidade, proteção de dados ou exercício dos seus direitos:</p>
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-900">Email:</span>
                      <a href="mailto:cantolico@cantolico.pt" className="text-gray-900 hover:underline">cantolico@cantolico.pt</a>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-900">Responsável:</span>
                      <span className="text-gray-600">Equipa Cantólico</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-900">Tempo de resposta:</span>
                      <span className="text-gray-600">Máximo 30 dias úteis</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    Tem também o direito de apresentar queixa à Comissão Nacional de Proteção de Dados (CNPD) 
                    se considerar que os seus direitos não estão a ser respeitados.
                  </p>
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
              <h3 className="text-xl font-semibold text-gray-900">Compromisso de Transparência</h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                O Cantólico compromete-se a ser transparente sobre como os seus dados são tratados. 
                Esta política é revista regularmente e estamos sempre disponíveis para esclarecer qualquer dúvida.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
            <h3 className="font-semibold text-gray-900 mb-2">Protegemos a sua privacidade!</h3>
            <p className="text-sm text-gray-600 mb-4">
              Os seus dados estão seguros connosco. Utilizamos as melhores práticas de segurança e 
              cumprimos rigorosamente o RGPD e a legislação portuguesa aplicável.
            </p>
            <Button asChild className="bg-gray-900 hover:bg-gray-800">
              <a href="/terms">
                Ver Termos e Condições
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>

          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">
              <strong>Política de Privacidade do Cantólico</strong>
            </p>
            <p className="text-xs text-gray-400">
              Versão 1.0 - Atualizada em 07/08/2025<br />
              Esta política está em conformidade com o RGPD (Regulamento (UE) 2016/679) e a legislação portuguesa aplicável.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
