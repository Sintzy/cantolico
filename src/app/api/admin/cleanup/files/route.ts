import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredFiles, findAndMarkOrphanedFiles } from '@/lib/file-cleanup';
import { logger } from '@/lib/logger';
import { LogCategory, LogLevel } from '@/types/logging';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getClientIP } from '@/lib/utils';

/**
 * API para limpeza automática de ficheiros
 * 
 * - Pode ser chamado manualmente por admins
 * - Pode ser executado automaticamente via Vercel Cron
 * 
 * GET: Executa limpeza de ficheiros expirados (deletedAt > 30 dias)
 * POST: Força scan de ficheiros órfãos + limpeza
 */

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const clientIp = getClientIP(request.headers);
  
  try {
    // Verificar autenticação (admin ou cron)
    const isCronJob = request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
    
    if (!isCronJob) {
      const session = await getServerSession(authOptions);
      
      if (!session?.user) {
        logger.warn('Unauthorized cleanup attempt - no session', {
          category: LogCategory.SECURITY,
          level: LogLevel.WARN,
          network: { ip_address: clientIp },
          tags: ['unauthorized', 'file-cleanup']
        });
        
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      if (session.user.role !== 'ADMIN') {
        logger.warn('Unauthorized cleanup attempt - not admin', {
          category: LogCategory.SECURITY,
          level: LogLevel.WARN,
          user: {
            user_id: session.user.id,
            user_email: session.user.email || null,
            user_role: session.user.role
          },
          network: { ip_address: clientIp },
          tags: ['unauthorized', 'file-cleanup']
        });
        
        return NextResponse.json(
          { error: 'Forbidden - Admin only' },
          { status: 403 }
        );
      }

      logger.info('Manual file cleanup triggered', {
        category: LogCategory.ADMIN,
        user: {
          user_id: session.user.id,
          user_email: session.user.email || null,
          user_role: session.user.role
        },
        network: { ip_address: clientIp },
        tags: ['file-cleanup', 'manual-trigger']
      });
    } else {
      logger.info('Cron file cleanup triggered', {
        category: LogCategory.SYSTEM,
        tags: ['file-cleanup', 'cron-trigger']
      });
    }

    // Executar limpeza
    const result = await cleanupExpiredFiles();

    const duration = Date.now() - startTime;

    logger.success('File cleanup completed successfully', {
      category: LogCategory.SYSTEM,
      performance: {
        response_time_ms: duration
      },
      details: {
        total_processed: result.totalProcessed,
        successfully_deleted: result.successfullyDeleted,
        failed_deletions: result.failedDeletions,
        total_size_cleaned_mb: (result.totalSizeCleaned / (1024 * 1024)).toFixed(2),
        error_count: result.errors.length
      },
      tags: ['file-cleanup', 'completed']
    });

    return NextResponse.json({
      success: true,
      message: 'File cleanup completed',
      statistics: {
        totalProcessed: result.totalProcessed,
        successfullyDeleted: result.successfullyDeleted,
        failedDeletions: result.failedDeletions,
        totalSizeCleanedMB: (result.totalSizeCleaned / (1024 * 1024)).toFixed(2),
        errors: result.errors,
        deletedFiles: result.deletedFiles.map(f => ({
          fileName: f.fileName,
          fileSizeKB: (f.fileSize / 1024).toFixed(2),
          reason: f.reason
        })),
        durationMs: duration
      }
    }, { status: 200 });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Critical error during file cleanup', {
      category: LogCategory.SYSTEM,
      level: LogLevel.ERROR,
      performance: {
        response_time_ms: duration
      },
      error: {
        error_message: error instanceof Error ? error.message : String(error),
        stack_trace: error instanceof Error ? error.stack : undefined
      },
      network: { ip_address: clientIp },
      tags: ['file-cleanup', 'critical-error']
    });

    return NextResponse.json(
      { 
        error: 'Internal server error during cleanup',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * POST: Executa scan de ficheiros órfãos e depois limpeza
 * Útil para manutenção manual
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientIp = getClientIP(request.headers);
  
  try {
    // Apenas admins podem executar este endpoint
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      logger.warn('Unauthorized orphan scan attempt - no session', {
        category: LogCategory.SECURITY,
        level: LogLevel.WARN,
        network: { ip_address: clientIp },
        tags: ['unauthorized', 'orphan-scan']
      });
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (session.user.role !== 'ADMIN') {
      logger.warn('Unauthorized orphan scan attempt - not admin', {
        category: LogCategory.SECURITY,
        level: LogLevel.WARN,
        user: {
          user_id: session.user.id,
          user_email: session.user.email || null,
          user_role: session.user.role
        },
        network: { ip_address: clientIp },
        tags: ['unauthorized', 'orphan-scan']
      });
      
      return NextResponse.json(
        { error: 'Forbidden - Admin only' },
        { status: 403 }
      );
    }

    logger.info('Orphan scan and cleanup triggered', {
      category: LogCategory.ADMIN,
      user: {
        user_id: session.user.id,
        user_email: session.user.email || null,
        user_role: session.user.role
      },
      network: { ip_address: clientIp },
      tags: ['orphan-scan', 'manual-trigger']
    });

    // 1. Procurar ficheiros órfãos
    const orphanResult = await findAndMarkOrphanedFiles();
    
    // 2. Executar limpeza normal
    const cleanupResult = await cleanupExpiredFiles();

    const duration = Date.now() - startTime;

    logger.success('Orphan scan and cleanup completed', {
      category: LogCategory.ADMIN,
      user: {
        user_id: session.user.id,
        user_email: session.user.email || null,
        user_role: session.user.role
      },
      performance: {
        response_time_ms: duration
      },
      details: {
        orphans_found: orphanResult.orphanedCount,
        files_cleaned: cleanupResult.successfullyDeleted,
        total_size_mb: (cleanupResult.totalSizeCleaned / (1024 * 1024)).toFixed(2)
      },
      network: { ip_address: clientIp },
      tags: ['orphan-scan', 'cleanup', 'completed']
    });

    return NextResponse.json({
      success: true,
      message: 'Orphan scan and cleanup completed',
      statistics: {
        orphanScan: {
          orphansFound: orphanResult.orphanedCount,
          markedForDeletion: orphanResult.orphanedCount
        },
        cleanup: {
          totalProcessed: cleanupResult.totalProcessed,
          successfullyDeleted: cleanupResult.successfullyDeleted,
          failedDeletions: cleanupResult.failedDeletions,
          totalSizeCleanedMB: (cleanupResult.totalSizeCleaned / (1024 * 1024)).toFixed(2),
          errors: cleanupResult.errors
        },
        durationMs: duration
      }
    }, { status: 200 });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Critical error during orphan scan and cleanup', {
      category: LogCategory.SYSTEM,
      level: LogLevel.ERROR,
      performance: {
        response_time_ms: duration
      },
      error: {
        error_message: error instanceof Error ? error.message : String(error),
        stack_trace: error instanceof Error ? error.stack : undefined
      },
      network: { ip_address: clientIp },
      tags: ['orphan-scan', 'cleanup', 'critical-error']
    });

    return NextResponse.json(
      { 
        error: 'Internal server error during orphan scan and cleanup',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
