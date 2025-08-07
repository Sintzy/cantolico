"use client";

import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { FileText, User, Music, Shield, Scale, AlertTriangle, RefreshCw, MapPin, Calendar } from "lucide-react";

export default function TermsPage() {
  const [active, setActive] = useState<string | undefined>(undefined);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <FileText className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold border-b-2 border-sky-500 pb-2">Termos e Condições de Utilização</h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
          Ao utilizar o Cantólico, está a concordar com os presentes termos de utilização. 
          Leia com atenção para compreender os seus direitos e responsabilidades.
        </p>
      </div>

      <div className="bg-amber-50 border-l-4 border-amber-600 p-4 rounded">
        <p className="text-sm text-amber-800">
          <strong>Importante:</strong> A utilização deste website implica a aceitação plena e sem reservas destes termos. 
          Se não concordar, por favor não utilize o serviço.
        </p>
      </div>

      <Accordion type="single" collapsible className="space-y-4" value={active} onValueChange={setActive}>
        <AccordionItem value="1">
          <AccordionTrigger className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            1. Objeto e Titularidade
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded">
              <h4 className="font-semibold text-blue-800 mb-2">Sobre o Cantólico</h4>
              <p className="text-blue-700 text-sm">
                O Cantólico é uma plataforma digital católica dedicada à preservação, partilha e descoberta de cânticos litúrgicos. 
                O nosso objetivo é servir a comunidade católica global com um cancioneiro digital acessível e abrangente.
              </p>
            </div>
            <div className="space-y-2">
              <p><strong>Proprietário:</strong> Cantólico!</p>
              <p><strong>Natureza do Serviço:</strong> Cancioneiro digital católico gratuito</p>
              <p><strong>Público-Alvo:</strong> Comunidade católica, músicos, liturgistas e fiéis</p>
              <p className="text-sm text-muted-foreground">
                A utilização do site implica a aceitação plena e sem reservas dos presentes termos de utilização.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="2">
          <AccordionTrigger className="flex items-center gap-2">
            <User className="h-4 w-4" />
            2. Acesso e Registo de Utilizadores
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 p-3 rounded">
                <h4 className="font-semibold text-green-800 mb-2">Acesso Livre:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Consulta do cancioneiro</li>
                  <li>• Pesquisa de músicas</li>
                  <li>• Visualização de perfis públicos</li>
                  <li>• Navegação geral do site</li>
                </ul>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                <h4 className="font-semibold text-blue-800 mb-2">Requer Registo:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Submissão de músicas</li>
                  <li>• Sistema de estrelas (likes)</li>
                  <li>• Criação de playlists</li>
                  <li>• Comentários e interações</li>
                </ul>
              </div>
            </div>
            <div className="border border-gray-200 p-3 rounded">
              <h4 className="font-semibold mb-2">Compromissos do Utilizador:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Fornecer informação verdadeira e atualizada no registo</li>
                <li>Manter a confidencialidade da palavra-passe</li>
                <li>Notificar imediatamente qualquer uso não autorizado da conta</li>
                <li>Respeitar os direitos de autor e propriedade intelectual</li>
                <li>Utilizar o serviço de forma responsável e ética</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="3">
          <AccordionTrigger className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            3. Conteúdo Submetido pelos Utilizadores
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
              <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Responsabilidade do Utilizador</h4>
              <p className="text-yellow-700 text-sm">
                Todo o conteúdo submetido (letras, acordes, PDFs, áudio, etc.) é da exclusiva responsabilidade do utilizador. 
                Deve garantir que possui os direitos necessários para partilhar o conteúdo.
              </p>
            </div>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold">Tipos de Conteúdo Aceite:</h4>
                <ul className="list-disc list-inside ml-4 text-sm space-y-1">
                  <li>Cânticos católicos tradicionais e contemporâneos</li>
                  <li>Letras com cifras e acordes</li>
                  <li>Partituras em formato PDF</li>
                  <li>Gravações áudio (quando autorizado)</li>
                  <li>Links para vídeos oficiais (YouTube, etc.)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold">Moderação e Direitos do Site:</h4>
                <ul className="list-disc list-inside ml-4 text-sm space-y-1">
                  <li>Direito de moderar, editar ou remover submissões</li>
                  <li>Verificação da adequação do conteúdo à finalidade católica</li>
                  <li>Prevenção de violações de direitos de autor</li>
                  <li>Manutenção da qualidade e organização do cancioneiro</li>
                </ul>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <h4 className="font-semibold text-red-800 mb-1">Isenção de Responsabilidade Especial:</h4>
              <p className="text-red-700 text-sm">
                O Cantólico não se responsabiliza pela autoria de qualquer cântico na plataforma. 
                Os cânticos inseridos pelo utilizador "cantolico@cantolico.pt" (ID 0) são apenas para 
                fins de demonstração, organização ou preservação, não implicando validação de autoria ou direitos.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="4">
          <AccordionTrigger className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            4. Conteúdo Proibido e Sanções
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="bg-red-50 border border-red-200 p-4 rounded">
              <h4 className="font-semibold text-red-800 mb-2">Conteúdo Estritamente Proibido:</h4>
              <div className="grid md:grid-cols-2 gap-3">
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Conteúdo não católico ou anticristão</li>
                  <li>• Material com direitos de autor protegidos</li>
                  <li>• Conteúdo ofensivo ou inadequado</li>
                  <li>• Spam ou publicidade não autorizada</li>
                </ul>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Material pornográfico ou violento</li>
                  <li>• Informações falsas ou enganosas</li>
                  <li>• Vírus ou código malicioso</li>
                  <li>• Violação da privacidade de terceiros</li>
                </ul>
              </div>
            </div>

            <div className="border border-gray-200 p-3 rounded">
              <h4 className="font-semibold mb-2">Sanções Aplicáveis:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">AVISO</span>
                  <span>Primeira infração: notificação e pedido de correção</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">SUSPENSÃO</span>
                  <span>Infrações repetidas: suspensão temporária da conta</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">BANIMENTO</span>
                  <span>Infrações graves: exclusão permanente da plataforma</span>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="5">
          <AccordionTrigger className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            5. Limitações de Responsabilidade
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="bg-gray-50 border border-gray-200 p-4 rounded">
              <h4 className="font-semibold text-gray-800 mb-2">O Cantólico NÃO se responsabiliza por:</h4>
              <div className="grid md:grid-cols-2 gap-3">
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Falhas técnicas ou indisponibilidade do serviço</li>
                  <li>• Perda de dados por motivos técnicos</li>
                  <li>• Conteúdos submetidos por terceiros</li>
                  <li>• Violações de direitos de autor por utilizadores</li>
                </ul>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Danos diretos ou indiretos pelo uso do site</li>
                  <li>• Precisão absoluta das informações</li>
                  <li>• Comportamentos inadequados de utilizadores</li>
                  <li>• Links externos ou conteúdo de terceiros</li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded">
              <p className="text-sm text-blue-800">
                <strong>Reserva de Direitos:</strong> Reservamo-nos o direito de suspender, modificar ou terminar 
                qualquer funcionalidade do serviço sem aviso prévio, especialmente para manutenção, 
                segurança ou cumprimento legal.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="6">
          <AccordionTrigger className="flex items-center gap-2">
            <User className="h-4 w-4" />
            6. Privacidade e Proteção de Dados
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="bg-green-50 border border-green-200 p-4 rounded">
              <h4 className="font-semibold text-green-800 mb-2">Compromissos de Privacidade</h4>
              <p className="text-green-700 text-sm mb-3">
                Os dados pessoais recolhidos (nome, email, etc.) são tratados conforme o 
                Regulamento Geral sobre a Proteção de Dados (RGPD - Regulamento (UE) 2016/679).
              </p>
              <div className="space-y-2 text-sm text-green-700">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  <span>Direito à consulta, alteração ou remoção dos dados pessoais</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  <span>Email visível publicamente, mas protegido contra uso comercial</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  <span>Dados nunca vendidos ou partilhados sem consentimento</span>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              A política de privacidade completa está disponível na nossa 
              <a href="/privacy-policy" className="text-blue-600 hover:underline ml-1">Política de Privacidade</a>.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="7">
          <AccordionTrigger className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            7. Cookies e Tecnologias Web
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p>Utilizamos cookies e tecnologias similares para melhorar a experiência de utilização:</p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-blue-200 bg-blue-50 p-3 rounded">
                <h4 className="font-semibold text-blue-800 mb-2">Cookies Essenciais:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Manter sessão de login ativa</li>
                  <li>• Preferências de interface</li>
                  <li>• Funcionalidades do carrinho</li>
                  <li>• Segurança e prevenção de fraude</li>
                </ul>
              </div>
              <div className="border border-purple-200 bg-purple-50 p-3 rounded">
                <h4 className="font-semibold text-purple-800 mb-2">Cookies Analíticos:</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Estatísticas de utilização</li>
                  <li>• Melhoria da experiência</li>
                  <li>• Análise de performance</li>
                  <li>• Identificação de problemas</li>
                </ul>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
              <p className="text-sm text-yellow-800">
                <strong>Gestão de Cookies:</strong> Pode desativar cookies nas configurações do seu navegador, 
                mas algumas funcionalidades podem ficar limitadas ou indisponíveis.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="8">
          <AccordionTrigger className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            8. Alterações aos Termos
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="space-y-3">
              <p>Reservamo-nos o direito de atualizar estes termos para refletir:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                <li>Alterações na legislação aplicável</li>
                <li>Novas funcionalidades da plataforma</li>
                <li>Melhorias nos processos de segurança</li>
                <li>Feedback da comunidade de utilizadores</li>
                <li>Evolução das melhores práticas do setor</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded">
              <h4 className="font-semibold text-blue-800 mb-2">Como será notificado:</h4>
              <div className="space-y-2 text-sm text-blue-700">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  <span><strong>Alterações significativas:</strong> Email com 30 dias de antecedência</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  <span><strong>Alterações menores:</strong> Publicação nesta página com data atualizada</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  <span><strong>Alterações urgentes:</strong> Notificação imediata no site</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              <strong>Recomendação:</strong> Consulte periodicamente esta página para se manter informado 
              sobre quaisquer alterações aos termos de utilização.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="9">
          <AccordionTrigger className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            9. Lei Aplicável e Resolução de Conflitos
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-gray-200 p-3 rounded">
                <h4 className="font-semibold mb-2">Jurisdição:</h4>
                <ul className="text-sm space-y-1">
                  <li><strong>Lei aplicável:</strong> Legislação portuguesa</li>
                  <li><strong>Foro competente:</strong> Tribunais portugueses</li>
                  <li><strong>Conformidade:</strong> RGPD e normativa europeia</li>
                </ul>
              </div>
              <div className="border border-gray-200 p-3 rounded">
                <h4 className="font-semibold mb-2">Resolução de Conflitos:</h4>
                <ul className="text-sm space-y-1">
                  <li><strong>1º Passo:</strong> Contacto direto via email</li>
                  <li><strong>2º Passo:</strong> Mediação amigável</li>
                  <li><strong>3º Passo:</strong> Recurso aos tribunais</li>
                </ul>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 p-3 rounded">
              <p className="text-sm text-green-800">
                <strong>Compromisso de Diálogo:</strong> Encorajamos o contacto direto para resolver 
                qualquer questão ou conflito antes de recorrer a meios legais formais.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="10">
          <AccordionTrigger className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            10. Contacto e Suporte
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded">
              <h4 className="font-semibold text-blue-800 mb-3">Para questões sobre estes termos ou o serviço:</h4>
              <div className="space-y-2 text-sm text-blue-700">
                <div><strong>Email Principal:</strong> <a href="mailto:cantolico@cantolico.pt" className="hover:underline">cantolico@cantolico.pt</a></div>
                <div><strong>Suporte Técnico:</strong> <a href="mailto:miguel@cantolico.pt" className="hover:underline">miguel@cantolico.pt</a></div>
                <div><strong>Tempo de Resposta:</strong> Até 48 horas úteis</div>
                <div><strong>Idiomas:</strong> Português, Inglês</div>
              </div>
            </div>

            <div className="border border-gray-200 p-3 rounded">
              <h4 className="font-semibold mb-2">Tipos de Suporte Disponível:</h4>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <ul className="space-y-1">
                  <li>• Questões sobre termos e condições</li>
                  <li>• Problemas técnicos e bugs</li>
                  <li>• Dúvidas sobre funcionalidades</li>
                  <li>• Suporte para submissões</li>
                </ul>
                <ul className="space-y-1">
                  <li>• Questões de privacidade e dados</li>
                  <li>• Relatórios de conteúdo inadequado</li>
                  <li>• Sugestões e feedback</li>
                  <li>• Parcerias e colaborações</li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator />

      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded">
          <h3 className="font-semibold text-blue-800 mb-2">Missão do Cantólico</h3>
          <p className="text-sm text-blue-700">
            O Cantólico tem como missão servir a comunidade católica global, preservando e partilhando 
            o rico património musical da Igreja. Estes termos existem para proteger tanto os utilizadores 
            quanto a integridade da plataforma, garantindo um ambiente seguro e respeitoso para todos.
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 p-4 rounded text-center">
          <h3 className="font-semibold text-green-800 mb-2">Obrigado por fazer parte da nossa comunidade!</h3>
          <p className="text-sm text-green-700">
            Juntos, estamos a construir o maior cancioneiro católico digital do mundo. 
            A sua participação respeitosa e construtiva é fundamental para este projeto.
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          <strong>Termos e Condições de Utilização do Cantólico</strong><br />
          Versão 2.0 - Atualizada em 07/08/2025<br />
          Este documento substitui todas as versões anteriores e é efetivo a partir da data indicada.<br />
          É da responsabilidade do utilizador consultar regularmente esta página para se manter informado sobre quaisquer alterações.
        </p>
      </div>
    </div>
  );
}