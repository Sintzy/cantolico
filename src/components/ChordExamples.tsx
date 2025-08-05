"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { processChords, processChordHtml, processMixedChords } from "@/lib/chord-processor";
import MarkdownIt from "markdown-it";
import chords from "markdown-it-chords";

const mdParser = new MarkdownIt({ breaks: true }).use(chords);

const examples = {
  inline: {
    title: "Formato Inline (Acordes embutidos)",
    description: "Usa #mic# no início e acordes diretamente no texto",
    code: `#mic#
[C]Deus está a[Am]qui, aleluia
[F]Deus está a[G]qui, ale[C]luia
[C]Eu creio que [Am]Jesus está aqui
[F]Eu creio que [G]Jesus está a[C]qui`,
    text: `#mic#
[C]Deus está a[Am]qui, aleluia
[F]Deus está a[G]qui, ale[C]luia
[C]Eu creio que [Am]Jesus está aqui
[F]Eu creio que [G]Jesus está a[C]qui`
  },
  above: {
    title: "Formato Above (Acordes acima da letra)",
    description: "Acordes numa linha, letra na linha seguinte",
    code: `[C] [Am] [F] [G]
Deus está aqui, aleluia
[C] [Am] [F] [G] [C]
Eu creio que Jesus está aqui`,
    text: `[C] [Am] [F] [G]
Deus está aqui, aleluia
[C] [Am] [F] [G] [C]
Eu creio que Jesus está aqui`
  },
  mixed: {
    title: "Formato Misto (Inline + Intro/Ponte)",
    description: "Combina intro/ponte com acordes inline",
    code: `Intro:
[Am] [F] [C] [G]

#mic#
[C]Santo, [Am]santo, [F]santo é o Se[G]nhor
[C]Hosana [Am]nas altu[F]ras[G]

Ponte:
[F] [G] [Am] [C]`,
    text: `Intro:
[Am] [F] [C] [G]

#mic#
[C]Santo, [Am]santo, [F]santo é o Se[G]nhor
[C]Hosana [Am]nas altu[F]ras[G]

Ponte:
[F] [G] [Am] [C]`
  }
};

export function ChordExamples() {
  const [activeExample, setActiveExample] = useState<keyof typeof examples>('inline');
  const [preview, setPreview] = useState('');

  // Inicializa o preview quando o componente monta
  useEffect(() => {
    updatePreview(activeExample);
  }, []);

  const updatePreview = (exampleKey: keyof typeof examples) => {
    const example = examples[exampleKey];
    let processedHtml: string;
    let wrapperClass: string;
    
    if (exampleKey === 'inline') {
      const cleanText = example.text.replace(/^#mic#\s*\n?/, '').trim();
      const rawHtml = mdParser.render(cleanText);
      processedHtml = processChordHtml(rawHtml);
      wrapperClass = 'chord-container-inline';
    } else if (exampleKey === 'mixed') {
      processedHtml = processMixedChords(example.text);
      // Processa também as partes inline
      processedHtml = processedHtml.replace(/<p>([^<]*\[[A-G][#b]?[^\]]*\][^<]*)<\/p>/g, (match, content) => {
        return processChordHtml(mdParser.render(content));
      });
      wrapperClass = 'chord-container-inline';
    } else {
      processedHtml = processChords(example.text, 'above');
      wrapperClass = 'chord-container-above';
    }
    
    setPreview(`<div class="${wrapperClass}">${processedHtml}</div>`);
  };

  const handleExampleChange = (exampleKey: keyof typeof examples) => {
    setActiveExample(exampleKey);
    updatePreview(exampleKey);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Sistema de Acordes - Exemplos</h2>
        <p className="text-gray-600 dark:text-gray-400">
          O sistema suporta múltiplos formatos para inserir acordes nas suas músicas.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(examples).map(([key, example]) => (
          <Button
            key={key}
            variant={activeExample === key ? "default" : "outline"}
            onClick={() => handleExampleChange(key as keyof typeof examples)}
          >
            {key === 'mixed' ? 'Misto' : example.title.split(' ')[1]}
          </Button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">
            {examples[activeExample].title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {examples[activeExample].description}
          </p>
          
          <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-4">
            <h4 className="text-sm font-medium mb-2">Código:</h4>
            <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">
              {examples[activeExample].code}
            </pre>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Preview</h3>

          <div
            className="border rounded-md p-4 bg-white dark:bg-neutral-900 overflow-auto max-h-[400px] font-mono text-sm"
            style={{ lineHeight: '1.8' }}
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
        <h3 className="text-lg font-semibold mb-3">Dicas de Uso</h3>
        <ul className="space-y-2 text-sm">
          <li><strong>Formato Inline:</strong> Melhor para acordes que mudam no meio das palavras</li>
          <li><strong>Formato Above:</strong> Mais limpo para visualização, acordes ficam separados da letra</li>
          <li><strong>Formato Misto:</strong> Combina o melhor dos dois mundos - intro/ponte + acordes inline</li>
          <li><strong>Detecção Automática:</strong> O sistema detecta automaticamente o formato baseado no conteúdo</li>
          <li><strong>Seções Especiais:</strong> Use Intro:, Ponte:, Solo:, Bridge: para seções instrumentais</li>
        </ul>
      </div>
    </div>
  );
}
