// @ts-nocheck
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ExportMassModalProps {
  open: boolean;
  onClose: () => void;
  mass: any;
}

// Render lyrics for all moments
function renderLyrics(mass: any) {
  if (!mass.items || mass.items.length === 0) return <p className="text-center text-gray-500">Nenhuma música adicionada.</p>;
  const moments = Array.from(new Set(mass.items.map((item: any) => item.moment)));
  return (
    <div className="space-y-6">
      {moments.map(moment => (
        <div key={moment} className="">
          <h3 className="font-semibold text-lg mb-2">{moment}</h3>
          <div className="space-y-4">
            {mass.items.filter((item: any) => item.moment === moment).map((item: any) => (
              <div key={item.id} className="">
                <div className="font-medium text-blue-900 mb-1">{item.song?.title || 'Música desconhecida'}</div>
                {item.song?.lyrics && (
                  <pre className="bg-gray-100 rounded p-2 text-sm whitespace-pre-wrap">{item.song.lyrics}</pre>
                )}
                {item.note && (
                  <div className="text-xs text-gray-500 mt-1">{item.note}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ExportMassModal({ open, onClose, mass }: ExportMassModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Exportar letras da missa</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          {renderLyrics(mass)}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
