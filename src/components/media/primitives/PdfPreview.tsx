'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Download, ChevronDown, ChevronUp } from 'lucide-react';

interface PdfPreviewProps {
  url: string;
  fileName: string;
}

export function PdfPreview({ url, fileName }: PdfPreviewProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpen(v => !v)}
          className="gap-1.5 text-stone-700 border-stone-200"
        >
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {open ? 'Fechar' : 'Ver partitura'}
        </Button>
        <Button size="sm" variant="outline" asChild className="gap-1.5 text-stone-700 border-stone-200">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir
          </a>
        </Button>
        <Button size="sm" variant="outline" asChild className="gap-1.5 text-stone-700 border-stone-200">
          <a href={url} download={fileName}>
            <Download className="w-3.5 h-3.5" />
            Download
          </a>
        </Button>
      </div>
      {open && (
        <iframe
          src={url}
          className="w-full h-[600px] rounded-lg border border-stone-200"
          title={`Preview de ${fileName}`}
        />
      )}
    </div>
  );
}
