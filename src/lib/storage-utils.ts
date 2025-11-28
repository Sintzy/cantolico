/**
 * Utilities para gestão de ficheiros no Supabase Storage
 * Inclui funções seguras para upload, download e eliminação de ficheiros
 */

import { supabase } from './supabase-client';

export interface UploadFileOptions {
  bucket: string;
  path: string;
  file: File | Buffer;
  contentType?: string;
  cacheControl?: string;
  upsert?: boolean;
}

export interface SignedUrlOptions {
  bucket: string;
  path: string;
  expiresIn?: number; // segundos, default 3600 (1 hora)
}

/**
 * Faz upload de um ficheiro para o Supabase Storage
 * @param options - Opções de upload
 * @returns Promise com o caminho do ficheiro ou erro
 */
export async function uploadFileToStorage(
  options: UploadFileOptions
): Promise<{ success: true; path: string } | { success: false; error: string }> {
  try {
    const { bucket, path, file, contentType, cacheControl = '3600', upsert = false } = options;

    // Converter File para ArrayBuffer se necessário
    let fileData: Buffer | Blob;
    if (file instanceof File) {
      fileData = file;
    } else if (file instanceof Buffer) {
      fileData = file;
    } else {
      return { success: false, error: 'Tipo de ficheiro inválido' };
    }

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, fileData, {
        contentType,
        cacheControl,
        upsert
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    return { success: true, path };
  } catch (error) {
    console.error('Unexpected upload error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido ao fazer upload' 
    };
  }
}

/**
 * Cria uma URL assinada para acesso temporário a um ficheiro
 * @param options - Opções para gerar URL
 * @returns Promise com a URL assinada ou erro
 */
export async function createSignedUrl(
  options: SignedUrlOptions
): Promise<{ success: true; signedUrl: string } | { success: false; error: string }> {
  try {
    const { bucket, path, expiresIn = 3600 } = options;

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Signed URL error:', error);
      return { success: false, error: error.message };
    }

    if (!data?.signedUrl) {
      return { success: false, error: 'URL assinada não gerada' };
    }

    return { success: true, signedUrl: data.signedUrl };
  } catch (error) {
    console.error('Unexpected signed URL error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar URL' 
    };
  }
}

/**
 * Elimina um ficheiro do Supabase Storage
 * @param bucket - Nome do bucket
 * @param path - Caminho do ficheiro
 * @returns Promise com sucesso ou erro
 */
export async function deleteFileFromStorage(
  bucket: string,
  path: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected delete error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido ao eliminar ficheiro' 
    };
  }
}

/**
 * Elimina múltiplos ficheiros do Supabase Storage
 * @param bucket - Nome do bucket
 * @param paths - Array de caminhos de ficheiros
 * @returns Promise com sucesso ou erro
 */
export async function deleteMultipleFilesFromStorage(
  bucket: string,
  paths: string[]
): Promise<{ success: true; deleted: number } | { success: false; error: string }> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove(paths);

    if (error) {
      console.error('Delete multiple error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, deleted: paths.length };
  } catch (error) {
    console.error('Unexpected delete multiple error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido ao eliminar ficheiros' 
    };
  }
}

/**
 * Obtém a URL pública de um ficheiro (para ficheiros públicos)
 * @param bucket - Nome do bucket
 * @param path - Caminho do ficheiro
 * @returns URL pública ou null
 */
export function getPublicUrl(bucket: string, path: string): string | null {
  try {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data?.publicUrl || null;
  } catch (error) {
    console.error('Get public URL error:', error);
    return null;
  }
}

/**
 * Valida o tipo MIME de um ficheiro
 * @param file - Ficheiro a validar
 * @param allowedTypes - Array de tipos MIME permitidos
 * @returns true se válido, false caso contrário
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      // Permite wildcards como 'image/*', 'audio/*'
      const category = type.split('/')[0];
      return file.type.startsWith(category + '/');
    }
    return file.type === type;
  });
}

/**
 * Valida o tamanho de um ficheiro
 * @param file - Ficheiro a validar
 * @param maxSizeInBytes - Tamanho máximo em bytes
 * @returns true se válido, false caso contrário
 */
export function validateFileSize(file: File, maxSizeInBytes: number): boolean {
  return file.size <= maxSizeInBytes;
}

/**
 * Gera um nome de ficheiro seguro (sem XSS)
 * @param originalName - Nome original do ficheiro
 * @returns Nome sanitizado
 */
export function sanitizeFileName(originalName: string): string {
  // Remove caracteres perigosos e mantém apenas alfanuméricos, hífen, underscore e ponto
  return originalName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}

/**
 * Gera um caminho único para ficheiro usando UUID
 * @param prefix - Prefixo do caminho (ex: 'songs/123')
 * @param extension - Extensão do ficheiro (ex: 'pdf', 'mp3')
 * @returns Caminho único
 */
export function generateUniqueFilePath(prefix: string, extension: string): string {
  const uuid = crypto.randomUUID();
  return `${prefix}/${uuid}.${extension}`;
}

/**
 * Extrai a extensão de um nome de ficheiro
 * @param fileName - Nome do ficheiro
 * @returns Extensão sem o ponto (ex: 'pdf', 'mp3')
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Formata o tamanho do ficheiro para leitura humana
 * @param bytes - Tamanho em bytes
 * @returns String formatada (ex: '2.5 MB')
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
