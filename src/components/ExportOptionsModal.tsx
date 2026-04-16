

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
        className="p-0 overflow-hidden"
        style={{ width: '96vw', maxWidth: '680px', minWidth: '0', height: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <DialogTitle className="sr-only">Exportar Missa</DialogTitle>
        <div className="flex-1 overflow-hidden flex flex-col">
          <ExportMassPanel massId={massId} onClose={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
