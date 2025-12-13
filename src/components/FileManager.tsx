'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileType, 
  FileUploadData,
  formatFileSize,
} from '@/types/song-files';
import { 
  Upload, 
  X, 
  FileText, 
  Music, 
  Check, 
  AlertCircle, 
  Trash2, 
  Edit2,
  Download,
  Play,
  Pause
} from 'lucide-react';
import { toast } from 'sonner';

interface FileManagerProps {
  songId?: string;
  mode?: 'create' | 'edit'; // create: não faz upload automático | edit: upload automático
  maxPdfs?: number;
  maxAudios?: number;
  onChange?: (files: FileUploadData[]) => void; // Para modo create
  onUpload?: (file: FileUploadData) => Promise<void>; // Para modo edit
  onDelete?: (fileId: string) => Promise<void>; // Para modo edit
  onUpdateDescription?: (fileId: string, newDescription: string) => Promise<void>;
  onlyPdf?: boolean; // Se true, só permite upload de PDFs (para partitura)
}

export function FileManager({ 
  songId,
  mode = 'create',
  maxPdfs = 10,
  maxAudios = 10,
  onChange,
  onUpload,
  onDelete,
  onUpdateDescription,
  onlyPdf = false
}: FileManagerProps) {
  const [files, setFiles] = useState<FileUploadData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Buscar ficheiros existentes em modo edit
  useEffect(() => {
    if (mode === 'edit' && songId) {
      const fetchFiles = async () => {
        try {
          const response = await fetch(`/api/admin/songs/${songId}/files`);
          if (response.ok) {
            const data = await response.json();
            if (data.files) {
              const mappedFiles: FileUploadData[] = data.files.map((f: any) => ({
                id: f.id,
                fileType: f.fileType,
                fileName: f.fileName,
                description: f.description,
                fileSize: f.fileSize,
                signedUrl: f.signedUrl,
                uploadedAt: f.uploadedAt,
                isMainPdf: f.isPrincipal, // Mapear isPrincipal do servidor para isMainPdf
                file: null as any, // Não temos o File object em modo edit
                uploading: false,
                uploaded: true
              }));
              setFiles(mappedFiles);
            }
          }
        } catch (error) {
          console.error('Erro ao buscar ficheiros:', error);
          toast.error('Erro ao carregar ficheiros');
        } finally {
          setIsLoading(false);
        }
      };
      fetchFiles();
    }
  }, [mode, songId]);

  const pdfs = files.filter(f => f.fileType === FileType.PDF);
  const audios = files.filter(f => f.fileType === FileType.AUDIO);

  // Validação rigorosa de PDFs usando magic bytes (anti-XSS)
  const validatePDF = async (file: File): Promise<boolean> => {
    try {
      // Verificar extensão e MIME type
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        return false;
      }
      if (file.type !== 'application/pdf' && file.type !== '') {
        return false;
      }

      // Ler os primeiros bytes para verificar PDF magic bytes: %PDF-
      const buffer = await file.slice(0, 5).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const magicString = String.fromCharCode(...bytes);
      
      return magicString === '%PDF-';
    } catch (error) {
      console.error('Erro ao validar PDF:', error);
      return false;
    }
  };

  // Validação rigorosa de áudio usando magic bytes (anti-XSS)
  const validateAudio = async (file: File): Promise<boolean> => {
    try {
      // Verificar extensão
      const ext = file.name.toLowerCase();
      const validExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
      if (!validExtensions.some(e => ext.endsWith(e))) {
        return false;
      }

      // Verificar MIME type
      const validMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac'];
      if (file.type && !validMimes.includes(file.type)) {
        return false;
      }

      // Ler os primeiros bytes para verificar magic bytes de áudio
      const buffer = await file.slice(0, 12).arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // MP3: ID3 (0x49 0x44 0x33) ou MPEG Frame Sync (0xFF 0xFB ou 0xFF 0xF3)
      if ((bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || // ID3
          (bytes[0] === 0xFF && (bytes[1] === 0xFB || bytes[1] === 0xF3 || bytes[1] === 0xF2))) { // MPEG
        return true;
      }

      // WAV: RIFF (0x52 0x49 0x46 0x46)
      if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
        return true;
      }

      // OGG: OggS (0x4F 0x67 0x67 0x53)
      if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
        return true;
      }

      // M4A/AAC: ftyp (0x66 0x74 0x79 0x70) at position 4
      if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro ao validar áudio:', error);
      return false;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: FileType) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const currentCount = type === FileType.PDF ? pdfs.length : audios.length;
    const maxCount = type === FileType.PDF ? maxPdfs : maxAudios;

    if (currentCount + selectedFiles.length > maxCount) {
      toast.error(`Máximo de ${maxCount} ${type === FileType.PDF ? 'PDFs' : 'áudios'}`);
      return;
    }

    // Validar e processar todos os ficheiros
    const validFiles: FileUploadData[] = [];
    
    for (const file of selectedFiles) {
      const isPdf = type === FileType.PDF;
      
      // Validação rigorosa com magic bytes
      let isValid = false;
      if (isPdf) {
        isValid = await validatePDF(file);
        if (!isValid) {
          toast.error(`${file.name} não é um PDF válido (proteção anti-XSS)`);
          continue;
        }
      } else {
        isValid = await validateAudio(file);
        if (!isValid) {
          toast.error(`${file.name} não é um ficheiro de áudio válido (proteção anti-XSS)`);
          continue;
        }
      }

      // Validar tamanho
      const maxSize = isPdf ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`${file.name} é muito grande (max: ${maxSize / 1024 / 1024}MB)`);
        continue;
      }

      // Adicionar à lista de ficheiros válidos
      const newFile: FileUploadData = {
        file,
        fileType: type,
        description: '', // Descrição será adicionada depois
        fileName: file.name,
        fileSize: file.size,
        uploadProgress: 0,
        isUploading: false,
      };
      
      validFiles.push(newFile);
    }

    // Se não há ficheiros válidos, retornar
    if (validFiles.length === 0) {
      toast.error('Nenhum ficheiro válido selecionado');
      return;
    }

    // Processar todos os ficheiros válidos
    if (mode === 'create') {
      // Modo create: adiciona todos à lista local de uma vez
      const updatedFiles = [...files, ...validFiles];
      setFiles(updatedFiles);
      onChange?.(updatedFiles);
      toast.success(`${validFiles.length} ficheiro(s) adicionado(s)`);
    } else if (mode === 'edit') {
      // Modo edit: faz upload de todos
      toast.info(`A carregar ${validFiles.length} ficheiro(s)...`);
      
      let successCount = 0;
      let errorCount = 0;

      for (const newFile of validFiles) {
        if (onUpload) {
          try {
            newFile.isUploading = true;
            setFiles(prev => [...prev, newFile]);
            await onUpload(newFile);
            successCount++;
          } catch (error) {
            errorCount++;
            setFiles(prev => prev.filter(f => f !== newFile));
          }
        } else if (songId) {
          // Upload default usando API
          try {
            newFile.isUploading = true;
            setFiles(prev => [...prev, newFile]);

            const formData = new FormData();
            formData.append('file', newFile.file);
            formData.append('fileType', type);
            formData.append('description', `Ficheiro ${newFile.fileName}`);

            const response = await fetch(`/api/admin/songs/${songId}/files`, {
              method: 'POST',
              body: formData
            });

            if (!response.ok) throw new Error('Upload failed');
            
            const result = await response.json();
            
            // Atualizar com dados do servidor
            setFiles(prev => prev.map(f => 
              f === newFile ? {
                ...f,
                id: result.file.id,
                isUploading: false,
                uploaded: true,
                uploadedAt: result.file.uploadedAt
              } : f
            ));
            
            successCount++;
          } catch (error) {
            errorCount++;
            setFiles(prev => prev.filter(f => f !== newFile));
          }
        }
      }

      // Mostrar resultado final
      if (successCount > 0) {
        toast.success(`${successCount} ficheiro(s) carregado(s) com sucesso!`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} ficheiro(s) falharam`);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpdateDescription = async (fileId: string, newDesc: string) => {
    const trimmed = newDesc.trim();
    if (!trimmed) {
      toast.error('Descrição não pode estar vazia');
      return;
    }

    if (mode === 'create') {
      // Modo create: atualiza localmente
      const updatedFiles = files.map(f =>
        (f.id || f.fileName) === fileId ? { ...f, description: trimmed } : f
      );
      setFiles(updatedFiles);
      onChange?.(updatedFiles);
      setEditingId(null);
      toast.success('Descrição atualizada');
    } else if (mode === 'edit') {
      if (onUpdateDescription) {
        // Usa callback custom
        try {
          await onUpdateDescription(fileId, trimmed);
          const updatedFiles = files.map(f =>
            f.id === fileId ? { ...f, description: trimmed } : f
          );
          setFiles(updatedFiles);
          setEditingId(null);
          toast.success('Descrição atualizada');
        } catch (error) {
          toast.error('Erro ao atualizar descrição');
        }
      } else if (songId) {
        // Update default usando PATCH (precisa criar endpoint)
        try {
          const response = await fetch(`/api/admin/songs/${songId}/files/${fileId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: trimmed })
          });

          if (!response.ok) throw new Error('Update failed');
          
          const updatedFiles = files.map(f =>
            f.id === fileId ? { ...f, description: trimmed } : f
          );
          setFiles(updatedFiles);
          setEditingId(null);
          toast.success('Descrição atualizada');
        } catch (error) {
          toast.error('Erro ao atualizar descrição');
        }
      }
    }
  };

  const handleDelete = async (fileId: string) => {
    if (mode === 'create') {
      // Modo create: remove localmente
      const updatedFiles = files.filter(f => (f.id || f.fileName) !== fileId);
      setFiles(updatedFiles);
      onChange?.(updatedFiles);
      toast.success('Ficheiro removido');
    } else if (mode === 'edit') {
      if (onDelete) {
        // Usa callback custom
        try {
          await onDelete(fileId);
          setFiles(prev => prev.filter(f => f.id !== fileId));
          toast.success('Ficheiro eliminado');
        } catch (error) {
          toast.error('Erro ao eliminar ficheiro');
        }
      } else if (songId) {
        // Delete default usando API
        try {
          const response = await fetch(`/api/admin/songs/${songId}/files/${fileId}`, {
            method: 'DELETE'
          });

          if (!response.ok) throw new Error('Delete failed');
          
          setFiles(prev => prev.filter(f => f.id !== fileId));
          toast.success('Ficheiro eliminado');
        } catch (error) {
          toast.error('Erro ao eliminar ficheiro');
        }
      }
    }
  };

  const startEditing = (file: FileUploadData) => {
    setEditingId(file.id || file.fileName || '');
    setEditDescription(file.description);
  };

  const toggleAudioPlay = (fileId: string, url?: string) => {
    if (!url) return;

    if (playingAudio === fileId) {
      const audio = audioRefs.current.get(fileId);
      audio?.pause();
      setPlayingAudio(null);
    } else {
      // Pausar outros áudios
      audioRefs.current.forEach((audio, id) => {
        if (id !== fileId) audio.pause();
      });

      let audio = audioRefs.current.get(fileId);
      if (!audio) {
        audio = new Audio(url);
        audio.addEventListener('ended', () => setPlayingAudio(null));
        audioRefs.current.set(fileId, audio);
      }
      audio.play();
      setPlayingAudio(fileId);
    }
  };

  const renderFileCard = (file: FileUploadData, index: number) => {
    const fileId = file.id || file.fileName || `file-${index}`;
    const isEditing = editingId === fileId;
    const isPdf = file.fileType === FileType.PDF;
    const Icon = isPdf ? FileText : Music;

    return (
      <Card key={fileId} className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Ícone */}
            <div className={`p-3 rounded-lg ${isPdf ? 'bg-red-50' : 'bg-blue-50'}`}>
              <Icon className={`w-6 h-6 ${isPdf ? 'text-red-600' : 'text-blue-600'}`} />
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              {/* Nome do ficheiro */}
              <div className="flex items-center gap-2 mb-2">
                <p className="font-medium text-sm truncate">{file.fileName}</p>
                <Badge variant="outline" className="text-xs shrink-0">
                  {file.fileType}
                </Badge>
              </div>

              {/* Descrição */}
              {isEditing ? (
                <div className="space-y-2 mb-2">
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Descrição (ex: Partitura Completa, Playback)"
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleUpdateDescription(fileId, editDescription)}
                      className="h-7 text-xs"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      className="h-7 text-xs"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mb-2">
                  <p className={`text-sm ${!file.description || !file.description.trim() ? 'text-orange-600 flex items-center gap-1' : 'text-muted-foreground'}`}>
                    {!file.description || !file.description.trim() ? (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        Adicione uma descrição!
                      </>
                    ) : (
                      file.description
                    )}
                  </p>
                </div>
              )}

              {/* Tamanho */}
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.fileSize || 0)}
              </p>

              {/* Progress (se estiver a fazer upload) */}
              {file.isUploading && (
                <div className="mt-2">
                  <Progress value={file.uploadProgress || 0} className="h-1" />
                  <p className="text-xs text-muted-foreground mt-1">
                    A carregar... {file.uploadProgress || 0}%
                  </p>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex flex-col gap-1 shrink-0">
              {/* Botão Play (só para áudio) */}
              {!isPdf && file.signedUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleAudioPlay(fileId, file.signedUrl)}
                  className="h-8 w-8 p-0"
                >
                  {playingAudio === fileId ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              )}

              {/* Botão Download */}
              {file.signedUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  asChild
                  className="h-8 w-8 p-0"
                >
                  <a href={file.signedUrl} download={file.fileName}>
                    <Download className="w-4 h-4" />
                  </a>
                </Button>
              )}

              {/* Botão Marcar como Principal (só para PDFs) */}
              {isPdf && (
                <Button
                  size="sm"
                  variant={file.isMainPdf ? "default" : "outline"}
                  onClick={async () => {
                    try {
                      // Em modo edit com songId, fazer update no servidor
                      if (mode === 'edit' && songId && file.id) {
                        const response = await fetch(`/api/admin/songs/${songId}/files`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            fileId: file.id,
                            isPrincipal: !file.isMainPdf
                          })
                        });
                        
                        if (!response.ok) {
                          toast.error('Erro ao atualizar ficheiro');
                          return;
                        }
                      }
                      
                      // Atualizar localmente
                      const updatedFiles = files.map((f, idx) => ({
                        ...f,
                        isMainPdf: (f.id || f.fileName) === (file.id || file.fileName)
                      }));
                      setFiles(updatedFiles);
                      onChange?.(updatedFiles);
                      toast.success(file.isMainPdf ? 'Removido como principal' : 'Marcado como principal');
                    } catch (error) {
                      console.error('Erro ao marcar como principal:', error);
                      toast.error('Erro ao atualizar ficheiro');
                    }
                  }}
                  className="h-8 px-2 text-xs"
                  title={file.isMainPdf ? "Remover como principal" : "Marcar como principal"}
                >
                  {file.isMainPdf ? "★ Principal" : "☆ Principal"}
                </Button>
              )}

              {/* Botão Editar */}
              {!file.isUploading && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => startEditing(file)}
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}

              {/* Botão Eliminar */}
              {!file.isUploading && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(fileId)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
              <p className="text-sm text-muted-foreground">A carregar ficheiros...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Secção PDFs */}
      {!isLoading && (
      <>
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold">Partituras (PDFs)</h3>
            <p className="text-sm text-muted-foreground">
              {pdfs.length}/{maxPdfs} ficheiros • Máx: 50MB cada
            </p>
          </div>
          <Button
            onClick={() => {
              fileInputRef.current?.click();
            }}
            disabled={pdfs.length >= maxPdfs}
            size="sm"
          >
            <Upload className="w-4 h-4 mr-2" />
            Adicionar PDFs
          </Button>
        </div>

        {pdfs.length > 0 ? (
          <div className="grid gap-3">
            {pdfs.map((file, idx) => renderFileCard(file, idx))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum PDF adicionado
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Secção Áudios */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold">Áudios (MP3)</h3>
            <p className="text-sm text-muted-foreground">
              {audios.length}/{maxAudios} ficheiros • Máx: 20MB cada
            </p>
          </div>
          <Button
            onClick={() => {
              audioInputRef.current?.click();
            }}
            disabled={audios.length >= maxAudios}
            size="sm"
          >
            <Upload className="w-4 h-4 mr-2" />
            Adicionar Áudios
          </Button>
        </div>

        {audios.length > 0 ? (
          <div className="grid gap-3">
            {audios.map((file, idx) => renderFileCard(file, idx))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Music className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum áudio adicionado
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Inputs ocultos para selecionar ficheiros (separados para segurança) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleFileSelect(e, FileType.PDF)}
      />
      <input
        ref={audioInputRef}
        type="file"
        multiple
        accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4,audio/aac"
        className="hidden"
        onChange={(e) => handleFileSelect(e, FileType.AUDIO)}
      />
      </>
      )}
    </div>
  );
}
