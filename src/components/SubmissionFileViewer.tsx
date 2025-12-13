'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  Music, 
  Download,
  Play,
  Pause,
  Loader2,
  AlertCircle,
  Edit2,
  Check,
  X,
  Trash2
} from 'lucide-react';
import { formatFileSize } from '@/types/song-files';
import { toast } from 'sonner';

interface SubmissionFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  signedUrl: string | null;
  uploadedAt: string;
  storageKey: string;
  description?: string;
}

interface SubmissionFileViewerProps {
  submissionId: string;
  onDescriptionChange?: (storageFileName: string, description: string, originalFileName: string) => void;
  onFileDelete?: (fileId: string, storageKey: string) => Promise<void>;
}

export function SubmissionFileViewer({ submissionId, onDescriptionChange, onFileDelete }: SubmissionFileViewerProps) {
  const [files, setFiles] = useState<SubmissionFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [viewingPdf, setViewingPdf] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch(`/api/admin/submission/${submissionId}/files`);
        if (response.ok) {
          const data = await response.json();
          const loadedFiles = data.files || [];
          setFiles(loadedFiles);
          
          // Notificar o componente pai sobre as descrições iniciais
          if (onDescriptionChange) {
            loadedFiles.forEach((file: SubmissionFile) => {
              if (file.description) {
                const storageFileName = file.storageKey.split('/').pop() || file.fileName;
                onDescriptionChange(storageFileName, file.description, file.fileName);
              }
            });
          }
        } else {
          toast.error('Erro ao carregar ficheiros');
        }
      } catch (error) {
        console.error('Erro ao buscar ficheiros:', error);
        toast.error('Erro ao carregar ficheiros');
      } finally {
        setLoading(false);
      }
    };

    if (submissionId) {
      fetchFiles();
    }
  }, [submissionId, onDescriptionChange]);

  const pdfs = files.filter(f => f.fileType === 'PDF');
  const audios = files.filter(f => f.fileType === 'AUDIO');

  const handleEditDescription = (fileId: string, currentDescription: string = '') => {
    setEditingId(fileId);
    setEditDescription(currentDescription);
  };

  const handleSaveDescription = (fileId: string) => {
    // Encontrar o ficheiro para obter o storageKey
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    
    // Extrair o nome do ficheiro do storageKey (última parte do path)
    const storageFileName = file.storageKey.split('/').pop() || file.fileName;
    
    // Atualizar no estado local
    setFiles(prevFiles => 
      prevFiles.map(f => 
        f.id === fileId ? { ...f, description: editDescription } : f
      )
    );

    // Notificar componente pai se callback fornecido
    if (onDescriptionChange) {
      onDescriptionChange(storageFileName, editDescription, file.fileName);
    }

    setEditingId(null);
    setEditDescription('');
    toast.success('Descrição atualizada');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDescription('');
  };

  const handlePlayPause = (fileId: string, url: string) => {
    const audio = audioRefs.current.get(fileId);
    
    if (!audio) {
      const newAudio = new Audio(url);
      audioRefs.current.set(fileId, newAudio);
      newAudio.play();
      setPlayingAudio(fileId);
      
      newAudio.onended = () => {
        setPlayingAudio(null);
      };
      
      return;
    }

    if (playingAudio === fileId) {
      audio.pause();
      setPlayingAudio(null);
    } else {
      // Pausar todos os outros
      audioRefs.current.forEach((a, id) => {
        if (id !== fileId) {
          a.pause();
        }
      });
      
      audio.play();
      setPlayingAudio(fileId);
    }
  };

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
  };

  const handleDelete = async (file: SubmissionFile) => {
    if (!submissionId) return;
    
    setDeletingId(file.id);
    try {
      const response = await fetch(
        `/api/admin/submission/${submissionId}/files/${file.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Erro ao apagar ficheiro');
      }

      // Remove file from local state
      setFiles(prevFiles => prevFiles.filter(f => f.id !== file.id));

      // Call parent callback if provided
      if (onFileDelete) {
        await onFileDelete(file.id, file.storageKey);
      }
      
      toast.success('Ficheiro apagado com sucesso');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Erro ao apagar ficheiro');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFileUpload = async (selectedFiles: FileList) => {
    if (!submissionId || selectedFiles.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(selectedFiles).forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(
        `/api/admin/submission/${submissionId}/files`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao enviar ficheiros');
      }

      const data = await response.json();
      setFiles(prevFiles => [...prevFiles, ...(data.files || [])]);
      toast.success('Ficheiros enviados com sucesso');

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Erro ao enviar ficheiros');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium">Nenhum ficheiro encontrado</p>
          <p className="text-sm text-gray-500 mt-1">
            Esta submissão não tem ficheiros anexados
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Button */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Adicionar Ficheiros
            </>
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.mp3"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
        />
      </div>

      {/* PDFs */}
      {pdfs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-600" />
              Partituras (PDFs)
            </CardTitle>
            <CardDescription>
              {pdfs.length} ficheiro{pdfs.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pdfs.map((file) => (
              <div key={file.id}>
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Ícone */}
                      <div className="p-3 rounded-lg bg-red-50 shrink-0">
                        <FileText className="w-6 h-6 text-red-600" />
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {file.fileName}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatFileSize(file.fileSize)}
                        </p>

                        {/* Descrição editável */}
                        {editingId === file.id ? (
                          <div className="mt-3 space-y-2">
                            <Label className="text-xs">Descrição</Label>
                            <div className="flex gap-2">
                              <Input
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Adicionar descrição..."
                                className="text-sm h-8"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveDescription(file.id);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => handleSaveDescription(file.id)}
                              >
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={handleCancelEdit}
                              >
                                <X className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2">
                            {file.description ? (
                              <p className="text-sm text-gray-700 italic">
                                "{file.description}"
                              </p>
                            ) : (
                              <p className="text-xs text-gray-400">
                                Sem descrição
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="flex flex-col gap-2 shrink-0">
                        {editingId !== file.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditDescription(file.id, file.description)}
                            title="Editar descrição"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingPdf(viewingPdf === file.signedUrl ? null : file.signedUrl)}
                        >
                          {viewingPdf === file.signedUrl ? 'Fechar' : 'Ver PDF'}
                        </Button>
                        {file.signedUrl && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(file.signedUrl!, file.fileName)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(file)}
                          disabled={deletingId === file.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {deletingId === file.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Visualizador de PDF */}
                {viewingPdf === file.signedUrl && file.signedUrl && (
                  <Card className="mt-2">
                    <CardContent className="p-0">
                      <iframe
                        src={file.signedUrl}
                        className="w-full h-[600px] border-0"
                        title={`Preview de ${file.fileName}`}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Áudios */}
      {audios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5 text-blue-600" />
              Ficheiros de Áudio
            </CardTitle>
            <CardDescription>
              {audios.length} ficheiro{audios.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {audios.map((file) => (
              <Card key={file.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Ícone */}
                    <div className="p-3 rounded-lg bg-blue-50 shrink-0">
                      <Music className="w-6 h-6 text-blue-600" />
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {file.fileName}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatFileSize(file.fileSize)}
                      </p>

                      {/* Descrição editável */}
                      {editingId === file.id ? (
                        <div className="mt-3 space-y-2">
                          <Label className="text-xs">Descrição</Label>
                          <div className="flex gap-2">
                            <Input
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              placeholder="Adicionar descrição..."
                              className="text-sm h-8"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveDescription(file.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleSaveDescription(file.id)}
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={handleCancelEdit}
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2">
                          {file.description ? (
                            <p className="text-sm text-gray-700 italic">
                              "{file.description}"
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400">
                              Sem descrição
                            </p>
                          )}
                        </div>
                      )}

                      {/* Player de áudio nativo */}
                      {file.signedUrl && editingId !== file.id && (
                        <div className="mt-3">
                          <audio controls className="w-full" style={{ maxHeight: '40px' }}>
                            <source src={file.signedUrl} type="audio/mpeg" />
                            O seu browser não suporta o elemento de áudio.
                          </audio>
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col gap-2 shrink-0">
                      {editingId !== file.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditDescription(file.id, file.description)}
                          title="Editar descrição"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                      {file.signedUrl && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(file.signedUrl!, file.fileName)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(file)}
                        disabled={deletingId === file.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deletingId === file.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
