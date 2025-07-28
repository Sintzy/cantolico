import Link from "next/link";
import MarkdownIt from "markdown-it";
import chords from "markdown-it-chords";
import "../../../../public/styles/chords.css"; // importa o CSS correto

const example = `[Cm7]Tive um sonho e quando acordei
[F]Viajei no tempo e desejei
[G]entregar-Te a vida,
[C7]Estender a taça toda a transbordar, cantei!

[F]Ir mais além, subindo as estrelas do céu
[C7]Descendo ao fundo da Terra só Contigo eu vou,
[Dm7]Embalado nos Teus passos vou,
[C7]Abandonado em teus abraços sou,
[Dm7]Aprendiz de viajante e até me perco em Ti.`;

const mdParser = new MarkdownIt({ breaks: true }).use(chords);

export default function ChordsSystemPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      <h1 className="text-4xl font-bold text-center">🎸 Sistema de Acordes Markdown</h1>
      <p className="text-center text-lg text-muted-foreground">
        Aprende a escrever músicas com acordes de forma simples, clara e compatível com transposição automática.
      </p>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">✨ Exemplo Convertido</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Markdown</h3>
            <pre className="bg-muted border p-4 text-sm rounded-md overflow-x-auto font-mono">
{example}
            </pre>
          </div>
          <div>
            <h3 className="font-medium mb-2">Preview</h3>
            <div className="prose dark:prose-invert border p-4 rounded-md overflow-auto text-sm">
              <div dangerouslySetInnerHTML={{ __html: mdParser.render(example) }} />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">🛠️ Como Escrever</h2>
        <div className="bg-muted border p-4 rounded-md font-mono text-sm space-y-2">
          <p>
            Escreve os acordes entre colchetes diretamente na linha da letra onde devem ser tocados:
          </p>
          <pre className="bg-background border rounded p-3 overflow-x-auto">
[Am]Canto Ale[Em]luia ao Sen[Am]hor</pre>

          <p>
            O acorde será exibido automaticamente por cima da sílaba onde se deve cantar ou tocar:
          </p>
          <div className="prose dark:prose-invert border rounded-md p-4">
            <div dangerouslySetInnerHTML={{ __html: mdParser.render(`[Am]Canto Ale[Em]luia ao Sen[Am]hor`) }} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">📚 Dicas Avançadas</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Usa <code className="font-mono">[Am7]</code>, <code className="font-mono">[F#]</code>, <code className="font-mono">[Cmaj7]</code>, etc — todos os formatos são válidos.</li>
          <li>Também podes escrever tablaturas assim: <code className="font-mono">[D|x00232]</code></li>
          <li>O sistema ignora as linhas sem acordes — perfeito para versos normais.</li>
          <li>Os acordes são renderizados com gráficos se incluíres a digitação: <code>[G|320003]</code></li>
        </ul>
      </section>

      <section className="text-center pt-8">
        <Link href="/musics/create">
          <button className="bg-black text-white px-6 py-2 rounded-md text-lg hover:bg-neutral-800">
            Começar a Escrever uma Música
          </button>
        </Link>
      </section>
    </div>
  );
}
