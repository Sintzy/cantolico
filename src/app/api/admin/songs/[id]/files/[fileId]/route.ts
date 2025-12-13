import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';
import { logger } from '@/lib/logger';
import { LogCategory } from '@/types/logging';
import { getClientIP } from '@/lib/utils';

/**
 * PATCH /api/admin/songs/[id]/files/[fileId]
 * Atualiza informações de um ficheiro (ex: descrição)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const clientIp = getClientIP(req.headers);
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar permissões (admin ou reviewer)
    const userRole = (session.user as any).role;
    if (!['ADMIN', 'REVIEWER'].includes(userRole)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { id: songId, fileId } = await params;
    const body = await req.json();
    const { description } = body;

    logger.info('Updating song file', {
      category: LogCategory.UPLOAD,
      user: { user_id: session.user.id, user_email: session.user.email },
      network: { ip_address: clientIp },
      domain: { song_id: songId },
      details: { file_id: fileId, new_description: description }
    });

    // Verificar se o ficheiro existe e pertence à música
    const { data: file, error: fileError } = await supabase
      .from('SongFile')
      .select('id, songVersionId')
      .eq('id', fileId)
      .single();

    if (fileError || !file) {
      return NextResponse.json({ error: 'Ficheiro não encontrado' }, { status: 404 });
    }

    // Verificar se a versão pertence à música
    const { data: version, error: versionError } = await supabase
      .from('SongVersion')
      .select('songId')
      .eq('id', file.songVersionId)
      .single();

    if (versionError || !version || version.songId !== songId) {
      return NextResponse.json({ error: 'Ficheiro não pertence a esta música' }, { status: 400 });
    }

    // Atualizar a descrição
    const updateData: Record<string, any> = {};
    if (description !== undefined) {
      updateData.description = description;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('SongFile')
      .update(updateData)
      .eq('id', fileId);

    if (updateError) {
      logger.error('Error updating song file', {
        category: LogCategory.DATABASE,
        user: { user_id: session.user.id },
        network: { ip_address: clientIp },
        domain: { song_id: songId },
        error: { error_message: updateError.message }
      });
      return NextResponse.json({ error: 'Erro ao atualizar ficheiro' }, { status: 500 });
    }

    const duration = Date.now() - startTime;
    logger.success('Song file updated successfully', {
      category: LogCategory.UPLOAD,
      user: { user_id: session.user.id, user_email: session.user.email },
      network: { ip_address: clientIp },
      domain: { song_id: songId },
      details: { file_id: fileId },
      performance: { response_time_ms: duration }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Unexpected error in PATCH /api/admin/songs/[id]/files/[fileId]', {
      category: LogCategory.API,
      network: { ip_address: clientIp },
      error: { error_message: error instanceof Error ? error.message : String(error) }
    });
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/songs/[id]/files/[fileId]
 * Remove um ficheiro de uma música
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const clientIp = getClientIP(req.headers);
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar permissões (admin ou reviewer)
    const userRole = (session.user as any).role;
    if (!['ADMIN', 'REVIEWER'].includes(userRole)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { id: songId, fileId } = await params;

    logger.info('Deleting song file', {
      category: LogCategory.UPLOAD,
      user: { user_id: session.user.id, user_email: session.user.email },
      network: { ip_address: clientIp },
      domain: { song_id: songId },
      details: { file_id: fileId }
    });

    // Buscar o ficheiro para obter o fileKey
    const { data: file, error: fileError } = await supabase
      .from('SongFile')
      .select('id, fileKey, songVersionId')
      .eq('id', fileId)
      .single();

    if (fileError || !file) {
      return NextResponse.json({ error: 'Ficheiro não encontrado' }, { status: 404 });
    }

    // Verificar se a versão pertence à música
    const { data: version, error: versionError } = await supabase
      .from('SongVersion')
      .select('songId')
      .eq('id', file.songVersionId)
      .single();

    if (versionError || !version || version.songId !== songId) {
      return NextResponse.json({ error: 'Ficheiro não pertence a esta música' }, { status: 400 });
    }

    // Remover do Storage
    if (file.fileKey) {
      const { error: storageError } = await supabase.storage
        .from('songs')
        .remove([file.fileKey]);

      if (storageError) {
        console.warn('Erro ao remover ficheiro do storage:', storageError);
        // Continua mesmo assim para remover do banco de dados
      }
    }

    // Remover do banco de dados
    const { error: deleteError } = await supabase
      .from('SongFile')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      logger.error('Error deleting song file from database', {
        category: LogCategory.DATABASE,
        user: { user_id: session.user.id },
        network: { ip_address: clientIp },
        domain: { song_id: songId },
        error: { error_message: deleteError.message }
      });
      return NextResponse.json({ error: 'Erro ao eliminar ficheiro' }, { status: 500 });
    }

    const duration = Date.now() - startTime;
    logger.success('Song file deleted successfully', {
      category: LogCategory.UPLOAD,
      user: { user_id: session.user.id, user_email: session.user.email },
      network: { ip_address: clientIp },
      domain: { song_id: songId },
      details: { file_id: fileId, file_key: file.fileKey },
      performance: { response_time_ms: duration }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Unexpected error in DELETE /api/admin/songs/[id]/files/[fileId]', {
      category: LogCategory.API,
      network: { ip_address: clientIp },
      error: { error_message: error instanceof Error ? error.message : String(error) }
    });
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
