'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Crown, FileText } from 'lucide-react';

interface SongExportModalProps {
  open: boolean;
  onClose: () => void;
  songTitle: string;
  songId: string;
  transposition: number;
  showChordsDefault: boolean;
}

type FontSize = 'small' | 'medium' | 'large';

const FONT_SIZE_LABELS: Record<FontSize, string> = {
  small: 'Pequeno',
  medium: 'Normal',
  large: 'Grande',
};

export default function SongExportModal({
  open,
  onClose,
  songTitle,
  songId,
  transposition,
  showChordsDefault,
}: SongExportModalProps) {
  const [withChords, setWithChords] = useState(showChordsDefault);
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [isPremium, setIsPremium] = useState(false);

  React.useEffect(() => {
    if (!open) return;
    fetch('/api/user/plan')
      .then(res => res.ok ? res.json() : null)
      .then(data => setIsPremium(Boolean(data?.isPremium)))
      .catch(() => setIsPremium(false));
  }, [open]);

  const handleGenerate = () => {
    const params = new URLSearchParams();
    params.set('transposition', String(transposition));
    params.set('showChords', String(withChords));
    params.set('fontSize', fontSize);
    if (isPremium) params.set('branding', '0');

    const url = `/api/musics/${songId}/pdf?${params.toString()}`;
    window.open(url, '_blank');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xs p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b">
          <div className="p-1.5 rounded-md bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <DialogTitle className="text-base font-semibold">Exportar PDF</DialogTitle>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Song info */}
          <div className="rounded-lg bg-stone-50 border border-stone-200 px-4 py-3 space-y-0.5">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Música</p>
            <p className="font-semibold text-stone-900 text-sm leading-snug">{songTitle}</p>
            {transposition !== 0 && (
              <p className="text-xs text-stone-500 pt-0.5">
                Transposição: {transposition > 0 ? `+${transposition}` : transposition} semitons
              </p>
            )}
          </div>

          {/* Chords toggle */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="pdf-chords" className="text-sm font-medium text-stone-700">
                Incluir acordes
              </Label>
              <p className="text-xs text-stone-400">Mostra os acordes sobre as letras</p>
            </div>
            <Switch id="pdf-chords" checked={withChords} onCheckedChange={setWithChords} />
          </div>

          {/* Font size */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-stone-700">Tamanho da letra</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(FONT_SIZE_LABELS) as FontSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={`rounded-md border py-2 text-xs font-medium transition-all ${
                    fontSize === size
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700'
                  }`}
                >
                  {FONT_SIZE_LABELS[size]}
                </button>
              ))}
            </div>
          </div>

          {isPremium && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <Crown className="h-3.5 w-3.5" />
              Premium ativo: este PDF será exportado sem marca Cantólico.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleGenerate}>
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Gerar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
