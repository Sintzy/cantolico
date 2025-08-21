import { PAGE_METADATA } from "@/lib/metadata";

export const metadata = PAGE_METADATA.privacy();

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Política de Privacidade
        </h1>
        <p className="text-gray-600 mb-12">
          A sua privacidade é importante para nós. Esta política explica como recolhemos, utilizamos e protegemos os seus dados pessoais no Cantólico.
        </p>

        {/* Content */}
        <div className="space-y-12">
          {/* 1. Dados Recolhidos */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Dados Pessoais Recolhidos</h2>
            <div className="space-y-4 text-gray-700">
              <p>No Cantólico, recolhemos apenas os dados estritamente necessários para o funcionamento do serviço:</p>
              <ul className="space-y-2 ml-6">
                <li className="list-disc"><strong>Nome:</strong> Para identificação no site e autoria de submissões</li>
                <li className="list-disc"><strong>Email:</strong> Para autenticação e comunicações essenciais</li>
                <li className="list-disc"><strong>Palavra-passe:</strong> Armazenada de forma encriptada (hash) para segurança</li>
                <li className="list-disc"><strong>Imagem de perfil:</strong> Opcional, para personalização do perfil</li>
                <li className="list-disc"><strong>Biografia:</strong> Opcional, para descrição pessoal no perfil</li>
              </ul>
              <p className="text-sm text-gray-500 italic">
                <strong>Nota:</strong> Não recolhemos dados sensíveis como número de telefone, morada, ou informações financeiras.
              </p>
            </div>
          </section>

          {/* 2. Como Utilizamos */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Como Utilizamos os Seus Dados</h2>
            <div className="space-y-4 text-gray-700">
              <p>Os seus dados pessoais são utilizados exclusivamente para:</p>
              <ul className="space-y-2 ml-6">
                <li className="list-disc"><strong>Autenticação:</strong> Permitir o acesso seguro à sua conta</li>
                <li className="list-disc"><strong>Identificação:</strong> Mostrar o seu nome nas submissões e perfil público</li>
                <li className="list-disc"><strong>Comunicação:</strong> Notificações sobre o estado das suas submissões</li>
                <li className="list-disc"><strong>Funcionalidades:</strong> Playlists pessoais, sistema de estrelas, histórico</li>
                <li className="list-disc"><strong>Moderação:</strong> Contactar em caso de violação dos termos de utilização</li>
              </ul>
              <p className="text-sm text-gray-500 italic">
                <strong>Garantia:</strong> Os seus dados nunca são utilizados para publicidade, marketing não solicitado ou vendidos a terceiros.
              </p>
            </div>
          </section>

          {/* 3. Visibilidade dos Dados */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Visibilidade dos Dados</h2>
            <div className="space-y-4 text-gray-700">
              <p>Transparência sobre que informações são visíveis para outros utilizadores:</p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Visível Publicamente:</h3>
                  <ul className="space-y-1 ml-4">
                    <li className="list-disc">Nome completo</li>
                    <li className="list-disc">Email (para contacto)</li>
                    <li className="list-disc">Imagem de perfil</li>
                    <li className="list-disc">Biografia</li>
                    <li className="list-disc">Submissões públicas</li>
                    <li className="list-disc">Playlists públicas</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Sempre Privado:</h3>
                  <ul className="space-y-1 ml-4">
                    <li className="list-disc">Palavra-passe</li>
                    <li className="list-disc">Playlists privadas</li>
                    <li className="list-disc">Histórico de navegação</li>
                    <li className="list-disc">Dados de sessão</li>
                    <li className="list-disc">Endereço IP</li>
                    <li className="list-disc">Preferências pessoais</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Cookies e Tecnologias de Rastreamento</h2>
            <div className="space-y-4 text-gray-700">
              <p>Utilizamos cookies e tecnologias similares para melhorar a sua experiência:</p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Cookies Essenciais:</h3>
                  <ul className="space-y-1 ml-4">
                    <li className="list-disc">Sessão de autenticação (manter login ativo)</li>
                    <li className="list-disc">Preferências de interface (tema, idioma)</li>
                    <li className="list-disc">Dados temporários de formulários</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Dados de Analytics:</h3>
                  <ul className="space-y-1 ml-4">
                    <li className="list-disc">Páginas visitadas (para melhorar o site)</li>
                    <li className="list-disc">Tempo de permanência</li>
                    <li className="list-disc">Funcionalidades mais utilizadas</li>
                  </ul>
                </div>
              </div>
              <p className="text-sm text-gray-500 italic">
                <strong>Nota:</strong> Pode desativar cookies no seu navegador, mas algumas funcionalidades podem ficar limitadas.
              </p>
            </div>
          </section>

          {/* 5. Contacto */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Contacto e Questões</h2>
            <div className="space-y-4 text-gray-700">
              <p>Para questões sobre privacidade, proteção de dados ou exercício dos seus direitos:</p>
              <ul className="space-y-1 ml-4">
                <li>Email: <a href="mailto:miguel@cantolico.pt" className="text-gray-900 underline">miguel@cantolico.pt</a></li>
                <li>Responsável: Equipa Cantólico</li>
                <li>Tempo de resposta: Máximo 30 dias úteis</li>
              </ul>
              <p className="text-sm text-gray-500 mt-4">
                Tem também o direito de apresentar queixa à Comissão Nacional de Proteção de Dados (CNPD) 
                se considerar que os seus direitos não estão a ser respeitados.
              </p>
            </div>
          </section>
        </div>

        {/* Footer info */}
        <div className="mt-16 pt-8 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500 mb-1">
            <strong>Política de Privacidade do Cantólico</strong>
          </p>
          <p className="text-xs text-gray-400">
            Versão 1.0 - Atualizada em 07/08/2025<br />
            Esta política está em conformidade com o RGPD (Regulamento (UE) 2016/679) e a legislação portuguesa aplicável.
          </p>
        </div>
      </div>
    </div>
  );
}
