'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  Trash2, 
  Download,
  Play,
  Pause,
  Star,
  File,
  CheckCircle2,
  AlertCircle
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
  maxPdfs = 20,
  maxAudios = 20,
  onChange,
  onUpload,
  onDelete,
  onUpdateDescription,
  onlyPdf = false
}: FileManagerProps) {
  const [files, setFiles] = useState<FileUploadData[]>([]);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<FileType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const setSaving = (fileId: string, saving: boolean) => {
    setSavingById(prev => ({ ...prev, [fileId]: saving }));
  };

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
                isMainPdf: f.isPrincipal,
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

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent, type: FileType) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragType(type);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragType(null);
  };

  const handleDrop = async (e: React.DragEvent, type: FileType) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragType(null);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    // Simular evento de input para reutilizar a lógica de validação
    const dataTransfer = new DataTransfer();
    droppedFiles.forEach(file => dataTransfer.items.add(file));
    
    const fakeEvent = {
      target: { files: dataTransfer.files }
    } as React.ChangeEvent<HTMLInputElement>;

    await handleFileSelect(fakeEvent, type);
  };

  const renderFileCard = (file: FileUploadData, index: number) => {
    const fileId = file.id || file.fileName || `file-${index}`;
    const isPdf = file.fileType === FileType.PDF;
    const Icon = isPdf ? FileText : Music;
    const isUploading = file.isUploading;
    const hasError = false; // TODO: adicionar estado de erro se necessário

    const handleChangeDescriptionLocal = (newDescription: string) => {
      const updatedFiles = files.map((f, idx) => {
        const id = f.id || f.fileName || `file-${idx}`;
        return id === fileId ? { ...f, description: newDescription } : f;
      });
      setFiles(updatedFiles);
      onChange?.(updatedFiles);
    };

    const persistDescription = async (newDescription: string) => {
      // create: só atualiza estado local
      if (mode === 'create') return;

      // edit: persistir no servidor
      if (songId && file.id) {
        setSaving(fileId, true);
        try {
          if (onUpdateDescription) {
            await onUpdateDescription(file.id, newDescription);
          } else {
            const response = await fetch(`/api/admin/songs/${songId}/files`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileId: file.id, description: newDescription }),
            });
            if (!response.ok) throw new Error('Erro ao atualizar descrição');
          }
        } catch (e) {
          console.error(e);
          toast.error(e instanceof Error ? e.message : 'Erro ao guardar descrição');
        } finally {
          setSaving(fileId, false);
        }
      }
    };

    return (
      <Card 
        key={fileId} 
        className={`group relative overflow-hidden border-2 transition-all duration-200 ${
          isUploading ? 'border-primary bg-primary/5' : 
          hasError ? 'border-destructive bg-destructive/5' :
          'border-border hover:border-primary/50 hover:shadow-lg'
        }`}
      >
        {/* Upload Progress Overlay */}
        {isUploading && file.uploadProgress !== undefined && (
          <div className="absolute inset-0 bg-primary/5 z-10 pointer-events-none">
            <div 
              className="h-full bg-linear-to-r from-primary/20 to-primary/10 transition-all duration-300"
              style={{ width: `${file.uploadProgress}%` }}
            />
          </div>
        )}

        <CardContent className="p-4 sm:p-5 relative z-20">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            {/* Icon with visual feedback */}
            <div className={`relative p-3 rounded-xl transition-all duration-200 ${
              isPdf 
                ? 'bg-linear-to-br from-red-50 to-red-100 group-hover:from-red-100 group-hover:to-red-200' 
                : 'bg-linear-to-br from-blue-50 to-blue-100 group-hover:from-blue-100 group-hover:to-blue-200'
            }`}>
              <Icon className={`w-5 h-5 ${isPdf ? 'text-red-600' : 'text-blue-600'}`} />
              
              {/* Status indicator */}
              {file.uploaded && !isUploading && (
                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              )}
              {isUploading && (
                <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1 animate-pulse">
                  <Upload className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Header */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                    <h4 className="font-semibold text-sm sm:text-base truncate mb-1">{file.fileName}</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-xs font-medium ${isPdf ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {file.fileType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.fileSize || 0)}
                      </span>
                      {file.isMainPdf && (
                        <Badge variant="default" className="text-xs">
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          Principal
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {!isPdf && file.signedUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleAudioPlay(fileId, file.signedUrl)}
                        className="h-10 w-10 sm:h-9 sm:w-9 p-0 hover:bg-primary/10 hover:text-primary touch-manipulation"
                      >
                        {playingAudio === fileId ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    
                    {file.signedUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        asChild
                        className="h-10 w-10 sm:h-9 sm:w-9 p-0 hover:bg-primary/10 hover:text-primary touch-manipulation"
                      >
                        <a href={file.signedUrl} download={file.fileName}>
                          <Download className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    
                    {!isUploading && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(fileId)}
                        className="h-10 w-10 sm:h-9 sm:w-9 p-0 hover:bg-destructive/10 hover:text-destructive touch-manipulation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Description field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Descrição
                  </Label>
                  {savingById[fileId] && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      A guardar
                    </span>
                  )}
                </div>
                <Input
                  value={file.description || ''}
                  onChange={(e) => handleChangeDescriptionLocal(e.target.value)}
                  onBlur={(e) => persistDescription(e.target.value)}
                  placeholder="Ex: Versão simplificada, arranjo coral..."
                  className={`h-9 transition-all ${
                    !file.description || !file.description.trim() 
                      ? 'border-amber-300 bg-amber-50/40 focus:border-amber-400' 
                      : 'focus:border-primary'
                  }`}
                  disabled={isUploading}
                />
              </div>

              {/* Upload progress */}
              {isUploading && file.uploadProgress !== undefined && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">A carregar ficheiro...</span>
                    <span className="font-medium text-primary">{file.uploadProgress}%</span>
                  </div>
                  <Progress value={file.uploadProgress} className="h-2" />
                </div>
              )}

              {/* Principal button for PDFs */}
              {isPdf && !isUploading && (
                <Button
                  size="sm"
                  variant={file.isMainPdf ? "default" : "outline"}
                  className="h-9 sm:h-8 text-xs gap-1.5 touch-manipulation w-full sm:w-auto"
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
                        isMainPdf: file.isMainPdf 
                          ? false // Se clicou no principal, desmarcar todos
                          : (f.id || f.fileName) === (file.id || file.fileName) // Senão, marcar apenas este
                      }));
                      setFiles(updatedFiles);
                      onChange?.(updatedFiles);
                      toast.success(file.isMainPdf ? 'Removido como principal' : 'Marcado como principal');
                    } catch (error) {
                      console.error('Erro ao marcar como principal:', error);
                      toast.error('Erro ao atualizar ficheiro');
                    }
                  }}
                >
                  <Star className={`w-3.5 h-3.5 ${file.isMainPdf ? 'fill-current' : ''}`} />
                  {file.isMainPdf ? "Principal" : "Marcar principal"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      {/* Loading State */}
      {isLoading && (
        <Card className="border-2">
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-muted-foreground">A carregar ficheiros...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Secção PDFs */}
      {!isLoading && (
      <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <div className="p-2 rounded-lg bg-red-50">
                <FileText className="w-5 h-5 text-red-600" />
              </div>
              Partituras (PDFs)
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {pdfs.length} de {maxPdfs} ficheiros • Máximo 50MB por ficheiro
            </p>
          </div>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={pdfs.length >= maxPdfs}
            size="lg"
            className="gap-2 w-full sm:w-auto touch-manipulation"
          >
            <Upload className="w-4 h-4" />
            Adicionar PDFs
          </Button>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => handleDragOver(e, FileType.PDF)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, FileType.PDF)}
          className={`
            relative border-2 border-dashed rounded-xl p-6 sm:p-8 transition-all duration-200
            ${isDragging && dragType === FileType.PDF
              ? 'border-red-500 bg-red-50 scale-[1.02]' 
              : 'border-border hover:border-red-300 hover:bg-red-50/30'
            }
            ${pdfs.length >= maxPdfs ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onClick={() => {
            if (pdfs.length < maxPdfs) fileInputRef.current?.click();
          }}
        >
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className={`p-4 rounded-2xl transition-all ${
              isDragging && dragType === FileType.PDF 
                ? 'bg-red-100 scale-110' 
                : 'bg-red-50'
            }`}>
              <FileText className={`w-10 h-10 transition-colors ${
                isDragging && dragType === FileType.PDF 
                  ? 'text-red-700' 
                  : 'text-red-500'
              }`} />
            </div>
            <div>
              <p className="font-medium text-sm sm:text-base mb-1">
                {isDragging && dragType === FileType.PDF 
                  ? 'Solte os ficheiros aqui' 
                  : 'Arraste PDFs aqui ou clique para selecionar'
                }
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Suporta múltiplos ficheiros • Máx: 50MB cada
              </p>
            </div>
          </div>
        </div>

        {/* PDF Files List */}
        {pdfs.length > 0 && (
          <div className="grid gap-4">
            {pdfs.map((file, idx) => renderFileCard(file, idx))}
          </div>
        )}
      </div>

      {/* Secção Áudios */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50">
                <Music className="w-5 h-5 text-blue-600" />
              </div>
              Áudios (MP3)
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {audios.length} de {maxAudios} ficheiros • Máximo 20MB por ficheiro
            </p>
          </div>
          <Button
            onClick={() => audioInputRef.current?.click()}
            disabled={audios.length >= maxAudios}
            size="lg"
            className="gap-2 w-full sm:w-auto touch-manipulation"
          >
            <Upload className="w-4 h-4" />
            Adicionar Áudios
          </Button>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => handleDragOver(e, FileType.AUDIO)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, FileType.AUDIO)}
          className={`
            relative border-2 border-dashed rounded-xl p-6 sm:p-8 transition-all duration-200
            ${isDragging && dragType === FileType.AUDIO
              ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
              : 'border-border hover:border-blue-300 hover:bg-blue-50/30'
            }
            ${audios.length >= maxAudios ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onClick={() => {
            if (audios.length < maxAudios) audioInputRef.current?.click();
          }}
        >
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className={`p-4 rounded-2xl transition-all ${
              isDragging && dragType === FileType.AUDIO 
                ? 'bg-blue-100 scale-110' 
                : 'bg-blue-50'
            }`}>
              <Music className={`w-10 h-10 transition-colors ${
                isDragging && dragType === FileType.AUDIO 
                  ? 'text-blue-700' 
                  : 'text-blue-500'
              }`} />
            </div>
            <div>
              <p className="font-medium text-sm sm:text-base mb-1">
                {isDragging && dragType === FileType.AUDIO 
                  ? 'Solte os ficheiros aqui' 
                  : 'Arraste áudios aqui ou clique para selecionar'
                }
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Formatos: MP3, WAV, OGG, M4A • Máx: 20MB cada
              </p>
            </div>
          </div>
        </div>

        {/* Audio Files List */}
        {audios.length > 0 && (
          <div className="grid gap-4">
            {audios.map((file, idx) => renderFileCard(file, idx))}
          </div>
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
