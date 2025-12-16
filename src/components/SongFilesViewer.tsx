'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Music, 
  Download, 
  ExternalLink, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { 
  FileType, 
  FileTypeLabels, 
  FileTypeIcons,
  SongFileWithUrl,
  formatFileSize,
  isPdfFileType,
  isAudioFileType
} from '@/types/song-files';
import { toast } from 'sonner';

interface SongFilesViewerProps {
  songId: string;
  showTitle?: boolean;
  className?: string;
}

export function SongFilesViewer({ songId, showTitle = true, className = '' }: SongFilesViewerProps) {
  const [files, setFiles] = useState<SongFileWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, [songId]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/songs/${songId}/files`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar ficheiros');
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: SongFileWithUrl) => {
    if (!file.signedUrl) {
      toast.error('URL de download não disponível');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = file.signedUrl;
      link.download = file.fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`A fazer download de ${file.fileName}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erro ao fazer download');
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">A carregar ficheiros...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (files.length === 0) {
    return null; // Não mostrar nada se não houver ficheiros
  }

  const pdfFiles = files.filter(f => isPdfFileType(f.fileType as FileType));
  const audioFiles = files.filter(f => isAudioFileType(f.fileType as FileType));

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Partituras e Áudio
          </CardTitle>
          <CardDescription>
            Downloads disponíveis para esta música
          </CardDescription>
        </CardHeader>
      )}
      <CardContent>
        <Tabs defaultValue={pdfFiles.length > 0 ? 'pdfs' : 'audio'} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pdfs" disabled={pdfFiles.length === 0}>
              <FileText className="h-4 w-4 mr-2" />
              Partituras ({pdfFiles.length})
            </TabsTrigger>
            <TabsTrigger value="audio" disabled={audioFiles.length === 0}>
              <Music className="h-4 w-4 mr-2" />
              Áudio ({audioFiles.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pdfs" className="space-y-3 mt-4">
            {pdfFiles.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma partitura disponível
              </p>
            ) : (
              pdfFiles.map(file => (
                <div 
                  key={file.id} 
                  className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <span className="text-2xl">{FileTypeIcons[file.fileType as FileType]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {file.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        PDF
                      </Badge>
                      {file.fileSize && (
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(file.fileSize)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDownload(file)}
                      disabled={!file.signedUrl}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {file.signedUrl && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        asChild
                      >
                        <a href={file.signedUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="audio" className="space-y-3 mt-4">
            {audioFiles.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum ficheiro de áudio disponível
              </p>
            ) : (
              audioFiles.map(file => (
                <div 
                  key={file.id} 
                  className="flex flex-col gap-3 p-4 border rounded-lg bg-linear-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{FileTypeIcons[file.fileType as FileType]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {file.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          MP3
                        </Badge>
                        {file.fileSize && (
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(file.fileSize)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDownload(file)}
                      disabled={!file.signedUrl}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  {file.signedUrl && (
                    <audio controls className="w-full">
                      <source src={file.signedUrl} type="audio/mpeg" />
                      O seu navegador não suporta o elemento de áudio.
                    </audio>
                  )}
                  {!file.signedUrl && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        URL de áudio não disponível
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
