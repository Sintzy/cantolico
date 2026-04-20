import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Termos de Utilização",
  description: "Termos e condições de uso do Cantólico.",
  path: "/terms",
  type: "article",
});

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">
              Termos de Utilização
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Ao utilizar o Cantólico, está a concordar com os presentes termos de utilização.
              Leia com atenção para compreender os seus direitos e responsabilidades.
            </p>
          </CardHeader>
        </Card>

        <div className="space-y-6">
          {/* 1. O que é o Cantólico */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">1. O que é o Cantólico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>
                O Cantólico é uma plataforma digital católica dedicada à preservação, partilha e descoberta de cânticos litúrgicos.
                O nosso objetivo é servir a comunidade católica com um cancioneiro digital acessível, organizado e abrangente.
              </p>
              <ul className="space-y-1 ml-6">
                <li className="list-disc"><strong>Proprietário:</strong> Cantólico</li>
                <li className="list-disc"><strong>Natureza do serviço:</strong> Cancioneiro digital católico gratuito</li>
                <li className="list-disc"><strong>Público-alvo:</strong> Comunidade católica, músicos, liturgistas e fiéis</li>
              </ul>
              <p className="text-sm text-muted-foreground italic">
                A utilização do site implica a aceitação plena e sem reservas dos presentes termos de utilização.
              </p>
            </CardContent>
          </Card>

          {/* 2. Acesso e Registo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">2. Acesso e Registo de Utilizadores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-2">Acesso Livre:</h3>
                  <ul className="space-y-1 ml-4">
                    <li className="list-disc">Consulta do cancioneiro</li>
                    <li className="list-disc">Pesquisa de músicas</li>
                    <li className="list-disc">Navegação geral do site</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Requer Registo:</h3>
                  <ul className="space-y-1 ml-4">
                    <li className="list-disc">Submissão de músicas</li>
                    <li className="list-disc">Sistema de estrelas (favoritos)</li>
                    <li className="list-disc">Criação e gestão de playlists</li>
                    <li className="list-disc">Planeamento de missas</li>
                  </ul>
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">Compromissos do Utilizador Registado:</h3>
                <ul className="space-y-1 ml-4">
                  <li className="list-disc">Fornecer informação verdadeira e atualizada no registo</li>
                  <li className="list-disc">Não partilhar as credenciais de acesso com terceiros</li>
                  <li className="list-disc">Notificar imediatamente qualquer uso não autorizado da conta</li>
                  <li className="list-disc">Respeitar os direitos de autor e a propriedade intelectual</li>
                  <li className="list-disc">Utilizar o serviço de forma responsável e de acordo com os valores católicos</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground italic">
                O registo e a autenticação são geridos pelo serviço Clerk (clerk.com). Ao criar uma conta, está também a sujeitar-se aos termos de utilização do Clerk.
              </p>
            </CardContent>
          </Card>

          {/* 3. Conteúdo Submetido e Licença */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">3. Conteúdo Submetido e Licença de Utilização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Todo o conteúdo submetido na plataforma (letras, cifras, acordes, PDFs, ficheiros áudio, imagens, etc.)
                é da <strong>exclusiva responsabilidade do utilizador que o submeteu</strong>. O Cantólico não verifica
                previamente todos os conteúdos, embora proceda à sua moderação.
              </p>
              <div>
                <h3 className="font-medium mb-2">Ao submeter conteúdo, o utilizador:</h3>
                <ul className="space-y-1 ml-4">
                  <li className="list-disc">Declara que possui os direitos necessários para partilhar esse conteúdo ou que o mesmo se encontra em domínio público</li>
                  <li className="list-disc">Concede ao Cantólico uma <strong>licença perpétua, gratuita, mundial e não-exclusiva</strong> para exibir, armazenar, distribuir, exportar e adaptar o conteúdo no âmbito da plataforma</li>
                  <li className="list-disc">Aceita que o conteúdo possa ser utilizado em funcionalidades do site como exportação de PDF, PPTX ou planeamento de missas</li>
                  <li className="list-disc">Mantém a titularidade dos direitos de autor sobre o conteúdo original que criou</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">Tipos de conteúdo aceite:</h3>
                <ul className="space-y-1 ml-4">
                  <li className="list-disc">Cânticos católicos tradicionais e contemporâneos em domínio público</li>
                  <li className="list-disc">Letras com cifras e acordes de obras originais do próprio utilizador</li>
                  <li className="list-disc">Partituras em formato PDF cuja partilha seja legalmente permitida</li>
                  <li className="list-disc">Gravações áudio quando devidamente autorizadas pelos detentores dos direitos</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground italic">
                O Cantólico reserva-se o direito de remover qualquer conteúdo que viole direitos de autor ou os presentes termos, sem aviso prévio.
              </p>
            </CardContent>
          </Card>

          {/* 4. Direitos de Autor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">4. Direitos de Autor e Propriedade Intelectual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                O Cantólico respeita os direitos de autor e a propriedade intelectual e espera o mesmo dos seus utilizadores.
                Muitas das músicas religiosas contemporâneas estão protegidas por direitos de autor — a utilização
                pessoal ou litúrgica não autorizada pode constituir uma violação legal.
              </p>
              <div>
                <h3 className="font-medium mb-2">Responsabilidades do utilizador:</h3>
                <ul className="space-y-1 ml-4">
                  <li className="list-disc">Não submeter obras protegidas por direitos de autor sem autorização do titular</li>
                  <li className="list-disc">Identificar corretamente a autoria das obras submetidas</li>
                  <li className="list-disc">Não reproduzir nem distribuir conteúdo do Cantólico para fins comerciais sem autorização</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">Reporte de violações:</h3>
                <p>
                  Se for titular de direitos de autor e considerar que algum conteúdo do Cantólico viola os seus direitos,
                  contacte-nos para{" "}
                  <a href="mailto:miguel@cantolico.pt" className="text-primary underline">
                    miguel@cantolico.pt
                  </a>{" "}
                  com a identificação do conteúdo em causa. Comprometemo-nos a analisar e responder no prazo de 10 dias úteis.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 5. Conteúdo Proibido */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">5. Conteúdo Proibido e Sanções</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">É estritamente proibido submeter ou partilhar:</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <ul className="space-y-1 ml-4">
                    <li className="list-disc">Conteúdo anticristão ou contrário à doutrina da Igreja</li>
                    <li className="list-disc">Material protegido por direitos de autor sem autorização</li>
                    <li className="list-disc">Conteúdo ofensivo, difamatório ou inadequado</li>
                    <li className="list-disc">Spam ou publicidade não autorizada</li>
                  </ul>
                  <ul className="space-y-1 ml-4">
                    <li className="list-disc">Material pornográfico ou violento</li>
                    <li className="list-disc">Informações falsas ou enganosas</li>
                    <li className="list-disc">Código malicioso, vírus ou tentativas de ataque</li>
                    <li className="list-disc">Violação da privacidade de terceiros</li>
                  </ul>
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">Sanções aplicáveis:</h3>
                <ul className="space-y-1 ml-4">
                  <li className="list-disc">Remoção imediata do conteúdo infrator</li>
                  <li className="list-disc">Suspensão temporária ou permanente da conta</li>
                  <li className="list-disc">Comunicação às autoridades competentes em casos graves</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 6. Publicidade */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">6. Publicidade e Monetização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                O Cantólico é atualmente um serviço <strong>totalmente gratuito e sem publicidade</strong>.
                Não exibimos anúncios e não utilizamos os seus dados para fins publicitários neste momento.
              </p>
              <p>
                Contudo, para garantir a sustentabilidade da plataforma a longo prazo, <strong>reservamos o direito de
                introduzir publicidade no futuro</strong>, nomeadamente através do Google AdSense ou de parcerias similares.
              </p>
              <div>
                <h3 className="font-medium mb-2">Se e quando publicidade for introduzida:</h3>
                <ul className="space-y-1 ml-4">
                  <li className="list-disc">Os utilizadores serão notificados previamente por email e/ou aviso no site</li>
                  <li className="list-disc">A Política de Privacidade será atualizada para refletir a utilização de cookies do Google AdSense</li>
                  <li className="list-disc">A publicidade será sempre contextualizada e adequada ao público católico</li>
                  <li className="list-disc">Não serão utilizados dados pessoais sensíveis para targeting publicitário</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 7. Limitações de Responsabilidade */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">7. Limitações de Responsabilidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>O Cantólico disponibiliza o serviço &quot;tal como está&quot;, sem garantias de disponibilidade contínua ou ausência de erros.</p>
              <div>
                <h3 className="font-medium mb-2">O Cantólico não se responsabiliza por:</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <ul className="space-y-1 ml-4">
                    <li className="list-disc">Falhas técnicas, manutenções ou indisponibilidade temporária do serviço</li>
                    <li className="list-disc">Perda de dados resultante de problemas técnicos</li>
                    <li className="list-disc">Conteúdos submetidos por utilizadores terceiros</li>
                    <li className="list-disc">Violações de direitos de autor cometidas por utilizadores</li>
                  </ul>
                  <ul className="space-y-1 ml-4">
                    <li className="list-disc">Danos diretos ou indiretos decorrentes da utilização do site</li>
                    <li className="list-disc">Exatidão absoluta de todas as informações e conteúdos</li>
                    <li className="list-disc">Comportamentos inadequados de outros utilizadores</li>
                    <li className="list-disc">Conteúdo de sites externos para os quais possamos ter ligações</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 8. Alterações aos Termos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">8. Alterações aos Termos de Utilização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>
                O Cantólico pode atualizar estes termos a qualquer momento, nomeadamente para refletir alterações
                ao serviço, à legislação aplicável ou à introdução de novas funcionalidades.
              </p>
              <ul className="space-y-1 ml-4">
                <li className="list-disc">As alterações relevantes serão comunicadas por email ou aviso visível no site</li>
                <li className="list-disc">A data de atualização no rodapé deste documento será sempre atualizada</li>
                <li className="list-disc">A utilização continuada do serviço após a notificação implica a aceitação dos novos termos</li>
                <li className="list-disc">Em caso de discordância com as alterações, o utilizador pode eliminar a sua conta</li>
              </ul>
            </CardContent>
          </Card>

          {/* 9. Contacto */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">9. Contacto e Suporte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>Para questões sobre estes termos, reportar conteúdo ou obter suporte:</p>
              <ul className="space-y-1 ml-4">
                <li className="list-disc">
                  Email:{" "}
                  <a href="mailto:miguel@cantolico.pt" className="text-primary underline">
                    miguel@cantolico.pt
                  </a>
                </li>
                <li className="list-disc">Tempo de resposta: Até 48 horas úteis</li>
                <li className="list-disc">Responsável: Equipa Cantólico</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">
              <strong>Termos e Condições de Utilização do Cantólico</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              Versão 3.0 — Atualizada em 20/04/2026
              <br />
              Este documento substitui todas as versões anteriores e é efetivo a partir da data indicada.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
