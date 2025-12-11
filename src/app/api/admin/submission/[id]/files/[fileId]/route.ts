import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';
import { logger } from '@/lib/logger';
import { LogCategory } from '@/types/logging';
import { getClientIP } from '@/lib/utils';

/**
 * DELETE /api/admin/submission/[id]/files/[fileId]
 * Delete a specific file from a submission
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const clientIp = getClientIP(req.headers);
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      logger.warn('Unauthorized file deletion attempt', {
        category: LogCategory.SECURITY,
        network: { ip_address: clientIp },
        http: { method: 'DELETE', status_code: 401 },
        tags: ['unauthorized', 'file-deletion']
      });
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: submissionId, fileId } = await params;

    logger.info('Attempting to delete submission file', {
      category: LogCategory.UPLOAD,
      domain: { submission_id: submissionId },
      user: {
        user_id: session.user.id,
        user_email: session.user.email,
        user_role: session.user.role
      },
      network: { ip_address: clientIp },
      details: { file_id: fileId }
    });

    // Decode the fileId if it's URL-encoded
    const decodedFileId = decodeURIComponent(fileId);
    
    // Construct the storage path - the fileId should contain the full path
    let storagePath = decodedFileId;
    
    // If it's just a filename, construct the full path
    if (!storagePath.includes('/')) {
      storagePath = `songs/${submissionId}/${decodedFileId}`;
    }

    // Delete the file from storage
    const { error: deleteError } = await supabase.storage
      .from('songs')
      .remove([storagePath]);

    if (deleteError) {
      logger.error('Failed to delete file from storage', {
        category: LogCategory.UPLOAD,
        domain: { submission_id: submissionId },
        details: { file_id: fileId, storage_path: storagePath },
        error: { error_message: deleteError.message }
      });
      return NextResponse.json(
        { error: 'Erro ao apagar ficheiro do storage' },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    logger.success('File deleted successfully', {
      category: LogCategory.UPLOAD,
      domain: { submission_id: submissionId },
      user: {
        user_id: session.user.id,
        user_email: session.user.email
      },
      network: { ip_address: clientIp },
      details: { file_id: fileId, storage_path: storagePath },
      performance: { response_time_ms: duration },
      tags: ['file-deletion', 'success']
    });

    return NextResponse.json({
      success: true,
      message: 'Ficheiro apagado com sucesso'
    }, { status: 200 });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error deleting submission file', {
      category: LogCategory.SYSTEM,
      network: { ip_address: clientIp },
      error: {
        error_message: error instanceof Error ? error.message : String(error),
        stack_trace: error instanceof Error ? error.stack : undefined
      },
      performance: { response_time_ms: duration },
      tags: ['file-deletion', 'error']
    });

    return NextResponse.json(
      { error: 'Erro ao apagar ficheiro da submissão' },
      { status: 500 }
    );
  }
}
