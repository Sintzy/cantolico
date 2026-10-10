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
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Sistema de Acordes - Guia Rápido</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

  <div className="p-6 space-y-6 bg-white">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">
                📝 Formato Above (Recomendado)
              </h3>
              <div className="text-sm space-y-2">
                <p className="text-gray-600">
                  Acordes numa linha, letra na seguinte
                </p>
                <div className="bg-white p-2 rounded text-xs font-mono border border-green-100">
                  [C][Am][F][G]<br />
                  Canto Aleluia ao senhor
                </div>
              </div>
            </div>

            <div className="bg-sky-50 p-4 rounded-lg border border-sky-200">
              <h3 className="font-semibold text-sky-800 mb-2">
                🎸 Formato Inline
              </h3>
              <div className="text-sm space-y-2">
                <p className="text-gray-600">
                  Coloca o acorde imediatamente antes da sílaba onde muda.
                </p>
                <div className="bg-white p-2 rounded text-xs font-mono border border-sky-100">
                  Gló[D]ria a Deus nas al[G]turas<br />
                  **Gló[D]ria [A7]a Deus!**
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-800 mb-2">
                🎼 Seções Especiais
              </h3>
              <div className="text-sm space-y-2">
                <p className="text-gray-600">
                  Intro, Bridge, Ponte, Solo, etc.
                </p>
                <div className="bg-white p-2 rounded text-xs font-mono border border-purple-100">
                  Intro:<br />
                  [A][Em][G][C]
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <h3 className="font-semibold mb-3 text-gray-900">✨ Funcionalidades Automáticas</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <ul className="space-y-1">
                <li>• <strong>Detecção automática:</strong> O sistema detecta o formato automaticamente</li>
                <li>• <strong>Formato misto:</strong> Podes combinar inline com intro/ponte na mesma música</li>
                <li>• <strong>Acordes suportados:</strong> C, Am, F#, Cmaj7, D/F#, etc.</li>
              </ul>
              <ul className="space-y-1">
                <li>• <strong>Seções especiais:</strong> Intro:, Bridge:, Ponte:, Solo:, Outro:</li>
                <li>• <strong>Visual limpo:</strong> Acordes destacados sem sobreposição</li>
                <li>• <strong>Responsivo:</strong> Funciona bem em mobile e desktop</li>
              </ul>
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <h3 className="font-semibold text-amber-800 mb-2">💡 Exemplo Completo</h3>
            <div className="bg-white p-3 rounded text-xs font-mono border border-amber-100">
              <pre>{`Intro:
[A][Em][G][C]

Bridge:
[F][C][G][Am]

[C][Am][F][G]
Santo, santo, santo
[G][Am][F][C]
Hosana nas alturas`}</pre>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-600">
              Podes combinar todos os formatos na mesma música!
            </div>
            <div className="flex gap-2">
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
