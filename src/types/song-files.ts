/**
 * Sistema de Gestão de Ficheiros de Músicas
 * Suporta múltiplas partituras (PDFs) e ficheiros de áudio (MP3)
 * Usa descrições personalizadas para cada ficheiro
 */

export enum FileType {
  PDF = 'PDF',      // Partitura (qualquer tipo)
  AUDIO = 'AUDIO'   // Áudio (qualquer tipo)
}

export const FileTypeLabels: Record<FileType, string> = {
  [FileType.PDF]: 'Partitura (PDF)',
  [FileType.AUDIO]: 'Áudio (MP3)'
};

export const FileTypeIcons: Record<FileType, string> = {
  [FileType.PDF]: '📄',
  [FileType.AUDIO]: '🎵'
};

export interface SongFile {
  id: string;
  songVersionId: string;
  fileType: FileType;
  fileName: string;
  fileKey: string;
  fileSize?: number;
  mimeType?: string;
  description: string; // Descrição personalizada (obrigatório)
  uploadedAt: string;
  uploadedById: number;
}

export interface SongFileWithUrl extends SongFile {
  signedUrl: string;
}

export interface FileUploadData {
  id?: string; // Optional - só existe após upload
  file: File;
  fileType: FileType;
  description: string; // Descrição personalizada
  uploading?: boolean;
  uploaded?: boolean;
  progress?: number;
  error?: string;
  fileId?: string; // ID do ficheiro após upload bem-sucedido
  fileName?: string; // Cache do nome do ficheiro
  fileSize?: number; // Cache do tamanho
  signedUrl?: string; // URL assinada para preview/download
  uploadedAt?: string; // Data de upload
  isUploading?: boolean; // Flag de upload em progresso
  uploadProgress?: number; // Progresso 0-100
}

// Helper functions
export function isPdfFileType(fileType: FileType): boolean {
  return fileType === FileType.PDF;
}

export function isAudioFileType(fileType: FileType): boolean {
  return fileType === FileType.AUDIO;
}

export function getAcceptedMimeTypes(fileType: FileType): string {
  return isPdfFileType(fileType) ? 'application/pdf' : 'audio/mpeg,audio/mp3';
}

export function validateFileType(file: File, fileType: FileType): boolean {
  if (isPdfFileType(fileType)) {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }
  if (isAudioFileType(fileType)) {
    return file.type.includes('audio') || file.name.toLowerCase().endsWith('.mp3');
  }
  return false;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
