'use client';

import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Music } from 'lucide-react';
import { FileType, formatFileSize } from '@/types/song-files';

interface FileCardProps {
  fileName: string;
  fileType: FileType;
  fileSize?: number;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function FileCard({ fileName, fileType, fileSize, description, actions, children }: FileCardProps) {
  const isPdf = fileType === FileType.PDF;
  return (
    <Card className="overflow-hidden border border-stone-200 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-3 rounded-lg shrink-0 ${isPdf ? 'bg-red-50' : 'bg-blue-50'}`}>
            {isPdf
              ? <FileText className="w-5 h-5 text-red-600" />
              : <Music className="w-5 h-5 text-blue-600" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-stone-900 truncate text-sm">
              {description?.trim() || fileName}
            </p>
            {description?.trim() && (
              <p className="text-xs text-stone-500 truncate">{fileName}</p>
            )}
            {fileSize != null && (
              <p className="text-xs text-stone-400 mt-0.5">{formatFileSize(fileSize)}</p>
            )}
            {children}
          </div>
          {actions && <div className="shrink-0 flex flex-col gap-1.5">{actions}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
