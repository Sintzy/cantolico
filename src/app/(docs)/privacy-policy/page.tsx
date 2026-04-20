import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Política de Privacidade",
  description: "Como o Cantólico trata e protege os teus dados.",
  path: "/privacy-policy",
  type: "article",
});

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">
              Política de Privacidade
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              A sua privacidade é importante para nós. Esta política explica como recolhemos, utilizamos e protegemos
              os seus dados pessoais no Cantólico, em conformidade com o RGPD (Regulamento (UE) 2016/679)
              e a legislação portuguesa aplicável.
            </p>
          </CardHeader>
        </Card>

        <div className="space-y-6">
          {/* 1. Responsável pelo Tratamento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">1. Responsável pelo Tratamento de Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>
                O responsável pelo tratamento dos seus dados pessoais é o Cantólico, plataforma digital de cancioneiro católico.
              </p>
              <ul className="space-y-1 ml-4">
                <li className="list-disc"><strong>Designação:</strong> Cantólico</li>
                <li className="list-disc"><strong>Email de contacto:</strong>{" "}
                  <a href="mailto:miguel@cantolico.pt" className="text-primary underline">
                    miguel@cantolico.pt
                  </a>
                </li>
                <li className="list-disc"><strong>Âmbito:</strong> Plataforma digital, operada em Portugal</li>
              </ul>
            </CardContent>
          </Card>

          {/* 2. Dados Recolhidos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">2. Dados Pessoais Recolhidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                No Cantólico, recolhemos apenas os dados estritamente necessários para o funcionamento do serviço.
                A autenticação é gerida pelo Clerk (ver secção 5), pelo que os dados de login são processados por esse serviço.
              </p>
              <div>
                <h3 className="font-medium mb-2">Dados fornecidos diretamente por si:</h3>
                <ul className="space-y-1 ml-4">
                  <li className="list-disc"><strong>Nome:</strong> Para identificação no site e autoria de submissões</li>
                  <li className="list-disc"><strong>Email:</strong> Para autenticação, comunicações e notificações</li>
                  <li className="list-disc"><strong>Imagem de perfil:</strong> Opcional, para personalização do perfil público</li>
                  <li className="list-disc"><strong>Biografia:</strong> Opcional, visível no perfil público</li>
                  <li className="list-disc"><strong>Conteúdo submetido:</strong> Músicas, letras, cifras, PDFs e ficheiros áudio</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">Dados recolhidos automaticamente:</h3>
                <ul className="space-y-1 ml-4">
                  <li className="list-disc"><strong>Dados de sessão:</strong> Geridos pelo Clerk para manter o login ativo</li>
                  <li className="list-disc"><strong>Analytics anónimos:</strong> Páginas visitadas e funcionalidades utilizadas (via Vercel Analytics, sem dados pessoais identificáveis)</li>
                  <li className="list-disc"><strong>Endereço IP:</strong> Registado pelos servidores Vercel para fins de segurança e performance</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground italic">
                Não recolhemos dados sensíveis como número de telefone, morada, dados financeiros ou documentos de identificação.
              </p>
            </CardContent>
          </Card>

          {/* 3. Como Utilizamos os Dados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">3. Como Utilizamos os Seus Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Os seus dados pessoais são utilizados exclusivamente para as seguintes finalidades:</p>
              <ul className="space-y-2 ml-4">
                <li className="list-disc"><strong>Autenticação:</strong> Permitir o acesso seguro à sua conta através do Clerk</li>
                <li className="list-disc"><strong>Identificação:</strong> Mostrar o seu nome nas submissões e no perfil público</li>
                <li className="list-disc"><strong>Comunicação:</strong> Notificações sobre o estado das suas submissões e atualizações importantes do serviço</li>
                <li className="list-disc"><strong>Funcionalidades:</strong> Playlists pessoais, favoritos, histórico e planeamento de missas</li>
                <li className="list-disc"><strong>Moderação:</strong> Contactar em caso de violação dos termos de utilização</li>
                <li className="list-disc"><strong>Melhoria do serviço:</strong> Analytics anónimos para perceber que funcionalidades são mais utilizadas</li>
              </ul>
              <p className="text-sm text-muted-foreground italic">
                Os seus dados nunca são vendidos a terceiros nem utilizados para publicidade personalizada neste momento.
                Se isso vier a mudar, será comunicado previamente (ver secção 6).
              </p>
            </CardContent>
          </Card>

          {/* 4. Visibilidade dos Dados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">4. Visibilidade dos Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Transparência sobre que informações são visíveis para outros utilizadores:</p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-2">Visível publicamente:</h3>
                  <ul className="space-y-1 ml-4">
                    <li className="list-disc">Nome</li>
                    <li className="list-disc">Imagem de perfil (se definida)</li>
                    <li className="list-disc">Biografia (se definida)</li>
                    <li className="list-disc">Submissões públicas e autoria das mesmas</li>
                    <li className="list-disc">Playlists marcadas como públicas</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Sempre privado:</h3>
                  <ul className="space-y-1 ml-4">
                    <li className="list-disc">Email</li>
                    <li className="list-disc">Palavra-passe (encriptada e gerida pelo Clerk)</li>
                    <li className="list-disc">Playlists privadas</li>
                    <li className="list-disc">Histórico de navegação</li>
                    <li className="list-disc">Dados de sessão e tokens de autenticação</li>
                    <li className="list-disc">Endereço IP</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. Terceiros e Sub-processadores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">5. Serviços de Terceiros e Sub-processadores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Para funcionar, o Cantólico utiliza serviços de terceiros que podem processar alguns dos seus dados.
                Apenas partilhamos os dados estritamente necessários para cada serviço.
              </p>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-1">Clerk <span className="text-sm text-muted-foreground">(clerk.com)</span></h3>
                  <p className="text-sm mb-1">Serviço de autenticação e gestão de contas. Gere o registo, login, sessões e tokens de autenticação.</p>
                  <p className="text-sm text-muted-foreground">Dados processados: email, nome, palavra-passe (encriptada), dados de sessão. Consulte a <a href="https://clerk.com/privacy" className="text-primary underline" target="_blank" rel="noopener noreferrer">Política de Privacidade do Clerk</a>.</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-1">Supabase <span className="text-sm text-muted-foreground">(supabase.com)</span></h3>
                  <p className="text-sm mb-1">Base de dados e armazenamento de ficheiros. Onde são guardados os conteúdos do Cantólico (músicas, PDFs, áudio, playlists, etc.).</p>
                  <p className="text-sm text-muted-foreground">Dados processados: conteúdo submetido, preferências, playlists e atividade na plataforma.</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-1">Vercel <span className="text-sm text-muted-foreground">(vercel.com)</span></h3>
                  <p className="text-sm mb-1">Plataforma de alojamento do site. Trata os pedidos HTTP e inclui analytics anónimos de visitas.</p>
                  <p className="text-sm text-muted-foreground">Dados processados: endereço IP (para routing e segurança), páginas visitadas de forma anónima.</p>
                </div>
                <div className="border rounded-lg p-4 border-dashed">
                  <h3 className="font-medium mb-1">Google AdSense <span className="text-sm text-muted-foreground">(futuro — não ativo de momento)</span></h3>
                  <p className="text-sm mb-1">Se publicidade for introduzida no futuro, poderá ser utilizado o Google AdSense, que utiliza cookies para personalização de anúncios.</p>
                  <p className="text-sm text-muted-foreground">Esta secção será atualizada e os utilizadores notificados previamente caso tal aconteça.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6. Cookies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">6. Cookies e Tecnologias de Rastreamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>O Cantólico utiliza cookies e tecnologias similares para o funcionamento do serviço:</p>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Cookies essenciais (necessários para o funcionamento):</h3>
                  <ul className="space-y-1 ml-4">
                    <li className="list-disc"><strong>Sessão de autenticação (Clerk):</strong> Cookies gerados pelo Clerk para manter o utilizador autenticado entre páginas e sessões</li>
                    <li className="list-disc"><strong>Preferências de interface:</strong> Tema claro/escuro e outras preferências locais</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Analytics anónimos:</h3>
                  <ul className="space-y-1 ml-4">
                    <li className="list-disc">Vercel Analytics recolhe dados anónimos de navegação (páginas visitadas, tempo de resposta) sem identificar o utilizador pessoalmente</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Cookies de publicidade (não ativos de momento):</h3>
                  <ul className="space-y-1 ml-4">
                    <li className="list-disc">Caso publicidade seja introduzida via Google AdSense, serão utilizados cookies do Google para personalização de anúncios. Será solicitado consentimento explícito nessa altura.</li>
                  </ul>
                </div>
              </div>
              <p className="text-sm text-muted-foreground italic">
                Pode gerir ou desativar cookies nas definições do seu navegador. A desativação dos cookies essenciais poderá impedir o correto funcionamento do login.
              </p>
            </CardContent>
          </Card>

          {/* 7. Direitos do Utilizador */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">7. Os Seus Direitos ao Abrigo do RGPD</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Enquanto titular de dados pessoais, tem os seguintes direitos ao abrigo do RGPD:</p>
              <ul className="space-y-2 ml-4">
                <li className="list-disc"><strong>Acesso:</strong> Solicitar uma cópia dos dados pessoais que guardamos sobre si</li>
                <li className="list-disc"><strong>Retificação:</strong> Corrigir dados incorretos ou incompletos (pode fazê-lo diretamente no perfil)</li>
                <li className="list-disc"><strong>Apagamento:</strong> Solicitar a eliminação da sua conta e respetivos dados pessoais</li>
                <li className="list-disc"><strong>Portabilidade:</strong> Receber os seus dados num formato estruturado e legível</li>
                <li className="list-disc"><strong>Oposição:</strong> Opor-se ao tratamento dos seus dados para determinadas finalidades</li>
                <li className="list-disc"><strong>Limitação:</strong> Solicitar a limitação do tratamento dos seus dados em determinadas circunstâncias</li>
              </ul>
              <p className="text-sm">
                Para exercer qualquer um destes direitos, contacte-nos para{" "}
                <a href="mailto:miguel@cantolico.pt" className="text-primary underline">
                  miguel@cantolico.pt
                </a>
                . Responderemos no prazo máximo de 30 dias.
              </p>
            </CardContent>
          </Card>

          {/* 8. Retenção de Dados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">8. Retenção de Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>Os seus dados são conservados pelo tempo necessário às finalidades para que foram recolhidos:</p>
              <ul className="space-y-1 ml-4">
                <li className="list-disc"><strong>Dados de conta:</strong> Enquanto a conta estiver ativa. Após eliminação da conta, os dados pessoais são removidos no prazo de 30 dias.</li>
                <li className="list-disc"><strong>Conteúdo submetido:</strong> Permanece na plataforma após eliminação de conta, mas é desassociado do utilizador (atribuído como &quot;autor desconhecido&quot;), salvo pedido expresso de remoção.</li>
                <li className="list-disc"><strong>Logs técnicos:</strong> Conservados por no máximo 90 dias para fins de segurança e diagnóstico.</li>
              </ul>
            </CardContent>
          </Card>

          {/* 9. Segurança */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">9. Segurança dos Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>Tomamos medidas razoáveis para proteger os seus dados pessoais:</p>
              <ul className="space-y-1 ml-4">
                <li className="list-disc">Autenticação gerida pelo Clerk, com suporte a autenticação de dois fatores (2FA)</li>
                <li className="list-disc">Comunicações cifradas via HTTPS em todo o site</li>
                <li className="list-disc">Palavras-passe nunca armazenadas em texto claro — são geridas e encriptadas pelo Clerk</li>
                <li className="list-disc">Acesso à base de dados restrito a pessoal autorizado e operações do servidor</li>
                <li className="list-disc">Infraestrutura alojada em plataformas com certificações de segurança reconhecidas (Vercel, Supabase)</li>
              </ul>
              <p className="text-sm text-muted-foreground italic">
                Apesar das medidas implementadas, nenhum sistema é infalível. Em caso de violação de segurança que afete os seus dados, será notificado nos termos legais aplicáveis.
              </p>
            </CardContent>
          </Card>

          {/* 10. Alterações à Política */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">10. Alterações à Política de Privacidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>
                Esta política pode ser atualizada para refletir alterações ao serviço, à legislação ou à introdução
                de novos sub-processadores (como publicidade).
              </p>
              <ul className="space-y-1 ml-4">
                <li className="list-disc">Alterações significativas serão comunicadas por email e/ou aviso no site</li>
                <li className="list-disc">A data de atualização no rodapé será sempre revista</li>
                <li className="list-disc">A utilização continuada do serviço após notificação implica a aceitação das alterações</li>
              </ul>
            </CardContent>
          </Card>

          {/* 11. Contacto e CNPD */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">11. Contacto e Direito de Queixa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>Para questões sobre privacidade, proteção de dados ou exercício dos seus direitos:</p>
              <ul className="space-y-1 ml-4">
                <li className="list-disc">
                  Email:{" "}
                  <a href="mailto:miguel@cantolico.pt" className="text-primary underline">
                    miguel@cantolico.pt
                  </a>
                </li>
                <li className="list-disc">Responsável: Equipa Cantólico</li>
                <li className="list-disc">Tempo de resposta: Máximo 30 dias</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Tem também o direito de apresentar queixa à{" "}
                <strong>Comissão Nacional de Proteção de Dados (CNPD)</strong>{" "}
                se considerar que os seus direitos não estão a ser respeitados —{" "}
                <a href="https://www.cnpd.pt" className="text-primary underline" target="_blank" rel="noopener noreferrer">
                  www.cnpd.pt
                </a>.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">
              <strong>Política de Privacidade do Cantólico</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              Versão 2.0 — Atualizada em 20/04/2026
              <br />
              Esta política está em conformidade com o RGPD (Regulamento (UE) 2016/679) e a legislação portuguesa aplicável.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
