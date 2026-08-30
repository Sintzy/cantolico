import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase } from '@/lib/supabase-admin';
import { getClerkSession } from '@/lib/api-middleware';
import { FileType } from '@/types/song-files';

const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];
const AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac'];

type UploadDetails = {
  fileName: string;
  fileType: FileType;
  fileSize: number;
  mimeType: string;
  description: string;
  extension: string;
};

function getUploadDetails(body: unknown): UploadDetails | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Dados de upload inválidos' };
  }

  const { fileName, fileType, fileSize, mimeType, description } = body as Record<string, unknown>;
  if (typeof fileName !== 'string' || typeof fileType !== 'string' || typeof fileSize !== 'number' || typeof description !== 'string') {
    return { error: 'Dados de upload incompletos' };
  }

  if (!Object.values(FileType).includes(fileType as FileType) || !description.trim()) {
    return { error: 'Tipo e descrição do ficheiro são obrigatórios' };
  }

  const extension = fileName.split('.').pop()?.toLowerCase();
  const isPdf = fileType === FileType.PDF;
  const validExtension = isPdf ? extension === 'pdf' : !!extension && AUDIO_EXTENSIONS.includes(extension);
  if (!validExtension) {
    return { error: 'A extensão do ficheiro não corresponde ao tipo selecionado' };
  }

  const normalizedMimeType = typeof mimeType === 'string' ? mimeType : '';
  if (isPdf && normalizedMimeType && normalizedMimeType !== 'application/pdf') {
    return { error: 'Apenas ficheiros PDF são permitidos' };
  }
  if (!isPdf && normalizedMimeType && !AUDIO_MIME_TYPES.includes(normalizedMimeType)) {
    return { error: 'Apenas ficheiros de áudio permitidos são aceites' };
  }

  const maxSize = isPdf ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxSize) {
    return { error: `Ficheiro demasiado grande. Máximo: ${maxSize / 1024 / 1024}MB` };
  }

  return {
    fileName,
    fileType: fileType as FileType,
    fileSize,
    mimeType: normalizedMimeType || (isPdf ? 'application/pdf' : 'audio/mpeg'),
    description: description.trim(),
    extension: extension!
  };
}

async function requireUploadSession() {
  const session = await getClerkSession();
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
    return null;
  }
  return session;
}

async function findSong(songIdOrSlug: string) {
  const { data, error } = await supabase
    .from('Song')
    .select('id, currentVersionId')
    .or(`id.eq.${songIdOrSlug},slug.eq.${songIdOrSlug}`)
    .single();

  if (error || !data?.currentVersionId) {
    return null;
  }
  return data;
}

/**
 * Creates a short-lived URL so the browser can send a file directly to Storage.
 * This keeps large files out of Vercel's 1 MB function request limit.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireUploadSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const details = getUploadDetails(await req.json());
    if ('error' in details) {
      return NextResponse.json({ error: details.error }, { status: 400 });
    }

    const { id: songIdOrSlug } = await params;
    const song = await findSong(songIdOrSlug);
    if (!song) {
      return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 });
    }

    const fileId = crypto.randomUUID();
    const storagePath = `songs/${song.id}/files/${fileId}.${details.extension}`;
    const { data, error } = await supabase.storage
      .from('songs')
      .createSignedUploadUrl(storagePath, { upsert: false });

    if (error || !data) {
      console.error('Error creating signed upload URL:', error);
      return NextResponse.json({ error: 'Não foi possível preparar o upload' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      fileId,
      storagePath,
      token: data.token
    });
  } catch (error) {
    console.error('Error preparing direct song file upload:', error);
    return NextResponse.json({ error: 'Erro interno ao preparar o upload' }, { status: 500 });
  }
}

/** Registers a file after its direct upload to Storage succeeds. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireUploadSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const details = getUploadDetails(body);
    if ('error' in details) {
      return NextResponse.json({ error: details.error }, { status: 400 });
    }

    const fileId = typeof body.fileId === 'string' ? body.fileId : '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fileId)) {
      return NextResponse.json({ error: 'Identificador de ficheiro inválido' }, { status: 400 });
    }

    const { id: songIdOrSlug } = await params;
    const song = await findSong(songIdOrSlug);
    if (!song) {
      return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 });
    }

    const storagePath = `songs/${song.id}/files/${fileId}.${details.extension}`;
    const folder = `songs/${song.id}/files`;
    const storedFileName = `${fileId}.${details.extension}`;
    const { data: storedFiles, error: storageError } = await supabase.storage
      .from('songs')
      .list(folder, { limit: 1000, search: storedFileName });
    const storedFile = storedFiles?.find(file => file.name === storedFileName);

    if (storageError || !storedFile) {
      return NextResponse.json({ error: 'O ficheiro não foi encontrado no armazenamento' }, { status: 404 });
    }

    const storedSize = Number(storedFile.metadata?.size);
    if (Number.isFinite(storedSize) && storedSize !== details.fileSize) {
      await supabase.storage.from('songs').remove([storagePath]);
      return NextResponse.json({ error: 'O tamanho do ficheiro enviado não é válido' }, { status: 400 });
    }

    const { data: songFile, error: dbError } = await supabase
      .from('SongFile')
      .insert({
        id: fileId,
        songVersionId: song.currentVersionId,
        fileType: details.fileType,
        fileName: details.fileName,
        fileKey: storagePath,
        fileSize: details.fileSize,
        mimeType: details.mimeType,
        description: details.description,
        isPrincipal: false,
        uploadedById: session.user.id,
        uploadedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error registering uploaded song file:', dbError);
      await supabase.storage.from('songs').remove([storagePath]);
      return NextResponse.json({ error: 'Erro ao guardar informação do ficheiro na base de dados' }, { status: 500 });
    }

    return NextResponse.json({ success: true, file: songFile });
  } catch (error) {
    console.error('Error completing direct song file upload:', error);
    return NextResponse.json({ error: 'Erro interno ao concluir o upload' }, { status: 500 });
  }
}
