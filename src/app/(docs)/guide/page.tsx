import Link from "next/link";
import { ChordExamples } from "@/components/ChordExamples";
import { PAGE_METADATA } from "@/lib/metadata";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import "../../../../public/styles/chords.css";

export const metadata = PAGE_METADATA.guide();

export default function ChordsSystemPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">🎸 Sistema de Acordes Completo</h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Sistema avançado para escrever músicas com acordes de forma simples, clara e compatível com transposição automática. 
          Suporta múltiplos formatos para diferentes necessidades.
        </p>
      </div>

      <ChordExamples />

      <section className="space-y-6">
        <h2 className="text-3xl font-semibold text-center">🚀 Funcionalidades</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-3 text-blue-600">📝 Múltiplos Formatos</h3>
              <ul className="space-y-2 text-sm">
                <li>• <strong>Inline:</strong> Acordes embutidos no texto</li>
                <li>• <strong>Above:</strong> Acordes acima da letra</li>
                <li>• <strong>Intro:</strong> Seções instrumentais</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-3 text-green-600">🎵 Transposição</h3>
              <ul className="space-y-2 text-sm">
                <li>• Todos os tons suportados</li>
                <li>• Funciona em todos os formatos</li>
                <li>• Interface intuitiva</li>
                <li>• Preview em tempo real</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-3 text-purple-600">✨ Visual Limpo</h3>
              <ul className="space-y-2 text-sm">
                <li>• Acordes destacados em azul</li>
                <li>• Sem sobreposição de texto</li>
                <li>• Espaçamento otimizado</li>
                <li>• Suporte a modo escuro</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-semibold text-center">💡 Dicas de Uso</h2>
        
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Quando usar cada formato:</h3>
                <ul className="space-y-2 text-sm">
                  <li><strong>Formato Inline (#mic#):</strong> Para acordes que mudam no meio das palavras ou quando precisas de precisão máxima</li>
                  <li><strong>Formato Above:</strong> Para uma visualização mais limpa e tradicional, especialmente útil para impressão</li>
                  <li><strong>Formato Intro:</strong> Para introduções, pontes, solos e seções instrumentais</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Formatos de acordes suportados:</h3>
                <ul className="space-y-1 text-sm font-mono">
                  <li>[C], [Am], [F], [G7]</li>
                  <li>[Cmaj7], [Am7], [F#dim]</li>
                  <li>[D/F#], [G/B] (baixos)</li>
                  <li>[Em9], [A13], [Bb+]</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-semibold text-center">📱 Exemplos de Aplicação</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-muted">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-3">Para Músicos Iniciantes</h3>
              <p className="text-sm mb-4">Use o formato Above para maior clareza:</p>
              <pre className="bg-background p-3 rounded text-xs font-mono border">
[C] [Am] [F] [G]
Santo, santo, santo
[C] [Am] [F] [G] [C]
Santo é o Senhor
              </pre>
            </CardContent>
          </Card>
          
          <Card className="bg-muted">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-3">Para Músicos Avançados</h3>
              <p className="text-sm mb-4">Use o formato Inline para precisão:</p>
              <pre className="bg-background p-3 rounded text-xs font-mono border">
#mic#
[Cmaj7]San[Am7]to, san[Fmaj7]to, san[G7]to
[Cmaj7]San[Am7]to é o Se[Fmaj7]nhor[G7][C]
              </pre>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="text-center pt-8 space-y-4">
        <h2 className="text-2xl font-semibold">Pronto para começar?</h2>
        <p className="text-muted-foreground">
          Experimenta o novo sistema e cria músicas com acordes profissionais!
        </p>
        <Link href="/musics/create">
          <Button size="lg" className="text-lg font-semibold px-8 py-3">
            Criar Nova Música
          </Button>
        </Link>
      </section>
    </div>
  );
}
