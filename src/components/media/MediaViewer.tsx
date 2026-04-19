'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FileText, Music } from 'lucide-react';
import { FileType } from '@/types/song-files';
import { FileCard } from './primitives/FileCard';
import { PdfPreview } from './primitives/PdfPreview';
import { AudioPlayer } from './primitives/AudioPlayer';

interface MediaFile {
  id: string;
  fileType: FileType;
  fileName: string;
  description: string;
  fileSize?: number;
  signedUrl?: string;
}

interface MediaViewerProps {
  files: MediaFile[];
}

export function MediaViewer({ files }: MediaViewerProps) {
  const [activeAudio, setActiveAudio] = useState<string | null>(null);

  const pdfs = files.filter(f => f.fileType === FileType.PDF);
  const audios = files.filter(f => f.fileType === FileType.AUDIO);

  if (pdfs.length === 0 && audios.length === 0) return null;

  return (
    <Tabs defaultValue={pdfs.length > 0 ? 'pdfs' : 'audios'} className="w-full">
      <TabsList className="grid w-full grid-cols-2 h-11">
        <TabsTrigger value="pdfs" disabled={pdfs.length === 0} className="gap-2">
          <FileText className="w-4 h-4" />
          Partituras
          <Badge variant="secondary">{pdfs.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="audios" disabled={audios.length === 0} className="gap-2">
          <Music className="w-4 h-4" />
          Áudios
          <Badge variant="secondary">{audios.length}</Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pdfs" className="space-y-3 mt-4">
        {pdfs.map(f => (
          <FileCard key={f.id} fileName={f.fileName} fileType={f.fileType} fileSize={f.fileSize} description={f.description}>
            {f.signedUrl && <PdfPreview url={f.signedUrl} fileName={f.fileName} />}
          </FileCard>
        ))}
      </TabsContent>

      <TabsContent value="audios" className="space-y-3 mt-4">
        {audios.map(f => (
          <FileCard key={f.id} fileName={f.fileName} fileType={f.fileType} fileSize={f.fileSize} description={f.description}>
            {f.signedUrl && (
              <AudioPlayer
                url={f.signedUrl}
                fileName={f.fileName}
                isActive={activeAudio === f.id}
                onActivate={() => setActiveAudio(f.id)}
                onDeactivate={() => setActiveAudio(null)}
              />
            )}
          </FileCard>
        ))}
      </TabsContent>
    </Tabs>
  );
}
