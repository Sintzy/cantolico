import { supabase } from '@/lib/supabase';
import { FileType } from '@/types/song-files';

type UploadedSongFile = {
  id: string;
  uploadedAt: string;
};

type UploadPreparation = {
  fileId: string;
  storagePath: string;
  token: string;
};

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json();
    return typeof body.error === 'string' ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export async function uploadAdminSongFile(
  songId: string,
  file: File,
  fileType: FileType,
  description: string
): Promise<UploadedSongFile> {
  const endpoint = `/api/admin/songs/${songId}/files/upload`;
  const uploadDetails = {
    fileName: file.name,
    fileType,
    fileSize: file.size,
    mimeType: file.type,
    description
  };

  const prepareResponse = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(uploadDetails)
  });
  if (!prepareResponse.ok) {
    throw new Error(await getErrorMessage(prepareResponse, 'Não foi possível preparar o upload'));
  }

  const preparation = await prepareResponse.json() as UploadPreparation;
  const { error: uploadError } = await supabase.storage
    .from('songs')
    .uploadToSignedUrl(preparation.storagePath, preparation.token, file, {
      contentType: file.type || (fileType === FileType.PDF ? 'application/pdf' : 'audio/mpeg'),
      cacheControl: '3600'
    });
  if (uploadError) {
    throw new Error(uploadError.message || 'Erro ao enviar o ficheiro para o armazenamento');
  }

  const completeResponse = await fetch(endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...uploadDetails, fileId: preparation.fileId })
  });
  if (!completeResponse.ok) {
    throw new Error(await getErrorMessage(completeResponse, 'O ficheiro foi enviado, mas não foi possível registá-lo'));
  }

  const result = await completeResponse.json() as { file: UploadedSongFile };
  return result.file;
}
