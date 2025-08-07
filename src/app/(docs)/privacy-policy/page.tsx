"use client";

import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Shield, User, Database, Cookie, Mail, Eye, Trash2, FileText } from "lucide-react";

export default function PrivacyPolicyPage() {
  const [active, setActive] = useState<string | undefined>(undefined);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Shield className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold border-b-2 border-sky-500 pb-2">Política de Privacidade</h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
          A sua privacidade é importante para nós. Esta política explica como recolhemos, utilizamos e protegemos os seus dados pessoais no Cantólico.
        </p>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
        <p className="text-sm text-blue-800">
          <strong>Resumo:</strong> Recolhemos apenas os dados essenciais para o funcionamento do site (nome, email). 
          Os seus dados nunca são vendidos ou partilhados com terceiros para fins comerciais.
        </p>
      </div>

      <Accordion type="single" collapsible className="space-y-4" value={active} onValueChange={setActive}>
        <AccordionItem value="1">
          <AccordionTrigger className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            1. Dados Pessoais Recolhidos
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p>No Cantólico, recolhemos apenas os dados estritamente necessários para o funcionamento do serviço:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Nome:</strong> Para identificação no site e autoria de submissões</li>
              <li><strong>Email:</strong> Para autenticação e comunicações essenciais</li>
              <li><strong>Palavra-passe:</strong> Armazenada de forma encriptada (hash) para segurança</li>
              <li><strong>Imagem de perfil:</strong> Opcional, para personalização do perfil</li>
              <li><strong>Biografia:</strong> Opcional, para descrição pessoal no perfil</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> Não recolhemos dados sensíveis como número de telefone, morada, ou informações financeiras.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="2">
          <AccordionTrigger className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            2. Como Utilizamos os Seus Dados
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p>Os seus dados pessoais são utilizados exclusivamente para:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Autenticação:</strong> Permitir o acesso seguro à sua conta</li>
              <li><strong>Identificação:</strong> Mostrar o seu nome nas submissões e perfil público</li>
              <li><strong>Comunicação:</strong> Notificações sobre o estado das suas submissões</li>
              <li><strong>Funcionalidades:</strong> Playlists pessoais, sistema de estrelas, histórico</li>
              <li><strong>Moderação:</strong> Contactar em caso de violação dos termos de utilização</li>
            </ul>
            <div className="bg-green-50 border border-green-200 p-3 rounded">
              <p className="text-sm text-green-800">
                <strong>Garantia:</strong> Os seus dados nunca são utilizados para publicidade, marketing não solicitado ou vendidos a terceiros.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="3">
          <AccordionTrigger className="flex items-center gap-2">
            <User className="h-4 w-4" />
            3. Visibilidade dos Dados
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p>Transparência sobre que informações são visíveis para outros utilizadores:</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 p-3 rounded">
                <h4 className="font-semibold text-green-800 mb-2">Visível Publicamente:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Nome completo</li>
                  <li>• Email (para contacto)</li>
                  <li>• Imagem de perfil</li>
                  <li>• Biografia</li>
                  <li>• Submissões públicas</li>
                  <li>• Playlists públicas</li>
                </ul>
              </div>
              <div className="bg-red-50 border border-red-200 p-3 rounded">
                <h4 className="font-semibold text-red-800 mb-2">Sempre Privado:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Palavra-passe</li>
                  <li>• Playlists privadas</li>
                  <li>• Histórico de navegação</li>
                  <li>• Dados de sessão</li>
                  <li>• Endereço IP</li>
                  <li>• Preferências pessoais</li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="4">
          <AccordionTrigger className="flex items-center gap-2">
            <Cookie className="h-4 w-4" />
            4. Cookies e Tecnologias de Rastreamento
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p>Utilizamos cookies e tecnologias similares para melhorar a sua experiência:</p>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold">Cookies Essenciais:</h4>
                <ul className="list-disc list-inside ml-4 text-sm">
                  <li>Sessão de autenticação (manter login ativo)</li>
                  <li>Preferências de interface (tema, idioma)</li>
                  <li>Dados temporários de formulários</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold">Dados de Analytics:</h4>
                <ul className="list-disc list-inside ml-4 text-sm">
                  <li>Páginas visitadas (para melhorar o site)</li>
                  <li>Tempo de permanência</li>
                  <li>Funcionalidades mais utilizadas</li>
                </ul>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> Pode desativar cookies no seu navegador, mas algumas funcionalidades podem ficar limitadas.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="5">
          <AccordionTrigger className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            5. Segurança e Proteção de Dados
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p>Implementamos várias medidas de segurança para proteger os seus dados:</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Medidas Técnicas:</h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Encriptação de palavras-passe (bcrypt)</li>
                  <li>Conexões HTTPS (SSL/TLS)</li>
                  <li>Base de dados segura e encriptada</li>
                  <li>Backup automático e regular</li>
                  <li>Monitorização de segurança</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Medidas Organizacionais:</h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Acesso limitado aos dados</li>
                  <li>Formação em proteção de dados</li>
                  <li>Políticas internas de segurança</li>
                  <li>Revisões regulares de segurança</li>
                  <li>Plano de resposta a incidentes</li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="6">
          <AccordionTrigger className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            6. Os Seus Direitos (RGPD)
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p>De acordo com o Regulamento Geral sobre a Proteção de Dados (RGPD), tem os seguintes direitos:</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Eye className="h-4 w-4 mt-0.5 text-blue-600" />
                  <div>
                    <strong className="text-sm">Direito de Acesso:</strong>
                    <p className="text-xs text-muted-foreground">Consultar que dados temos sobre si</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-0.5 text-blue-600" />
                  <div>
                    <strong className="text-sm">Direito de Retificação:</strong>
                    <p className="text-xs text-muted-foreground">Corrigir dados incorretos ou incompletos</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Trash2 className="h-4 w-4 mt-0.5 text-blue-600" />
                  <div>
                    <strong className="text-sm">Direito ao Apagamento:</strong>
                    <p className="text-xs text-muted-foreground">Solicitar a eliminação dos seus dados</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 mt-0.5 text-blue-600" />
                  <div>
                    <strong className="text-sm">Direito de Limitação:</strong>
                    <p className="text-xs text-muted-foreground">Restringir o processamento</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Database className="h-4 w-4 mt-0.5 text-blue-600" />
                  <div>
                    <strong className="text-sm">Direito de Portabilidade:</strong>
                    <p className="text-xs text-muted-foreground">Receber os seus dados em formato estruturado</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 text-blue-600" />
                  <div>
                    <strong className="text-sm">Direito de Oposição:</strong>
                    <p className="text-xs text-muted-foreground">Opor-se ao processamento dos dados</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 p-3 rounded">
              <p className="text-sm text-blue-800">
                <strong>Como exercer os seus direitos:</strong> Contacte-nos através do email 
                <a href="mailto:cantolico@cantolico.pt" className="font-semibold hover:underline"> cantolico@cantolico.pt</a> ou 
                através do seu perfil no site. Responderemos no prazo de 30 dias.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="7">
          <AccordionTrigger className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            7. Retenção e Eliminação de Dados
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p>Mantemos os seus dados apenas pelo tempo necessário:</p>
            <div className="space-y-3">
              <div className="border border-gray-200 p-3 rounded">
                <h4 className="font-semibold">Conta Ativa:</h4>
                <p className="text-sm">Dados mantidos enquanto a conta estiver ativa e for utilizada regularmente.</p>
              </div>
              <div className="border border-gray-200 p-3 rounded">
                <h4 className="font-semibold">Conta Inativa:</h4>
                <p className="text-sm">Após 24 meses de inatividade, enviamos aviso. Sem resposta em 30 dias, a conta é eliminada.</p>
              </div>
              <div className="border border-gray-200 p-3 rounded">
                <h4 className="font-semibold">Eliminação Solicitada:</h4>
                <p className="text-sm">Dados pessoais eliminados em 30 dias. Submissões públicas podem ser mantidas anonimizadas.</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="8">
          <AccordionTrigger className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            8. Contacto e Questões
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p>Para questões sobre privacidade, proteção de dados ou exercício dos seus direitos:</p>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded space-y-2">
              <div>
                <strong>Email:</strong> 
                <a href="mailto:cantolico@cantolico.pt" className="text-blue-600 hover:underline ml-1">cantolico@cantolico.pt</a>
              </div>
              <div>
                <strong>Responsável:</strong> Equipa Cantólico
              </div>
              <div>
                <strong>Tempo de resposta:</strong> Máximo 30 dias úteis
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Tem também o direito de apresentar queixa à Comissão Nacional de Proteção de Dados (CNPD) 
              se considerar que os seus direitos não estão a ser respeitados.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="9">
          <AccordionTrigger className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            9. Alterações a Esta Política
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p>Esta política de privacidade pode ser atualizada periodicamente para refletir:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Alterações na legislação aplicável</li>
              <li>Novas funcionalidades do site</li>
              <li>Melhorias nos processos de proteção de dados</li>
              <li>Feedback dos utilizadores</li>
            </ul>
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
              <p className="text-sm text-yellow-800">
                <strong>Notificação de alterações:</strong> Será notificado por email sobre alterações significativas 
                com 30 dias de antecedência. Alterações menores serão publicadas nesta página com data atualizada.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator />

      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 p-4 rounded">
          <h3 className="font-semibold text-green-800 mb-2">Compromisso de Transparência</h3>
          <p className="text-sm text-green-700">
            O Cantólico compromete-se a ser transparente sobre como os seus dados são tratados. 
            Esta política é revista regularmente e estamos sempre disponíveis para esclarecer qualquer dúvida.
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          <strong>Política de Privacidade do Cantólico</strong><br />
          Versão 1.0 - Atualizada em 07/08/2025<br />
          Esta política está em conformidade com o RGPD (Regulamento (UE) 2016/679) e a legislação portuguesa aplicável.
        </p>
      </div>
    </div>
  );
}
