"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { processChords, processChordHtml, processMixedChords } from "@/lib/chord-processor";
import MarkdownIt from "markdown-it";
import chords from "markdown-it-chords";

const mdParser = new MarkdownIt({ breaks: true }).use(chords);

const examples = {
  above: {
    title: "Cifras Above",
    description: "Acordes acima da letra (recomendado)",
    code: `[C][Am][F][G]
Canto Aleluia ao senhor
[D][A][F][G]
Aleluia sim ao senhor sim`,
    text: `[C][Am][F][G]
Canto Aleluia ao senhor
[D][A][F][G]
Aleluia sim ao senhor sim`
  },
  sections: {
    title: "Intro/Bridge/Ponte",
    description: "Intro:, Bridge:, Ponte:, Solo:, Outro:",
    code: `Intro:
[A][Em][G][C]

Bridge:
[F][C][G][Am]

[C][Am][F][G]
Santo, santo, santo
[G][Am][F][C]
Hosana nas alturas`,
    text: `Intro:
[A][Em][G][C]

Bridge:
[F][C][G][Am]

[C][Am][F][G]
Santo, santo, santo
[G][Am][F][C]
Hosana nas alturas`
  }
};

export function ChordExamples() {
  const [activeExample, setActiveExample] = useState<keyof typeof examples>('above');
  const [preview, setPreview] = useState('');

  // Inicializa o preview quando o componente monta
  useEffect(() => {
    updatePreview(activeExample);
  }, []);

  const updatePreview = (exampleKey: keyof typeof examples) => {
    const example = examples[exampleKey];
    let processedHtml: string;
    
    try {
      // Processar o texto baseado no tipo de exemplo
      if (exampleKey === 'above') {
        processedHtml = processChords(example.text, 'above');
      } else {
        processedHtml = processMixedChords(example.text);
      }
      
      setPreview(processedHtml);
    } catch (error) {
      console.error('Erro ao processar acordes:', error);
      setPreview('<p>Erro ao processar acordes</p>');
    }
  };

  const handleExampleChange = (exampleKey: keyof typeof examples) => {
    setActiveExample(exampleKey);
    updatePreview(exampleKey);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {Object.entries(examples).map(([key, example]) => (
          <Button
            key={key}
            variant={activeExample === key ? "default" : "outline"}
            size="sm"
            onClick={() => handleExampleChange(key as keyof typeof examples)}
            className="text-xs"
          >
            {example.title}
          </Button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Código Fonte */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">📝 Código:</h4>
            <span className="text-xs text-muted-foreground">
              {examples[activeExample].description}
            </span>
          </div>
          <div className="bg-muted/50 p-3 rounded-md">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
              {examples[activeExample].code}
            </pre>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">👁️ Resultado:</h4>
          <div className="bg-white p-3 rounded-md border min-h-[100px]">
            <div 
              className="text-sm"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
        <p className="text-xs text-blue-700">
          💡 <strong>Dica:</strong> O formato "Above" é o mais recomendado para facilitar a leitura e organização dos acordes.
        </p>
      </div>
    </div>
  );
}