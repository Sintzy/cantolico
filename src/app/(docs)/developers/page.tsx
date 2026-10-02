import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BookOpen, Code2, KeyRound, Search, Sparkles } from 'lucide-react';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'API para parceiros',
  description: 'Documentação da API de parceiros do Cantólico para pesquisa de cânticos e sugestões litúrgicas.',
  path: '/developers',
});

const baseUrl = 'https://www.cantolico.pt/api/v1';

function CodeBlock({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-xl border border-stone-800 bg-stone-950 p-4 text-xs leading-relaxed text-stone-100 sm:text-sm"><code>{children}</code></pre>;
}

function Endpoint({ path, children }: { path: string; children: ReactNode }) {
  return <section className="rounded-xl border border-stone-200 bg-white p-5 sm:p-6"><div className="mb-3 flex flex-wrap items-center gap-2"><span className="rounded bg-emerald-100 px-2 py-1 font-mono text-xs font-bold text-emerald-800">GET</span><code className="text-sm font-semibold text-stone-900">{path}</code></div>{children}</section>;
}

export default function DevelopersPage() {
  return (
    <main className="min-h-screen bg-stone-50 pb-20 pt-24 text-stone-900">
      <header className="border-b border-stone-200 bg-white"><div className="mx-auto max-w-5xl px-4 py-12 sm:px-6"><p className="mb-4 flex items-center gap-2 text-sm font-medium text-rose-700"><Code2 className="h-4 w-4" />Can♱ólico Partner API · v1</p><h1 className="font-display text-4xl leading-tight sm:text-5xl">API do Cantólico.</h1><p className="mt-4 max-w-3xl text-base leading-relaxed text-stone-600 sm:text-lg">Pesquisa cânticos e consulta sugestões para cada celebração.</p></div></header>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[13rem_1fr]">
        <aside className="lg:sticky lg:top-24 lg:h-fit"><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400">Nesta página</p><nav className="grid gap-2 text-sm text-stone-600"><a href="#autenticacao" className="hover:text-rose-700">Autenticação</a><a href="#catalogo" className="hover:text-rose-700">Pesquisa</a><a href="#canto" className="hover:text-rose-700">Ficha de cântico</a><a href="#sugestoes" className="hover:text-rose-700">Sugestões</a><a href="#erros" className="hover:text-rose-700">Limites e erros</a></nav></aside>

        <div className="space-y-10">
          <section id="autenticacao" className="scroll-mt-24 space-y-4"><div><p className="mb-2 flex items-center gap-2 text-sm font-medium text-rose-700"><KeyRound className="h-4 w-4" />Autenticação</p><h2 className="font-display text-3xl">Chave de API</h2></div><p className="text-stone-600">Envia a chave em <code>Authorization: Bearer &lt;api_key&gt;</code> ou <code>X-API-Key</code>.</p><CodeBlock>{`curl "${baseUrl}/songs?q=aleluia" -H "Authorization: Bearer ctk_a_tua_chave"`}</CodeBlock><p className="text-sm text-stone-500">URL base: <code>{baseUrl}</code>. Respostas em JSON.</p></section>

          <section id="catalogo" className="scroll-mt-24 space-y-4"><div><p className="mb-2 flex items-center gap-2 text-sm font-medium text-rose-700"><Search className="h-4 w-4" />Catálogo</p><h2 className="font-display text-3xl">Pesquisar cânticos</h2></div><Endpoint path="/songs"><p className="text-sm text-stone-600">Pesquisa títulos com <code>q</code>. Filtra por momento, tipo ou instrumento. Cada cântico inclui <code>url</code>, o link direto para o Cantólico.</p><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-stone-200 text-stone-500"><tr><th className="pb-2 pr-4">Parâmetro</th><th className="pb-2">Valores</th></tr></thead><tbody className="divide-y divide-stone-100"><tr><td className="py-2 pr-4"><code>q</code></td><td>texto no título</td></tr><tr><td className="py-2 pr-4"><code>moment</code></td><td>momento litúrgico</td></tr><tr><td className="py-2 pr-4"><code>type</code></td><td>ACORDES ou PARTITURA</td></tr><tr><td className="py-2 pr-4"><code>instrument</code></td><td>ORGAO, GUITARRA, PIANO, CORO ou OUTRO</td></tr><tr><td className="py-2 pr-4"><code>page</code> / <code>per_page</code></td><td>página / 1 a 100 resultados</td></tr></tbody></table></div><CodeBlock>{'GET /songs?q=aleluia&moment=ACLAMACAO_EVANGELHO&page=1&per_page=25'}</CodeBlock></Endpoint></section>

          <section id="canto" className="scroll-mt-24 space-y-4"><div><p className="mb-2 flex items-center gap-2 text-sm font-medium text-rose-700"><BookOpen className="h-4 w-4" />Detalhe</p><h2 className="font-display text-3xl">Ficha de cântico</h2></div><Endpoint path="/songs/{id-ou-slug}"><p className="text-sm text-stone-600">Devolve autoria, instrumento, momentos, etiquetas, capo, <code>url</code> e a versão atual com letra, acordes e links multimédia.</p><CodeBlock>{'GET /songs/aleluia-pascal'}</CodeBlock></Endpoint></section>

          <section id="sugestoes" className="scroll-mt-24 space-y-4"><div><p className="mb-2 flex items-center gap-2 text-sm font-medium text-rose-700"><Sparkles className="h-4 w-4" />Liturgia</p><h2 className="font-display text-3xl">Sugestões de cânticos</h2></div><Endpoint path="/liturgical-suggestions?date=YYYY-MM-DD"><p className="text-sm text-stone-600">Devolve celebração, leituras, cor litúrgica e três cânticos por momento. O primeiro é a sugestão principal. Cada cântico inclui <code>url</code>. Sem <code>date</code>, usa o dia atual em Lisboa.</p><CodeBlock>{'GET /liturgical-suggestions?date=2026-10-04'}</CodeBlock><p className="mt-3 text-sm text-stone-500">A resposta inclui <code>celebration</code>, <code>suggestions</code>, <code>source</code> e <code>format_version</code>. Uma data não encontrada devolve <code>404 not_found</code>.</p></Endpoint></section>

          <section id="erros" className="scroll-mt-24 space-y-4"><h2 className="font-display text-3xl">Limites e erros</h2><p className="text-stone-600">Limite: 120 pedidos por minuto por chave. As respostas incluem <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code> e <code>X-RateLimit-Reset</code>.</p><CodeBlock>{'{ "error": { "code": "invalid_api_key", "message": "É necessária uma chave de API válida." } }'}</CodeBlock><ul className="grid gap-1 text-sm text-stone-600"><li><strong>401</strong> chave inválida, revogada ou expirada</li><li><strong>403</strong> chave sem permissão</li><li><strong>404</strong> recurso não encontrado</li><li><strong>422</strong> parâmetros inválidos</li><li><strong>429</strong> limite atingido; inclui <code>Retry-After</code></li><li><strong>500</strong> erro temporário</li></ul></section>
        </div>
      </div>
    </main>
  );
}
