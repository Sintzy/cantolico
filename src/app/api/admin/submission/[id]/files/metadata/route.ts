import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';
import { logger } from '@/lib/logger';
import { LogCategory } from '@/types/logging';
import { getClientIP } from '@/lib/utils';

export const runtime = 'nodejs';

type MetadataEntry = {
  fileName?: string;
  description?: string;
  fileType?: string;
  isPrincipal?: boolean;
};

type MetadataMap = Record<string, MetadataEntry>;

/**
 * PATCH /api/admin/submission/[id]/files/metadata
 * Persists reviewer edits for submission files in `songs/<submissionId>/.metadata.json`.
 *
 * Body:
 * {
 *   "filename": "<storageFileName>",
 *   "fileName": "<display name>",
 *   "description": "...",
 *   "isPrincipal": true|false
 * }
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

    const { id: submissionId } = await params;
    const body = (await req.json()) as {
      filename?: string;
      fileName?: string;
      description?: string;
      isPrincipal?: boolean;
    };

    const filename = body.filename?.trim();
    if (!filename) {
      return NextResponse.json({ error: 'filename é obrigatório' }, { status: 400 });
    }

    const metadataPath = `songs/${submissionId}/.metadata.json`;

    // Load existing metadata (if any)
    let metadata: MetadataMap = {};
    const { data: metadataFile } = await supabase.storage.from('songs').download(metadataPath);
    if (metadataFile) {
      try {
        const text = await metadataFile.text();
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') metadata = parsed;
      } catch {
        // ignore invalid metadata and overwrite
        metadata = {};
      }
    }

    // Merge patch
    const prev: MetadataEntry = metadata[filename] || {};
    metadata[filename] = {
      ...prev,
      ...(body.fileName !== undefined ? { fileName: body.fileName } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.isPrincipal !== undefined ? { isPrincipal: body.isPrincipal } : {}),
    };

    // If setting principal true, unset it for other files
    if (body.isPrincipal === true) {
      for (const key of Object.keys(metadata)) {
        if (key !== filename && metadata[key]?.isPrincipal) {
          metadata[key] = { ...metadata[key], isPrincipal: false };
        }
      }
    }

    const content = JSON.stringify(metadata, null, 2);
    const { error: uploadError } = await supabase.storage
      .from('songs')
      .upload(metadataPath, content, {
        contentType: 'application/json',
        upsert: true,
        cacheControl: '0'
      });

    if (uploadError) {
      logger.error('Failed to persist submission metadata', {
        category: LogCategory.SUBMISSION,
        domain: { submission_id: submissionId },
        network: { ip_address: clientIp },
        user: { user_id: session.user.id, user_email: session.user.email },
        error: { error_message: uploadError.message },
      });
      return NextResponse.json({ error: 'Erro ao guardar metadados' }, { status: 500 });
    }

    const duration = Date.now() - startTime;
    logger.success('Submission metadata updated', {
      category: LogCategory.SUBMISSION,
      domain: { submission_id: submissionId },
      network: { ip_address: clientIp },
      user: { user_id: session.user.id, user_email: session.user.email },
      performance: { response_time_ms: duration },
      details: { filename, updated: Object.keys(body).filter(k => k !== 'filename') }
    });

    return NextResponse.json({ success: true, metadata });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error updating submission metadata', {
      category: LogCategory.SYSTEM,
      network: { ip_address: clientIp },
      performance: { response_time_ms: duration },
      error: {
        error_message: error instanceof Error ? error.message : String(error),
        stack_trace: error instanceof Error ? error.stack : undefined,
      },
    });

    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
