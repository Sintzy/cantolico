"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, HelpCircle, Music, FileText } from "lucide-react";
import Link from "next/link";

interface ChordGuidePopupProps {
  onClose: () => void;
}

export function ChordGuidePopup({ onClose }: ChordGuidePopupProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Sistema de Acordes - Guia Rápido</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                🎯 Formato Inline
              </h3>
              <div className="text-sm space-y-2">
                <p className="text-gray-600 dark:text-gray-400">
                  Para acordes embutidos no texto. Inicia com <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">#mic#</code>
                </p>
                <div className="bg-white dark:bg-gray-800 p-2 rounded text-xs font-mono">
                  #mic#<br />
                  [C]Deus est[Am]á aqui
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                📝 Formato Above
              </h3>
              <div className="text-sm space-y-2">
                <p className="text-gray-600 dark:text-gray-400">
                  Acordes numa linha, letra na seguinte
                </p>
                <div className="bg-white dark:bg-gray-800 p-2 rounded text-xs font-mono">
                  [C] [Am] [F] [G]<br />
                  Deus está aqui
                </div>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
                🎼 Intro/Ponte
              </h3>
              <div className="text-sm space-y-2">
                <p className="text-gray-600 dark:text-gray-400">
                  Seções instrumentais especiais
                </p>
                <div className="bg-white dark:bg-gray-800 p-2 rounded text-xs font-mono">
                  Intro:<br />
                  [A] [G] [C]
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">✨ Funcionalidades Automáticas</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <ul className="space-y-1">
                <li>• <strong>Detecção automática:</strong> O sistema detecta o formato automaticamente</li>
                <li>• <strong>Formato misto:</strong> Podes combinar inline com intro/ponte na mesma música</li>
                <li>• <strong>Acordes suportados:</strong> C, Am, F#, Cmaj7, D/F#, etc.</li>
              </ul>
              <ul className="space-y-1">
                <li>• <strong>Seções especiais:</strong> Intro:, Ponte:, Solo:, Bridge:</li>
                <li>• <strong>Visual limpo:</strong> Acordes destacados sem sobreposição</li>
                <li>• <strong>Responsivo:</strong> Funciona bem em mobile e desktop</li>
              </ul>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
            <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">💡 Exemplo Completo</h3>
            <div className="bg-white dark:bg-gray-800 p-3 rounded text-xs font-mono">
              <pre>{`Intro:
[Am] [F] [C] [G]

#mic#
[Am]Santo, [F]santo, [C]santo é o Se[G]nhor
[Am]Hosana [F]nas altu[C]ras[G]

Ponte:
[F] [G] [Am] [C]`}</pre>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Podes combinar todos os formatos na mesma música!
            </div>
            <div className="flex gap-2">
              <Link href="/guide">
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-1" />
                  Guia Completo
                </Button>
              </Link>
              <Button onClick={onClose}>
                Começar a Escrever
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChordGuideButton() {
  const [showGuide, setShowGuide] = useState(false);
  const [hasSeenGuide, setHasSeenGuide] = useState(false);

  useEffect(() => {
    // Verifica se o usuário já viu o guia
    const seen = localStorage.getItem('chord-guide-seen');
    if (!seen) {
      setShowGuide(true);
    } else {
      setHasSeenGuide(true);
    }
  }, []);

  const handleClose = () => {
    setShowGuide(false);
    setHasSeenGuide(true);
    localStorage.setItem('chord-guide-seen', 'true');
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowGuide(true)}
        className="flex items-center gap-1"
      >
        <HelpCircle className="w-4 h-4" />
        Sistema de Acordes
      </Button>

      {showGuide && <ChordGuidePopup onClose={handleClose} />}
    </>
  );
}
