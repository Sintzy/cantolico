import { PAGE_METADATA } from "@/lib/metadata";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = PAGE_METADATA.terms();

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">
              Termos de Utilização
            </CardTitle>
            <p className="text-muted-foreground">
              Ao utilizar o Cantólico, está a concordar com os presentes termos de utilização. 
              Leia com atenção para compreender os seus direitos e responsabilidades.
            </p>
          </CardHeader>
        </Card>

        {/* Content */}
        <div className="space-y-6">
          {/* 1. Objeto e Titularidade */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">1. Objeto e Titularidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                O Cantólico é uma plataforma digital católica dedicada à preservação, partilha e descoberta de cânticos litúrgicos. 
                O nosso objetivo é servir a comunidade católica global com um cancioneiro digital acessível e abrangente.
              </p>
              <ul className="space-y-2 ml-6">
                <li className="list-disc">Proprietário: Cantólico!</li>
                <li className="list-disc">Natureza do Serviço: Cancioneiro digital católico gratuito</li>
                <li className="list-disc">Público-Alvo: Comunidade católica, músicos, liturgistas e fiéis</li>
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
                    <li className="list-disc">Visualização de perfis públicos</li>
                    <li className="list-disc">Navegação geral do site</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Requer Registo:</h3>
                  <ul className="space-y-1 ml-4">
                    <li className="list-disc">Submissão de músicas</li>
                    <li className="list-disc">Sistema de estrelas (likes)</li>
                    <li className="list-disc">Criação de playlists</li>
                    <li className="list-disc">Comentários e interações</li>
                  </ul>
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">Compromissos do Utilizador:</h3>
                <ul className="space-y-1 ml-4">
                  <li className="list-disc">Fornecer informação verdadeira e atualizada no registo</li>
                  <li className="list-disc">Manter a confidencialidade da palavra-passe</li>
                  <li className="list-disc">Notificar imediatamente qualquer uso não autorizado da conta</li>
                  <li className="list-disc">Respeitar os direitos de autor e propriedade intelectual</li>
                  <li className="list-disc">Utilizar o serviço de forma responsável e ética</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 3. Conteúdo Submetido */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">3. Conteúdo Submetido pelos Utilizadores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Todo o conteúdo submetido (letras, acordes, PDFs, áudio, etc.) é da exclusiva responsabilidade do utilizador. 
                Deve garantir que possui os direitos necessários para partilhar o conteúdo.
              </p>
              <div>
                <h3 className="font-medium mb-2">Tipos de Conteúdo Aceite:</h3>
                <ul className="space-y-1 ml-4">
                  <li className="list-disc">Cânticos católicos tradicionais e contemporâneos</li>
                  <li className="list-disc">Letras com cifras e acordes</li>
                  <li className="list-disc">Partituras em formato PDF</li>
                  <li className="list-disc">Gravações áudio (quando autorizado)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 4. Conteúdo Proibido */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">4. Conteúdo Proibido e Sanções</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Conteúdo Estritamente Proibido:</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <ul className="space-y-1 ml-4">
                    <li className="list-disc">Conteúdo não católico ou anticristão</li>
                    <li className="list-disc">Material com direitos de autor protegidos</li>
                    <li className="list-disc">Conteúdo ofensivo ou inadequado</li>
                    <li className="list-disc">Spam ou publicidade não autorizada</li>
                  </ul>
                  <ul className="space-y-1 ml-4">
                    <li className="list-disc">Material pornográfico ou violento</li>
                    <li className="list-disc">Informações falsas ou enganosas</li>
                    <li className="list-disc">Vírus ou código malicioso</li>
                    <li className="list-disc">Violação da privacidade de terceiros</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. Limitações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">5. Limitações de Responsabilidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">O Cantólico NÃO se responsabiliza por:</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <ul className="space-y-1 ml-4">
                    <li className="list-disc">Falhas técnicas ou indisponibilidade do serviço</li>
                    <li className="list-disc">Perda de dados por motivos técnicos</li>
                    <li className="list-disc">Conteúdos submetidos por terceiros</li>
                    <li className="list-disc">Violações de direitos de autor por utilizadores</li>
                  </ul>
                  <ul className="space-y-1 ml-4">
                    <li className="list-disc">Danos diretos ou indiretos pelo uso do site</li>
                    <li className="list-disc">Precisão absoluta das informações</li>
                    <li className="list-disc">Comportamentos inadequados de utilizadores</li>
                    <li className="list-disc">Links externos ou conteúdo de terceiros</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6. Contacto */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">6. Contacto e Suporte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Para questões sobre estes termos ou o serviço:</p>
              <ul className="space-y-1 ml-4">
                <li>Suporte Técnico: <a href="mailto:miguel@cantolico.pt" className="text-primary underline">miguel@cantolico.pt</a></li>
                <li>Tempo de Resposta: Até 48 horas úteis</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Footer info */}
        <Card className="mt-8">
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">
              <strong>Termos e Condições de Utilização do Cantólico</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              Versão 2.0 - Atualizada em 07/08/2025<br />
              Este documento substitui todas as versões anteriores e é efetivo a partir da data indicada.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}