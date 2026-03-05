

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ExportMassPanel from '@/components/ExportMassPanel';

interface ExportOptionsModalProps {
  open: boolean;
  onClose: () => void;
  massId: string;
}

export default function ExportOptionsModal({ open, onClose, massId }: ExportOptionsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="p-0 overflow-visible"
        style={{ width: '96vw', maxWidth: '1800px', minWidth: '0', padding: 0 }}
      >
        {/* DialogTitle para acessibilidade, mas visualmente oculto */}
        <DialogTitle className="sr-only">Exportar Missa</DialogTitle>
        <div
          className="max-h-[90vh] overflow-y-auto px-2 pb-2"
          style={{ width: '100%', minWidth: 0 }}
        >
          <ExportMassPanel massId={massId} onClose={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
