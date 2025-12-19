import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';
import { logger } from '@/lib/logger';
import { LogCategory } from '@/types/logging';
import { getClientIP } from '@/lib/utils';

/**
 * GET /api/admin/submission/[id]/files
 * Buscar ficheiros de uma submissão (PDF e MP3 no storage)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientIp = getClientIP(req.headers);
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      logger.warn('Unauthorized submission files access attempt', {
        category: LogCategory.SECURITY,
        network: { ip_address: clientIp },
        http: { method: 'GET', status_code: 401 },
        tags: ['unauthorized', 'submission-files']
      });
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: submissionId } = await params;

    logger.info('Fetching submission files', {
      category: LogCategory.SUBMISSION,
      domain: { submission_id: submissionId },
      user: {
        user_id: session.user.id,
        user_email: session.user.email,
        user_role: session.user.role
      },
      network: { ip_address: clientIp },
      tags: ['submission-files', 'list']
    });

    // Listar ficheiros no storage para esta submissão
    const { data: files, error: listError } = await supabase.storage
      .from('songs')
      .list(`songs/${submissionId}`, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (listError) {
      logger.error('Failed to list submission files', {
        category: LogCategory.UPLOAD,
        domain: { submission_id: submissionId },
        user: {
          user_id: session.user.id,
          user_email: session.user.email
        },
        network: { ip_address: clientIp },
        error: {
          error_message: listError.message
        }
      });
      return NextResponse.json({ files: [] }, { status: 200 });
    }

    if (!files || files.length === 0) {
      const duration = Date.now() - startTime;
      logger.info('No files found for submission', {
        category: LogCategory.SUBMISSION,
        domain: { submission_id: submissionId },
        user: {
          user_id: session.user.id,
          user_email: session.user.email
        },
        network: { ip_address: clientIp },
        performance: { response_time_ms: duration }
      });
      return NextResponse.json({ files: [] }, { status: 200 });
    }

  // Tentar carregar metadados (ficheiro .metadata.json)
  // Key: storage filename in the submission folder
  // Value: { fileName, description, isPrincipal, ... }
  let fileMetadata: Record<string, { description?: string; fileName?: string; isPrincipal?: boolean }> = {};
    const { data: metadataFile } = await supabase.storage
      .from('songs')
      .download(`songs/${submissionId}/.metadata.json`);

    if (metadataFile) {
      try {
        const metadataText = await metadataFile.text();
        const parsedMetadata = JSON.parse(metadataText);
        fileMetadata = parsedMetadata;
      } catch (e) {
        console.warn('Failed to parse metadata file:', e);
      }
    }

    // Gerar signed URLs para cada ficheiro
    const filesWithUrls = await Promise.all(
      files
        .filter(file => !file.name.startsWith('.')) // Filtrar ficheiros ocultos (como .metadata.json)
        .map(async (file) => {
          const filePath = `songs/${submissionId}/${file.name}`;
          const { data: signedUrlData } = await supabase.storage
            .from('songs')
            .createSignedUrl(filePath, 3600); // 1 hora

          // Determinar tipo de ficheiro
          const ext = file.name.toLowerCase();
          let fileType = 'UNKNOWN';
          if (ext.endsWith('.pdf')) {
            fileType = 'PDF';
          } else if (ext.endsWith('.mp3') || ext.endsWith('.wav') || ext.endsWith('.ogg') || ext.endsWith('.m4a')) {
            fileType = 'AUDIO';
          }

          // Obter metadata do ficheiro (para edição na UI)
          const meta = fileMetadata[file.name] || {};
          const description = meta.description || '';
          const displayFileName = meta.fileName || file.name;
          const isPrincipal = Boolean(meta.isPrincipal);

          return {
            id: file.id,
            fileName: displayFileName,
            fileType,
            fileSize: file.metadata?.size || 0,
            signedUrl: signedUrlData?.signedUrl || null,
            uploadedAt: file.created_at,
            storageKey: filePath,
            description: description,
            isPrincipal: isPrincipal,
            storageFileName: file.name
          };
        })
    );

    const duration = Date.now() - startTime;
    logger.success('Submission files fetched successfully', {
      category: LogCategory.SUBMISSION,
      domain: { submission_id: submissionId },
      user: {
        user_id: session.user.id,
        user_email: session.user.email
      },
      network: { ip_address: clientIp },
      details: {
        file_count: filesWithUrls.length,
        pdf_count: filesWithUrls.filter(f => f.fileType === 'PDF').length,
        audio_count: filesWithUrls.filter(f => f.fileType === 'AUDIO').length
      },
      performance: { response_time_ms: duration },
      tags: ['submission-files', 'success']
    });

    return NextResponse.json({
      files: filesWithUrls
    }, { status: 200 });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error fetching submission files', {
      category: LogCategory.SYSTEM,
      network: { ip_address: clientIp },
      error: {
        error_message: error instanceof Error ? error.message : String(error),
        stack_trace: error instanceof Error ? error.stack : undefined
      },
      performance: { response_time_ms: duration },
      tags: ['submission-files', 'error']
    });

    return NextResponse.json(
      { error: 'Erro ao buscar ficheiros da submissão' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/submission/[id]/files
 * Upload new files to a submission
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientIp = getClientIP(req.headers);
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      logger.warn('Unauthorized submission file upload attempt', {
        category: LogCategory.SECURITY,
        network: { ip_address: clientIp },
        http: { method: 'POST', status_code: 401 },
        tags: ['unauthorized', 'submission-files']
      });
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: submissionId } = await params;
    const formData = await req.formData();
    const uploadedFiles = formData.getAll('files') as File[];

    if (!uploadedFiles || uploadedFiles.length === 0) {
      return NextResponse.json({ error: 'Nenhum ficheiro fornecido' }, { status: 400 });
    }

    logger.info('Uploading files to submission', {
      category: LogCategory.UPLOAD,
      domain: { submission_id: submissionId },
      user: {
        user_id: session.user.id,
        user_email: session.user.email,
        user_role: session.user.role
      },
      network: { ip_address: clientIp },
      details: { file_count: uploadedFiles.length }
    });

    const uploadedFileObjects = [];

    for (const file of uploadedFiles) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const allowedExtensions = ['pdf', 'mp3', 'wav', 'ogg', 'm4a'];

      if (!allowedExtensions.includes(ext)) {
        logger.warn('Invalid file extension attempted', {
          category: LogCategory.UPLOAD,
          domain: { submission_id: submissionId },
          details: { file_name: file.name, extension: ext }
        });
        continue;
      }

      const fileName = `${Date.now()}_${file.name}`;
      const storagePath = `songs/${submissionId}/${fileName}`;
      const buffer = await file.arrayBuffer();

      const { data, error: uploadError } = await supabase.storage
        .from('songs')
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        logger.error('File upload failed', {
          category: LogCategory.UPLOAD,
          domain: { submission_id: submissionId },
          details: { file_name: file.name },
          error: { error_message: uploadError.message }
        });
        continue;
      }

      // Generate signed URL
      const { data: signedUrlData } = await supabase.storage
        .from('songs')
        .createSignedUrl(storagePath, 3600);

      let fileType = 'UNKNOWN';
      if (ext === 'pdf') {
        fileType = 'PDF';
      } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
        fileType = 'AUDIO';
      }

      uploadedFileObjects.push({
        id: data?.path || fileName,
        fileName: file.name,
        fileType,
        fileSize: file.size,
        signedUrl: signedUrlData?.signedUrl || null,
        uploadedAt: new Date().toISOString(),
        storageKey: storagePath,
        description: ''
      });
    }

    const duration = Date.now() - startTime;
    logger.success('Files uploaded successfully', {
      category: LogCategory.UPLOAD,
      domain: { submission_id: submissionId },
      user: {
        user_id: session.user.id,
        user_email: session.user.email
      },
      network: { ip_address: clientIp },
      details: { uploaded_count: uploadedFileObjects.length },
      performance: { response_time_ms: duration }
    });

    return NextResponse.json({
      files: uploadedFileObjects
    }, { status: 200 });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error uploading files to submission', {
      category: LogCategory.SYSTEM,
      network: { ip_address: clientIp },
      error: {
        error_message: error instanceof Error ? error.message : String(error),
        stack_trace: error instanceof Error ? error.stack : undefined
      },
      performance: { response_time_ms: duration },
      tags: ['submission-files', 'upload', 'error']
    });

    return NextResponse.json(
      { error: 'Erro ao enviar ficheiros para a submissão' },
      { status: 500 }
    );
  }
}

