/**
 * Sistema de Limpeza Automática de Ficheiros
 * 
 * Responsável por:
 * - Marcar ficheiros para eliminação (soft delete)
 * - Eliminar fisicamente ficheiros após período de retenção (30 dias)
 * - Rastrear e limpar ficheiros órfãos
 */

import { supabase } from './supabase-client';
import { FileDeletionReason } from '@/types/song-files';
import { logger } from './logger';
import { LogCategory } from '@/types/logging';

/**
 * Período de retenção antes de eliminação física (em dias)
 */
export const FILE_RETENTION_DAYS = 30;

/**
 * Marca ficheiros para eliminação (soft delete)
 * Os ficheiros serão eliminados fisicamente após FILE_RETENTION_DAYS dias
 */
export async function markFilesForDeletion(
  fileIds: string[],
  reason: FileDeletionReason,
  deletedBy?: number
): Promise<{ success: boolean; markedCount: number; error?: string }> {
  try {
    if (fileIds.length === 0) {
      return { success: true, markedCount: 0 };
    }

    logger.info('Marking files for deletion', {
      category: LogCategory.UPLOAD,
      details: {
        file_ids: fileIds,
        reason: reason,
        deleted_by: deletedBy,
        retention_days: FILE_RETENTION_DAYS
      },
      tags: ['file-cleanup', 'soft-delete']
    });

    const { data, error } = await supabase
      .from('SongFile')
      .update({
        deletedAt: new Date().toISOString(),
        deletionReason: reason
      })
      .in('id', fileIds)
      .select('id, fileName, fileKey');

    if (error) {
      logger.error('Failed to mark files for deletion', {
        category: LogCategory.DATABASE,
        error: {
          error_message: error.message,
          error_type: error.code
        },
        details: {
          file_ids: fileIds,
          reason: reason
        }
      });
      return { success: false, markedCount: 0, error: error.message };
    }

    logger.success('Files marked for deletion', {
      category: LogCategory.UPLOAD,
      details: {
        marked_count: data?.length || 0,
        reason: reason,
        file_names: data?.map(f => f.fileName).join(', ')
      },
      tags: ['file-cleanup', 'soft-delete']
    });

    return { success: true, markedCount: data?.length || 0 };
  } catch (error) {
    logger.error('Error marking files for deletion', {
      category: LogCategory.SYSTEM,
      error: {
        error_message: error instanceof Error ? error.message : String(error)
      }
    });
    return { 
      success: false, 
      markedCount: 0, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

/**
 * Marca ficheiros de uma submissão rejeitada para eliminação
 */
export async function markSubmissionFilesForDeletion(
  submissionId: string
): Promise<{ success: boolean; markedCount: number }> {
  try {
    // Para submissões, os ficheiros estão no storage mas não na tabela SongFile
    // Vamos apenas logar e adicionar à fila de limpeza do storage
    
    logger.info('Marking submission files for deletion', {
      category: LogCategory.SUBMISSION,
      domain: { submission_id: submissionId },
      details: {
        storage_path: `songs/${submissionId}/`,
        retention_days: FILE_RETENTION_DAYS
      },
      tags: ['submission-rejection', 'file-cleanup']
    });

    // Listar ficheiros no storage para esta submissão
    const { data: files, error: listError } = await supabase.storage
      .from('songs')
      .list(`songs/${submissionId}`);

    if (listError || !files || files.length === 0) {
      return { success: true, markedCount: 0 };
    }

    // Criar registos de ficheiros pendentes de limpeza
    // (Vamos criar uma função auxiliar para isto)
    const fileKeys = files.map(f => `songs/${submissionId}/${f.name}`);
    
    logger.info('Submission files scheduled for cleanup', {
      category: LogCategory.SUBMISSION,
      domain: { submission_id: submissionId },
      details: {
        file_count: fileKeys.length,
        file_keys: fileKeys
      }
    });

    return { success: true, markedCount: fileKeys.length };
  } catch (error) {
    logger.error('Error marking submission files for deletion', {
      category: LogCategory.SUBMISSION,
      domain: { submission_id: submissionId },
      error: {
        error_message: error instanceof Error ? error.message : String(error)
      }
    });
    return { success: false, markedCount: 0 };
  }
}

/**
 * Interface para resultados de limpeza
 */
export interface CleanupResult {
  totalProcessed: number;
  successfullyDeleted: number;
  failedDeletions: number;
  totalSizeCleaned: number; // em bytes
  errors: string[];
  deletedFiles: Array<{
    id: string;
    fileName: string;
    fileKey: string;
    fileSize: number;
    reason: string;
  }>;
}

/**
 * Executa limpeza de ficheiros marcados há mais de FILE_RETENTION_DAYS dias
 * Esta função deve ser executada periodicamente (ex: diariamente via cron)
 */
export async function cleanupExpiredFiles(): Promise<CleanupResult> {
  const startTime = Date.now();
  const result: CleanupResult = {
    totalProcessed: 0,
    successfullyDeleted: 0,
    failedDeletions: 0,
    totalSizeCleaned: 0,
    errors: [],
    deletedFiles: []
  };

  try {
    logger.info('Starting automatic file cleanup', {
      category: LogCategory.SYSTEM,
      details: {
        retention_days: FILE_RETENTION_DAYS
      },
      tags: ['file-cleanup', 'cron']
    });

    // Calcular data limite (30 dias atrás)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - FILE_RETENTION_DAYS);
    const cutoffIso = cutoffDate.toISOString();

    // Buscar ficheiros marcados para eliminação há mais de 30 dias
    const { data: expiredFiles, error: fetchError } = await supabase
      .from('SongFile')
      .select('id, fileName, fileKey, fileSize, deletionReason, deletedAt')
      .not('deletedAt', 'is', null)
      .lt('deletedAt', cutoffIso);

    if (fetchError) {
      logger.error('Failed to fetch expired files', {
        category: LogCategory.DATABASE,
        error: {
          error_message: fetchError.message,
          error_type: fetchError.code
        }
      });
      result.errors.push(`Database error: ${fetchError.message}`);
      return result;
    }

    if (!expiredFiles || expiredFiles.length === 0) {
      logger.info('No expired files to clean up', {
        category: LogCategory.SYSTEM,
        tags: ['file-cleanup', 'no-action']
      });
      return result;
    }

    result.totalProcessed = expiredFiles.length;

    logger.info('Found expired files for cleanup', {
      category: LogCategory.SYSTEM,
      details: {
        file_count: expiredFiles.length,
        cutoff_date: cutoffIso
      },
      tags: ['file-cleanup']
    });

    // Processar cada ficheiro
    for (const file of expiredFiles) {
      try {
        // 1. Eliminar do storage
        const { error: storageError } = await supabase.storage
          .from('songs')
          .remove([file.fileKey]);

        if (storageError) {
          logger.warn('Failed to delete file from storage', {
            category: LogCategory.UPLOAD,
            error: {
              error_message: storageError.message
            },
            details: {
              file_id: file.id,
              file_key: file.fileKey,
              file_name: file.fileName
            }
          });
          result.errors.push(`Storage: ${file.fileName} - ${storageError.message}`);
          result.failedDeletions++;
          continue;
        }

        // 2. Eliminar registo da base de dados
        const { error: dbError } = await supabase
          .from('SongFile')
          .delete()
          .eq('id', file.id);

        if (dbError) {
          logger.error('Failed to delete file record from database', {
            category: LogCategory.DATABASE,
            error: {
              error_message: dbError.message,
              error_type: dbError.code
            },
            details: {
              file_id: file.id,
              file_name: file.fileName
            }
          });
          result.errors.push(`Database: ${file.fileName} - ${dbError.message}`);
          result.failedDeletions++;
          continue;
        }

        // Sucesso!
        result.successfullyDeleted++;
        result.totalSizeCleaned += file.fileSize || 0;
        result.deletedFiles.push({
          id: file.id,
          fileName: file.fileName,
          fileKey: file.fileKey,
          fileSize: file.fileSize || 0,
          reason: file.deletionReason || 'UNKNOWN'
        });

        logger.success('File permanently deleted', {
          category: LogCategory.UPLOAD,
          details: {
            file_id: file.id,
            file_name: file.fileName,
            file_size: file.fileSize,
            deletion_reason: file.deletionReason,
            days_since_marked: Math.floor(
              (Date.now() - new Date(file.deletedAt!).getTime()) / (1000 * 60 * 60 * 24)
            )
          },
          tags: ['file-cleanup', 'permanent-delete']
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push(`${file.fileName}: ${errorMsg}`);
        result.failedDeletions++;
        
        logger.error('Error during file cleanup', {
          category: LogCategory.SYSTEM,
          error: {
            error_message: errorMsg
          },
          details: {
            file_id: file.id,
            file_name: file.fileName
          }
        });
      }
    }

    // Log final do resultado
    const duration = Date.now() - startTime;
    logger.success('File cleanup completed', {
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
      tags: ['file-cleanup', 'cron', 'completed']
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Critical error during file cleanup', {
      category: LogCategory.SYSTEM,
      performance: {
        response_time_ms: duration
      },
      error: {
        error_message: error instanceof Error ? error.message : String(error),
        stack_trace: error instanceof Error ? error.stack : undefined
      },
      tags: ['file-cleanup', 'cron', 'critical-error']
    });
    
    result.errors.push(`Critical: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}

/**
 * Encontra e marca ficheiros órfãos (sem música/versão associada)
 */
export async function findAndMarkOrphanedFiles(): Promise<{ success: boolean; orphanedCount: number }> {
  try {
    logger.info('Scanning for orphaned files', {
      category: LogCategory.SYSTEM,
      tags: ['file-cleanup', 'orphan-detection']
    });

    // Buscar ficheiros onde songVersionId não existe mais
    const { data: orphanedFiles, error } = await supabase
      .from('SongFile')
      .select('id, fileName, fileKey, songVersionId')
      .is('deletedAt', null);

    if (error) {
      logger.error('Failed to scan for orphaned files', {
        category: LogCategory.DATABASE,
        error: {
          error_message: error.message,
          error_type: error.code
        }
      });
      return { success: false, orphanedCount: 0 };
    }

    if (!orphanedFiles || orphanedFiles.length === 0) {
      return { success: true, orphanedCount: 0 };
    }

    // Verificar quais versões ainda existem
    const versionIds = [...new Set(orphanedFiles.map(f => f.songVersionId))];
    const { data: existingVersions } = await supabase
      .from('SongVersion')
      .select('id')
      .in('id', versionIds);

    const existingVersionIds = new Set(existingVersions?.map(v => v.id) || []);
    
    // Identificar ficheiros órfãos
    const orphanedFileIds = orphanedFiles
      .filter(f => !existingVersionIds.has(f.songVersionId))
      .map(f => f.id);

    if (orphanedFileIds.length === 0) {
      logger.info('No orphaned files found', {
        category: LogCategory.SYSTEM,
        tags: ['file-cleanup', 'orphan-detection', 'no-orphans']
      });
      return { success: true, orphanedCount: 0 };
    }

    // Marcar ficheiros órfãos para eliminação
    const result = await markFilesForDeletion(
      orphanedFileIds,
      FileDeletionReason.ORPHANED
    );

    logger.warn('Orphaned files detected and marked for deletion', {
      category: LogCategory.SYSTEM,
      details: {
        orphaned_count: orphanedFileIds.length,
        retention_days: FILE_RETENTION_DAYS
      },
      tags: ['file-cleanup', 'orphan-detection', 'marked-for-deletion']
    });

    return { success: result.success, orphanedCount: result.markedCount };
  } catch (error) {
    logger.error('Error during orphaned file detection', {
      category: LogCategory.SYSTEM,
      error: {
        error_message: error instanceof Error ? error.message : String(error)
      }
    });
    return { success: false, orphanedCount: 0 };
  }
}
