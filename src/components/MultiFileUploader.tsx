'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileType, 
  FileTypeLabels, 
  FileTypeIcons,
  FileUploadData,
  validateFileType,
  formatFileSize,
  isPdfFileType
} from '@/types/song-files';
import { Upload, X, FileText, Music, Check, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface MultiFileUploaderProps {
  songId?: string;
  onFilesChange?: (files: FileUploadData[]) => void;
  existingFiles?: Array<{
    id: string;
    fileType: FileType;
    fileName: string;
    description: string;
    fileSize?: number;
  }>;
  onDeleteExisting?: (fileId: string) => Promise<void>;
  autoUpload?: boolean; // Se true, faz upload imediatamente
}

export function MultiFileUploader({ 
  songId, 
  onFilesChange, 
  existingFiles = [],
  onDeleteExisting,
  autoUpload = false 
}: MultiFileUploaderProps) {
  const [files, setFiles] = useState<FileUploadData[]>([]);
  const [selectedFileType, setSelectedFileType] = useState<FileType>(FileType.PDF);
  const [description, setDescription] = useState('');
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (selectedFiles.length === 0) return;

    // Validar descrição
    if (!description.trim()) {
      toast.error('Por favor, insere uma descrição para o ficheiro');
      return;
    }

    const newFiles: FileUploadData[] = [];

    for (const file of selectedFiles) {
      // Validar tipo de ficheiro
      if (!validateFileType(file, selectedFileType)) {
        toast.error(`${file.name}: Tipo de ficheiro inválido`);
        continue;
      }

      // Validar tamanho (máx 50MB para PDF, 20MB para áudio)
      const maxSize = isPdfFileType(selectedFileType) ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`${file.name}: Ficheiro demasiado grande (máx ${maxSize / 1024 / 1024}MB)`);
        continue;
      }

      const fileData: FileUploadData = {
        id: Math.random().toString(36).substring(7),
        file,
        fileType: selectedFileType,
        description: description.trim(),
        uploading: false,
        uploaded: false,
        progress: 0
      };

      newFiles.push(fileData);
    }

    if (newFiles.length === 0) {
      e.target.value = '';
      return;
    }

    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    onFilesChange?.(updatedFiles);
    
    // Reset
    e.target.value = '';
    setDescription('');

    // Auto upload se configurado
    if (autoUpload && songId) {
      for (const fileData of newFiles) {
        await uploadFile(fileData);
      }
    }

    toast.success(`${newFiles.length} ficheiro(s) adicionado(s)`);
  };

  const uploadFile = async (fileData: FileUploadData) => {
    if (!songId) {
      toast.error('ID da música não definido');
      return;
    }

    // Atualizar estado para uploading
    setFiles(prev => prev.map(f => 
      f.id === fileData.id ? { ...f, uploading: true, progress: 0, error: undefined } : f
    ));

    try {
      const formData = new FormData();
      formData.append('file', fileData.file);
      formData.append('fileType', fileData.fileType);
      formData.append('description', fileData.description);

      const response = await fetch(`/api/admin/songs/${songId}/files`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao fazer upload');
      }

      const result = await response.json();

      // Atualizar estado para uploaded
      setFiles(prev => prev.map(f => 
        f.id === fileData.id 
          ? { ...f, uploading: false, uploaded: true, progress: 100, fileId: result.file.id } 
          : f
      ));

      toast.success(`${fileData.file.name} enviado com sucesso`);

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      setFiles(prev => prev.map(f => 
        f.id === fileData.id 
          ? { ...f, uploading: false, uploaded: false, progress: 0, error: errorMessage } 
          : f
      ));

      toast.error(`Erro ao enviar ${fileData.file.name}: ${errorMessage}`);
    }
  };

  const removeFile = (id: string) => {
    const updatedFiles = files.filter(f => f.id !== id);
    setFiles(updatedFiles);
    onFilesChange?.(updatedFiles);
  };

  const handleDeleteExisting = async (fileId: string) => {
    if (!onDeleteExisting) return;
    
    setDeletingFileId(fileId);
    try {
      await onDeleteExisting(fileId);
      toast.success('Ficheiro eliminado com sucesso');
    } catch (error) {
      toast.error('Erro ao eliminar ficheiro');
    } finally {
      setDeletingFileId(null);
    }
  };

  const uploadAllPending = async () => {
    if (!songId) {
      toast.error('ID da música não definido');
      return;
    }

    const pendingFiles = files.filter(f => !f.uploaded && !f.uploading);
    
    for (const fileData of pendingFiles) {
      await uploadFile(fileData);
    }
  };

  const isPdfType = isPdfFileType(selectedFileType);
  const accept = isPdfType ? 'application/pdf' : 'audio/mpeg,audio/mp3';

  const pendingCount = files.filter(f => !f.uploaded).length;
  const uploadedCount = files.filter(f => f.uploaded).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Partituras e Ficheiros de Áudio
        </CardTitle>
        <CardDescription>
          Adiciona partituras (PDF) e ficheiros de áudio (MP3) com descrições personalizadas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing Files */}
        {existingFiles.length > 0 && (
          <div className="space-y-2">
            <Label>Ficheiros Existentes ({existingFiles.length})</Label>
            <div className="grid gap-2 max-h-60 overflow-y-auto">
              {existingFiles.map(file => (
                <div key={file.id} className="flex items-center gap-2 p-3 border rounded-lg bg-green-50 border-green-200">
                  <span className="text-lg">{FileTypeIcons[file.fileType]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {FileTypeLabels[file.fileType]}
                      </Badge>
                      {file.fileSize && (
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(file.fileSize)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Check className="h-4 w-4 text-green-600" />
                  {onDeleteExisting && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteExisting(file.id)}
                      disabled={deletingFileId === file.id}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de Ficheiro</Label>
              <Select value={selectedFileType} onValueChange={(value) => setSelectedFileType(value as FileType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FileType.PDF}>
                    {FileTypeIcons[FileType.PDF]} Partitura (PDF)
                  </SelectItem>
                  <SelectItem value={FileType.AUDIO}>
                    {FileTypeIcons[FileType.AUDIO]} Áudio (MP3)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Partitura Completa, Só Vozes, Playback..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-upload">
              Selecionar Ficheiro(s)
            </Label>
            <Input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              accept={accept}
              multiple
              onChange={handleFileSelect}
              disabled={!description.trim()}
            />
            {!description.trim() && (
              <p className="text-xs text-amber-600">
                ⚠️ Por favor, insere uma descrição antes de selecionar ficheiros
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Tamanho máximo: {isPdfType ? '50MB' : '20MB'} por ficheiro
            </p>
          </div>
        </div>

        {/* Files List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Ficheiros a Enviar ({uploadedCount}/{files.length})
              </Label>
              {pendingCount > 0 && songId && !autoUpload && (
                <Button size="sm" onClick={uploadAllPending}>
                  Enviar Todos ({pendingCount})
                </Button>
              )}
            </div>
            <div className="grid gap-2 max-h-60 overflow-y-auto">
              {files.map(fileUpload => (
                <div key={fileUpload.id} className={`flex flex-col gap-2 p-3 border rounded-lg ${
                  fileUpload.error ? 'border-red-300 bg-red-50' : 
                  fileUpload.uploaded ? 'border-green-300 bg-green-50' : 
                  'border-gray-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{FileTypeIcons[fileUpload.fileType]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fileUpload.file.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {fileUpload.description}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(fileUpload.file.size)}
                        </span>
                      </div>
                    </div>
                    {fileUpload.uploaded && <Check className="h-4 w-4 text-green-600" />}
                    {fileUpload.error && <AlertCircle className="h-4 w-4 text-red-600" />}
                    {!fileUpload.uploaded && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(fileUpload.id)}
                        disabled={fileUpload.uploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {fileUpload.uploading && (
                    <Progress value={fileUpload.progress || 0} className="h-1" />
                  )}
                  {fileUpload.error && (
                    <p className="text-xs text-red-600">❌ {fileUpload.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
