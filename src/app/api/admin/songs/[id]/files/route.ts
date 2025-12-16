import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';
import { FileType } from '@/types/song-files';
import { logger } from '@/lib/logger';
import { LogCategory, LogLevel } from '@/types/logging';
import { getClientIP } from '@/lib/utils';

/**
 * GET /api/admin/songs/[id]/files
 * Retorna todos os ficheiros de uma música
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientIp = getClientIP(req.headers);
  const startTime = Date.now();
  
  try {
    const { id: songIdOrSlug } = await params;

    logger.info('Fetching song files', {
      category: LogCategory.UPLOAD,
      domain: { song_id: songIdOrSlug },
      network: { ip_address: clientIp },
      http: { 
        method: 'GET',
        url: `/api/admin/songs/${songIdOrSlug}/files`
      }
    });

    // Buscar versão atual da música (aceita ID ou slug)
    const { data: song, error: songError } = await supabase
      .from('Song')
      .select('id, currentVersionId')
      .or(`id.eq.${songIdOrSlug},slug.eq.${songIdOrSlug}`)
      .single();

    if (songError || !song?.currentVersionId) {
      logger.warn('Song not found for file listing', {
        category: LogCategory.UPLOAD,
        domain: { song_id: songIdOrSlug },
        network: { ip_address: clientIp },
        error: { error_message: songError?.message }
      });
      return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 });
    }

    // Buscar ficheiros da versão atual - OTIMIZADO: apenas campos necessários
    // Frontend usa: id, fileName, description, fileType, fileKey (para gerar signedUrl)
    const { data: files, error: filesError } = await supabase
      .from('SongFile')
      .select('id, fileName, description, fileType, fileKey')
      .eq('songVersionId', song.currentVersionId)
      .order('uploadedAt', { ascending: false });

    if (filesError) {
      logger.error('Error fetching files from database', {
        category: LogCategory.DATABASE,
        domain: { song_id: song.id },
        network: { ip_address: clientIp },
        error: { 
          error_message: filesError.message,
          error_type: filesError.code
        }
      });
      console.error('Error fetching files:', filesError);
      return NextResponse.json({ error: 'Erro ao carregar ficheiros' }, { status: 500 });
    }

    // Gerar URLs assinadas para cada ficheiro (válidas por 1 hora)
    // OTIMIZADO: Retornar apenas campos necessários para o frontend
    const filesWithUrls = await Promise.all(
      (files || []).map(async (file) => {
        try {
          const { data: signedUrlData } = await supabase.storage
            .from('songs')
            .createSignedUrl(file.fileKey, 3600);

          return {
            id: file.id,
            fileName: file.fileName,
            description: file.description,
            fileType: file.fileType,
            signedUrl: signedUrlData?.signedUrl || null
          };
        } catch (error) {
          console.error(`Error creating signed URL for ${file.fileKey}:`, error);
          return {
            id: file.id,
            fileName: file.fileName,
            description: file.description,
            fileType: file.fileType,
            signedUrl: null
          };
        }
      })
    );

    const duration = Date.now() - startTime;
    logger.success('Song files fetched successfully', {
      category: LogCategory.UPLOAD,
      domain: { song_id: song.id },
      network: { ip_address: clientIp },
      http: { 
        method: 'GET',
        status_code: 200
      },
      performance: { response_time_ms: duration },
      details: { file_count: filesWithUrls.length }
    });

    return NextResponse.json({ 
      success: true,
      files: filesWithUrls 
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Unexpected error in GET /api/admin/songs/[id]/files', {
      category: LogCategory.API,
      network: { ip_address: clientIp },
      http: { method: 'GET', status_code: 500 },
      performance: { response_time_ms: duration },
      error: {
        error_message: error instanceof Error ? error.message : String(error),
        stack_trace: error instanceof Error ? error.stack : undefined
      }
    });
    console.error('Error in GET /api/admin/songs/[id]/files:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

/**
 * POST /api/admin/songs/[id]/files
 * Upload de um novo ficheiro (PDF ou MP3)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientIp = getClientIP(req.headers);
  const startTime = Date.now();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      logger.warn('Unauthorized file upload attempt', {
        category: LogCategory.SECURITY,
        network: { ip_address: clientIp },
        http: { method: 'POST', status_code: 401 },
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role
        } : undefined,
        tags: ['unauthorized', 'file-upload']
      });
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: songIdOrSlug } = await params;
    const formData = await req.formData();
    
    const fileTypeStr = formData.get('fileType') as string;
    const description = formData.get('description') as string;
    const file = formData.get('file') as File;

    // Buscar música para obter ID real
    const { data: songData, error: songLookupError } = await supabase
      .from('Song')
      .select('id, currentVersionId')
      .or(`id.eq.${songIdOrSlug},slug.eq.${songIdOrSlug}`)
      .single();

    if (songLookupError || !songData) {
      logger.warn('Song not found for file upload', {
        category: LogCategory.UPLOAD,
        domain: { song_id: songIdOrSlug },
        user: { id: session.user.id, email: session.user.email },
        network: { ip_address: clientIp },
        error: { error_message: songLookupError?.message }
      });
      return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 });
    }

    const songId = songData.id;

    if (!file || !fileTypeStr || !description?.trim()) {
      logger.warn('Missing required fields for file upload', {
        category: LogCategory.UPLOAD,
        domain: { song_id: songId },
        user: { id: session.user.id, email: session.user.email },
        network: { ip_address: clientIp },
        details: {
          has_file: !!file,
          has_file_type: !!fileTypeStr,
          has_description: !!description?.trim()
        }
      });
      return NextResponse.json({ 
        error: 'Ficheiro, tipo e descrição são obrigatórios' 
      }, { status: 400 });
    }

    // Validar FileType
    if (!Object.values(FileType).includes(fileTypeStr as FileType)) {
      logger.warn('Invalid file type provided', {
        category: LogCategory.UPLOAD,
        domain: { song_id: songId },
        user: { id: session.user.id, email: session.user.email },
        network: { ip_address: clientIp },
        details: { provided_file_type: fileTypeStr }
      });
      return NextResponse.json({ error: 'Tipo de ficheiro inválido' }, { status: 400 });
    }

    const fileType = fileTypeStr as FileType;

    logger.info('Starting file upload validation', {
      category: LogCategory.UPLOAD,
      domain: { song_id: songId },
      user: { id: session.user.id, email: session.user.email, role: session.user.role },
      network: { ip_address: clientIp },
      details: {
        file_name: file.name,
        file_type: fileType,
        file_size: file.size,
        description_length: description.length
      }
    });

    // Converter File para Buffer para validação
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Validação rigorosa de PDFs com magic bytes (anti-XSS)
    const isPdf = fileType === FileType.PDF;
    const isAudio = fileType === FileType.AUDIO;
    
    if (isPdf) {
      // Verificar extensão
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        logger.security('PDF upload blocked - invalid extension', {
          category: LogCategory.SECURITY,
          domain: { song_id: songId },
          user: { id: session.user.id, email: session.user.email },
          network: { ip_address: clientIp },
          details: { file_name: file.name },
          tags: ['xss-prevention', 'file-validation', 'pdf']
        });
        return NextResponse.json({ 
          error: 'Ficheiro inválido. Apenas PDFs são permitidos.' 
        }, { status: 400 });
      }

      // Verificar MIME type
      if (file.type !== 'application/pdf' && file.type !== '') {
        logger.security('PDF upload blocked - invalid MIME type', {
          category: LogCategory.SECURITY,
          domain: { song_id: songId },
          user: { id: session.user.id, email: session.user.email },
          network: { ip_address: clientIp },
          details: { 
            file_name: file.name,
            provided_mime: file.type 
          },
          tags: ['xss-prevention', 'file-validation', 'pdf']
        });
        return NextResponse.json({ 
          error: 'MIME type inválido. Apenas application/pdf é permitido.' 
        }, { status: 400 });
      }

      // Verificar PDF magic bytes: %PDF-
      const pdfMagic = fileBuffer.slice(0, 5).toString('ascii');
      if (pdfMagic !== '%PDF-') {
        logger.security('PDF upload blocked - invalid magic bytes', {
          category: LogCategory.SECURITY,
          domain: { song_id: songId },
          user: { id: session.user.id, email: session.user.email },
          network: { ip_address: clientIp },
          details: { 
            file_name: file.name,
            magic_bytes: pdfMagic
          },
          tags: ['xss-prevention', 'file-validation', 'pdf', 'magic-bytes']
        });
        return NextResponse.json({ 
          error: 'Ficheiro corrompido ou não é um PDF válido (proteção anti-XSS)' 
        }, { status: 400 });
      }

      logger.info('PDF validation passed', {
        category: LogCategory.UPLOAD,
        domain: { song_id: songId },
        user: { id: session.user.id, email: session.user.email },
        details: { file_name: file.name },
        tags: ['file-validation', 'pdf']
      });
    }
    
    if (isAudio) {
      // Verificar extensão
      const validExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
      const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      if (!hasValidExt) {
        logger.security('Audio upload blocked - invalid extension', {
          category: LogCategory.SECURITY,
          domain: { song_id: songId },
          user: { id: session.user.id, email: session.user.email },
          network: { ip_address: clientIp },
          details: { file_name: file.name },
          tags: ['xss-prevention', 'file-validation', 'audio']
        });
        return NextResponse.json({ 
          error: 'Extensão inválida. Apenas ficheiros de áudio são permitidos.' 
        }, { status: 400 });
      }

      // Verificar MIME type
      const validMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac'];
      if (file.type && !validMimes.includes(file.type)) {
        logger.security('Audio upload blocked - invalid MIME type', {
          category: LogCategory.SECURITY,
          domain: { song_id: songId },
          user: { id: session.user.id, email: session.user.email },
          network: { ip_address: clientIp },
          details: { 
            file_name: file.name,
            provided_mime: file.type 
          },
          tags: ['xss-prevention', 'file-validation', 'audio']
        });
        return NextResponse.json({ 
          error: 'MIME type inválido. Apenas ficheiros de áudio são permitidos.' 
        }, { status: 400 });
      }

      // Verificar magic bytes de áudio
      let isValidAudio = false;

      // MP3: ID3 tag ou MPEG frame sync
      if ((fileBuffer[0] === 0x49 && fileBuffer[1] === 0x44 && fileBuffer[2] === 0x33) || // ID3
          (fileBuffer[0] === 0xFF && (fileBuffer[1] === 0xFB || fileBuffer[1] === 0xF3 || fileBuffer[1] === 0xF2))) { // MPEG
        isValidAudio = true;
      }

      // WAV: RIFF header
      if (fileBuffer[0] === 0x52 && fileBuffer[1] === 0x49 && fileBuffer[2] === 0x46 && fileBuffer[3] === 0x46) {
        isValidAudio = true;
      }

      // OGG: OggS header
      if (fileBuffer[0] === 0x4F && fileBuffer[1] === 0x67 && fileBuffer[2] === 0x67 && fileBuffer[3] === 0x53) {
        isValidAudio = true;
      }

      // M4A/AAC: ftyp at position 4
      if (fileBuffer[4] === 0x66 && fileBuffer[5] === 0x74 && fileBuffer[6] === 0x79 && fileBuffer[7] === 0x70) {
        isValidAudio = true;
      }

      if (!isValidAudio) {
        logger.security('Audio upload blocked - invalid magic bytes', {
          category: LogCategory.SECURITY,
          domain: { song_id: songId },
          user: { id: session.user.id, email: session.user.email },
          network: { ip_address: clientIp },
          details: { 
            file_name: file.name,
            first_bytes: Array.from(fileBuffer.slice(0, 8)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')
          },
          tags: ['xss-prevention', 'file-validation', 'audio', 'magic-bytes']
        });
        return NextResponse.json({ 
          error: 'Ficheiro corrompido ou não é um áudio válido (proteção anti-XSS)' 
        }, { status: 400 });
      }

      logger.info('Audio validation passed', {
        category: LogCategory.UPLOAD,
        domain: { song_id: songId },
        user: { id: session.user.id, email: session.user.email },
        details: { file_name: file.name },
        tags: ['file-validation', 'audio']
      });
    }

    // Validar tamanho (50MB para PDF, 20MB para áudio)
    const maxSize = isPdf ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSize) {
      logger.warn('File size exceeds limit', {
        category: LogCategory.UPLOAD,
        domain: { song_id: songId },
        user: { id: session.user.id, email: session.user.email },
        network: { ip_address: clientIp },
        details: {
          file_name: file.name,
          file_size: file.size,
          max_size: maxSize,
          file_type: fileType
        }
      });
      return NextResponse.json({ 
        error: `Ficheiro demasiado grande. Máximo: ${maxSize / 1024 / 1024}MB` 
      }, { status: 400 });
    }

    // Usar currentVersionId do songData já buscado
    if (!songData.currentVersionId) {
      logger.warn('Song has no current version', {
        category: LogCategory.UPLOAD,
        domain: { song_id: songId },
        user: { id: session.user.id, email: session.user.email },
        network: { ip_address: clientIp }
      });
      return NextResponse.json({ error: 'Música não tem versão atual' }, { status: 404 });
    }

    // Gerar ID único para o ficheiro
    const fileId = crypto.randomUUID();
    const fileExtension = isPdf ? 'pdf' : (file.name.split('.').pop() || 'mp3');
    const storagePath = `songs/${songId}/files/${fileId}.${fileExtension}`;
    
    // fileBuffer já foi criado anteriormente para validação
    
    logger.info('Uploading file to storage', {
      category: LogCategory.UPLOAD,
      domain: { song_id: songId },
      user: { id: session.user.id, email: session.user.email },
      network: { ip_address: clientIp },
      details: {
        file_id: fileId,
        file_name: file.name,
        storage_path: storagePath,
        file_size: file.size
      }
    });
    
    // Upload para Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('songs')
      .upload(storagePath, fileBuffer, {
        contentType: isPdf ? 'application/pdf' : 'audio/mpeg',
        upsert: false,
        cacheControl: '3600'
      });

    if (uploadError) {
      logger.error('Storage upload failed', {
        category: LogCategory.UPLOAD,
        domain: { song_id: songId },
        user: { id: session.user.id, email: session.user.email },
        network: { ip_address: clientIp },
        error: {
          error_message: uploadError.message,
          error_type: uploadError.name
        },
        details: {
          file_name: file.name,
          storage_path: storagePath
        }
      });
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Erro ao fazer upload do ficheiro para o armazenamento' 
      }, { status: 500 });
    }

    // Criar registo na base de dados
    const { data: songFile, error: dbError } = await supabase
      .from('SongFile')
      .insert({
        id: fileId,
        songVersionId: songData.currentVersionId,
        fileType: fileType,
        fileName: file.name,
        fileKey: storagePath,
        fileSize: file.size,
        mimeType: file.type || (isPdf ? 'application/pdf' : 'audio/mpeg'),
        description: description.trim(),
        isPrincipal: false,
        uploadedById: session.user.id,
        uploadedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      logger.error('Database insert failed, rolling back storage upload', {
        category: LogCategory.DATABASE,
        domain: { song_id: songId },
        user: { id: session.user.id, email: session.user.email },
        network: { ip_address: clientIp },
        error: {
          error_message: dbError.message,
          error_type: dbError.code
        },
        details: {
          file_id: fileId,
          file_name: file.name,
          storage_path: storagePath
        },
        tags: ['rollback']
      });
      // Rollback: apagar ficheiro do storage
      console.error('Database insert error:', dbError);
      await supabase.storage.from('songs').remove([storagePath]);
      return NextResponse.json({ 
        error: 'Erro ao guardar informação do ficheiro na base de dados' 
      }, { status: 500 });
    }

    const duration = Date.now() - startTime;
    logger.success('File uploaded successfully', {
      category: LogCategory.UPLOAD,
      domain: { song_id: songId },
      user: { id: session.user.id, email: session.user.email, role: session.user.role },
      network: { ip_address: clientIp },
      http: {
        method: 'POST',
        status_code: 200
      },
      performance: { response_time_ms: duration },
      details: {
        file_id: fileId,
        file_name: file.name,
        file_type: fileType,
        file_size: file.size,
        storage_path: storagePath,
        description_length: description.length
      },
      tags: ['file-upload', fileType.toLowerCase()]
    });

    return NextResponse.json({ 
      success: true, 
      file: songFile 
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Unexpected error in POST /api/admin/songs/[id]/files', {
      category: LogCategory.API,
      network: { ip_address: clientIp },
      http: { method: 'POST', status_code: 500 },
      performance: { response_time_ms: duration },
      error: {
        error_message: error instanceof Error ? error.message : String(error),
        stack_trace: error instanceof Error ? error.stack : undefined
      }
    });
    console.error('Error in POST /api/admin/songs/[id]/files:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/songs/[id]/files
 * Elimina um ficheiro (query param: fileId)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientIp = getClientIP(req.headers);
  const startTime = Date.now();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      logger.warn('Unauthorized file delete attempt', {
        category: LogCategory.SECURITY,
        network: { ip_address: clientIp },
        http: { method: 'DELETE', status_code: 401 },
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role
        } : undefined,
        tags: ['unauthorized', 'file-delete']
      });
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: songIdOrSlug } = await params;
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');

    // Buscar música para obter ID real
    const { data: songData, error: songLookupError } = await supabase
      .from('Song')
      .select('id')
      .or(`id.eq.${songIdOrSlug},slug.eq.${songIdOrSlug}`)
      .single();

    if (songLookupError || !songData) {
      logger.warn('Song not found for file deletion', {
        category: LogCategory.UPLOAD,
        domain: { song_id: songIdOrSlug },
        user: { id: session.user.id, email: session.user.email },
        network: { ip_address: clientIp },
        error: { error_message: songLookupError?.message }
      });
      return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 });
    }

    const songId = songData.id;

    if (!fileId) {
      logger.warn('Missing fileId in delete request', {
        category: LogCategory.UPLOAD,
        domain: { song_id: songId },
        user: { id: session.user.id, email: session.user.email },
        network: { ip_address: clientIp }
      });
      return NextResponse.json({ error: 'ID do ficheiro é obrigatório' }, { status: 400 });
    }

    logger.info('Starting file deletion', {
      category: LogCategory.UPLOAD,
      domain: { song_id: songId },
      user: { id: session.user.id, email: session.user.email, role: session.user.role },
      network: { ip_address: clientIp },
      details: { file_id: fileId }
    });

    // Buscar informação do ficheiro
    const { data: file, error: fetchError } = await supabase
      .from('SongFile')
      .select('fileKey, fileName, fileType')
      .eq('id', fileId)
      .single();

    if (fetchError || !file) {
      logger.warn('File not found for deletion', {
        category: LogCategory.UPLOAD,
        domain: { song_id: songId },
        user: { id: session.user.id, email: session.user.email },
        network: { ip_address: clientIp },
        details: { file_id: fileId },
        error: { error_message: fetchError?.message }
      });
      return NextResponse.json({ error: 'Ficheiro não encontrado' }, { status: 404 });
    }

    // Apagar do storage
    const { error: storageError } = await supabase.storage
      .from('songs')
      .remove([file.fileKey]);

    if (storageError) {
      logger.warn('Storage deletion failed but continuing', {
        category: LogCategory.UPLOAD,
        domain: { song_id: songId },
        user: { id: session.user.id, email: session.user.email },
        network: { ip_address: clientIp },
        details: {
          file_id: fileId,
          file_key: file.fileKey
        },
        error: {
          error_message: storageError.message
        }
      });
      console.error('Storage delete error:', storageError);
      // Continuar mesmo com erro no storage
    }

    // Apagar da base de dados
    const { error: dbError } = await supabase
      .from('SongFile')
      .delete()
      .eq('id', fileId);

    if (dbError) {
      logger.error('Database delete failed', {
        category: LogCategory.DATABASE,
        domain: { song_id: songId },
        user: { id: session.user.id, email: session.user.email },
        network: { ip_address: clientIp },
        details: {
          file_id: fileId,
          file_key: file.fileKey
        },
        error: {
          error_message: dbError.message,
          error_type: dbError.code
        }
      });
      console.error('Database delete error:', dbError);
      return NextResponse.json({ error: 'Erro ao eliminar ficheiro' }, { status: 500 });
    }

    const duration = Date.now() - startTime;
    logger.success('File deleted successfully', {
      category: LogCategory.UPLOAD,
      domain: { song_id: songId },
      user: { id: session.user.id, email: session.user.email, role: session.user.role },
      network: { ip_address: clientIp },
      http: {
        method: 'DELETE',
        status_code: 200
      },
      performance: { response_time_ms: duration },
      details: {
        file_id: fileId,
        file_name: file.fileName,
        file_type: file.fileType,
        file_key: file.fileKey
      },
      tags: ['file-delete', file.fileType.toLowerCase()]
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Unexpected error in DELETE /api/admin/songs/[id]/files', {
      category: LogCategory.API,
      network: { ip_address: clientIp },
      http: { method: 'DELETE', status_code: 500 },
      performance: { response_time_ms: duration },
      error: {
        error_message: error instanceof Error ? error.message : String(error),
        stack_trace: error instanceof Error ? error.stack : undefined
      }
    });
    console.error('Error in DELETE /api/admin/songs/[id]/files:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/songs/[id]/files/[fileId]
 * Atualiza a flag isPrincipal de um ficheiro PDF (marca como partitura principal)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientIp = getClientIP(req.headers);
  const startTime = Date.now();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: songIdOrSlug } = await params;
    const body = await req.json();
    const { fileId, isPrincipal } = body;

    if (!fileId) {
      return NextResponse.json({ error: 'fileId é obrigatório' }, { status: 400 });
    }

    // Buscar música para obter currentVersionId
    const { data: songData, error: songLookupError } = await supabase
      .from('Song')
      .select('id, currentVersionId')
      .or(`id.eq.${songIdOrSlug},slug.eq.${songIdOrSlug}`)
      .single();

    if (songLookupError || !songData?.currentVersionId) {
      return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 });
    }

    // Se marcando como principal, remover principal dos outros PDFs
    if (isPrincipal) {
      await supabase
        .from('SongFile')
        .update({ isPrincipal: false })
        .eq('songVersionId', songData.currentVersionId)
        .eq('fileType', 'PDF')
        .neq('id', fileId);
    }

    // Atualizar o ficheiro
    const { data: updatedFile, error: updateError } = await supabase
      .from('SongFile')
      .update({ isPrincipal })
      .eq('id', fileId)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to update file isPrincipal flag', {
        category: LogCategory.DATABASE,
        domain: { song_id: songIdOrSlug },
        user: { id: session.user.id, email: session.user.email },
        network: { ip_address: clientIp },
        error: { error_message: updateError.message }
      });
      return NextResponse.json({ error: 'Erro ao atualizar ficheiro' }, { status: 500 });
    }

    const duration = Date.now() - startTime;
    logger.success('File isPrincipal flag updated successfully', {
      category: LogCategory.UPLOAD,
      domain: { song_id: songIdOrSlug },
      user: { id: session.user.id, email: session.user.email, role: session.user.role },
      network: { ip_address: clientIp },
      http: {
        method: 'PATCH',
        status_code: 200
      },
      performance: { response_time_ms: duration },
      details: {
        file_id: fileId,
        is_principal: isPrincipal
      }
    });

    return NextResponse.json({ success: true, file: updatedFile });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Unexpected error in PATCH /api/admin/songs/[id]/files', {
      category: LogCategory.API,
      network: { ip_address: clientIp },
      http: { method: 'PATCH', status_code: 500 },
      performance: { response_time_ms: duration },
      error: {
        error_message: error instanceof Error ? error.message : String(error),
        stack_trace: error instanceof Error ? error.stack : undefined
      }
    });
    console.error('Error in PATCH /api/admin/songs/[id]/files:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
