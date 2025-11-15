import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase-client";
import { logAuthAction, logAdminAction, getUserInfoFromRequest, logProfileAction } from "@/lib/user-action-logger";
import { logSystemEvent } from "@/lib/enhanced-logging";
import { logErrors } from "@/lib/logs";

export async function DELETE(req: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Não autorizado. É necessário fazer login." },
        { status: 401 }
      );
    }

    // Obter informações de IP e User Agent para logs
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const body = await req.json();
    const { targetUserId, reason, adminAction = false } = body;

    // Determinar se é auto-eliminação ou eliminação por admin
    const isAdminAction = adminAction && session.user.role === 'ADMIN' && targetUserId && targetUserId !== session.user.id;
    const userIdToDelete = isAdminAction ? targetUserId : session.user.id;

    console.log(`🗑️ Iniciando eliminação de conta para utilizador ${userIdToDelete}`, {
      isAdminAction,
      performedBy: session.user.id,
      targetUser: userIdToDelete,
      reason: reason || 'Não especificada'
    });

    // Se é ação de admin, verificar permissões
    if (isAdminAction) {
      if (session.user.role !== 'ADMIN') {
        await logErrors('WARN', 'Tentativa de eliminação não autorizada', 'Utilizador sem permissões tentou eliminar conta de outro utilizador', {
          attemptedBy: session.user.id,
          targetUser: userIdToDelete,
          userRole: session.user.role,
          ip,
          userAgent
        });

        return NextResponse.json(
          { error: "Acesso negado. Apenas administradores podem eliminar contas de outros utilizadores." },
          { status: 403 }
        );
      }

      // Verificar se não está a tentar eliminar outro admin
      const { data: targetUser, error: fetchError } = await supabase
        .from('User')
        .select('role, name, email')
        .eq('id', userIdToDelete)
        .single();

      if (fetchError || !targetUser) {
        return NextResponse.json(
          { error: "Utilizador não encontrado." },
          { status: 404 }
        );
      }

      if (targetUser.role === 'ADMIN') {
        await logErrors('WARN', 'Tentativa de eliminação de admin', 'Admin tentou eliminar conta de outro admin', {
          attemptedBy: session.user.id,
          targetUser: userIdToDelete,
          targetUserRole: targetUser.role,
          ip,
          userAgent
        });

        return NextResponse.json(
          { error: "Não é possível eliminar contas de outros administradores." },
          { status: 403 }
        );
      }
    }

    // Buscar dados completos do utilizador antes da eliminação (para logs)
    const { data: userToDelete, error: userFetchError } = await supabase
      .from('User')
      .select('*')
      .eq('id', userIdToDelete)
      .single();

    if (userFetchError || !userToDelete) {
      await logErrors('ERROR', 'Utilizador não encontrado para eliminação', 'Tentativa de eliminar utilizador inexistente', {
        targetUserId: userIdToDelete,
        performedBy: session.user.id,
        isAdminAction,
        ip,
        userAgent
      });

      return NextResponse.json(
        { error: "Utilizador não encontrado." },
        { status: 404 }
      );
    }

    // Contar estatísticas antes da eliminação
    const [
      { data: musicsData },
      { data: playlistsData },
      { data: starredData }
    ] = await Promise.all([
      supabase.from('Music').select('id, status').eq('uploadedBy', userIdToDelete),
      supabase.from('Playlist').select('id').eq('createdBy', userIdToDelete),
      supabase.from('StarredSong').select('id').eq('userId', userIdToDelete)
    ]);

    const stats = {
      totalMusics: musicsData?.length || 0,
      approvedMusics: musicsData?.filter(m => m.status === 'APPROVED').length || 0,
      pendingMusics: musicsData?.filter(m => m.status === 'PENDING').length || 0,
      rejectedMusics: musicsData?.filter(m => m.status === 'REJECTED').length || 0,
      totalPlaylists: playlistsData?.length || 0,
      totalStarredSongs: starredData?.length || 0
    };

    // Log do evento antes da eliminação (user-action logger)
    const requesterInfo = getUserInfoFromRequest(req, session);
    if (isAdminAction) {
      await logAdminAction('delete_user_account', requesterInfo, true, {
        targetUserId: userIdToDelete,
        targetUserEmail: userToDelete.email,
        targetUserName: userToDelete.name,
        isAdminAction,
        reason: reason || 'Eliminação administrativa',
        userStats: stats
      });
    } else {
      await logProfileAction('delete_account_initiated', requesterInfo, true, {
        targetUserId: userIdToDelete,
        reason: reason || 'Auto-eliminação',
        userStats: stats
      });
    }

    // Also keep system event logging for operational traces
    await logSystemEvent(
      'account_deletion_initiated',
      `${isAdminAction ? 'Admin' : 'Utilizador'} iniciou eliminação de conta`,
      {
        targetUserId: userIdToDelete,
        targetUserEmail: userToDelete.email,
        targetUserName: userToDelete.name,
        performedBy: session.user.id,
        performedByEmail: session.user.email,
        isAdminAction,
        reason: reason || (isAdminAction ? 'Eliminação administrativa' : 'Auto-eliminação'),
        userStats: stats,
        ip,
        userAgent,
        timestamp: new Date().toISOString()
      }
    );

    // Iniciar transação de eliminação
    console.log('🗑️ Iniciando eliminação de dados relacionados...');

    // 1. Eliminar tokens de verificação
    await supabase
      .from('VerificationToken')
      .delete()
      .eq('identifier', userToDelete.email);

    // 2. Eliminar sessões ativas
    await supabase
      .from('Session')
      .delete()
      .eq('userId', userIdToDelete);

    // 3. Eliminar accounts (OAuth connections)
    await supabase
      .from('Account')
      .delete()
      .eq('userId', userIdToDelete);

    // 4. Eliminar starred songs
    await supabase
      .from('StarredSong')
      .delete()
      .eq('userId', userIdToDelete);

    // 5. Eliminar playlists (e automaticamente as músicas nas playlists via cascade)
    await supabase
      .from('Playlist')
      .delete()
      .eq('createdBy', userIdToDelete);

    // 6. Eliminar músicas PENDENTES e REJEITADAS (manter APROVADAS)
    const { data: deletedMusics } = await supabase
      .from('Music')
      .delete()
      .in('status', ['PENDING', 'REJECTED'])
      .eq('uploadedBy', userIdToDelete)
      .select('id, title, status');

    // 7. Para músicas APROVADAS, apenas remover a referência do utilizador
    const { data: updatedMusics } = await supabase
      .from('Music')
      .update({ 
        uploadedBy: null,
        // Manter dados da música mas anonimizar o uploader
      })
      .eq('status', 'APPROVED')
      .eq('uploadedBy', userIdToDelete)
      .select('id, title');

    // 8. Finalmente, eliminar o utilizador
    const { error: deleteUserError } = await supabase
      .from('User')
      .delete()
      .eq('id', userIdToDelete);

    if (deleteUserError) {
      console.error('❌ Erro ao eliminar utilizador:', deleteUserError);
      
      await logErrors('ERROR', 'Falha na eliminação de conta', 'Erro ao eliminar utilizador da base de dados', {
        targetUserId: userIdToDelete,
        performedBy: session.user.id,
        isAdminAction,
        error: deleteUserError.message,
        errorCode: deleteUserError.code,
        userStats: stats,
        ip,
        userAgent
      });

      return NextResponse.json(
        { error: "Erro interno ao eliminar a conta. Tenta novamente mais tarde." },
        { status: 500 }
      );
    }

    // Log final de sucesso (user-action logger)
    const completionInfo = getUserInfoFromRequest(req, session);
    if (isAdminAction) {
      await logAdminAction('delete_user_account_completed', completionInfo, true, {
        deletedUserId: userIdToDelete,
        deletedUserEmail: userToDelete.email,
        deletedUserName: userToDelete.name,
        isAdminAction,
        eliminationStats: {
          ...stats,
          deletedMusics: deletedMusics?.length || 0,
          preservedApprovedMusics: updatedMusics?.length || 0,
          deletedPlaylistsCount: stats.totalPlaylists,
          deletedStarredSongsCount: stats.totalStarredSongs
        }
      });
    } else {
      await logProfileAction('delete_account_completed', completionInfo, true, {
        deletedUserId: userIdToDelete,
        deletedUserEmail: userToDelete.email,
        deletedUserName: userToDelete.name,
        eliminationStats: {
          ...stats,
          deletedMusics: deletedMusics?.length || 0,
          preservedApprovedMusics: updatedMusics?.length || 0,
          deletedPlaylistsCount: stats.totalPlaylists,
          deletedStarredSongsCount: stats.totalStarredSongs
        }
      });
    }

    // Also keep the system event log for operational traces
    await logSystemEvent(
      'account_deletion_completed',
      `Conta eliminada com sucesso ${isAdminAction ? 'por admin' : 'pelo próprio utilizador'}`,
      {
        deletedUserId: userIdToDelete,
        deletedUserEmail: userToDelete.email,
        deletedUserName: userToDelete.name,
        performedBy: session.user.id,
        performedByEmail: session.user.email,
        isAdminAction,
        reason: reason || (isAdminAction ? 'Eliminação administrativa' : 'Auto-eliminação'),
        
        // Estatísticas da eliminação
        eliminationStats: {
          ...stats,
          deletedMusics: deletedMusics?.length || 0,
          preservedApprovedMusics: updatedMusics?.length || 0,
          deletedPlaylistsCount: stats.totalPlaylists,
          deletedStarredSongsCount: stats.totalStarredSongs
        },
        
        // Detalhes das músicas afetadas
        deletedMusicsList: deletedMusics?.map(m => ({ id: m.id, title: m.title, status: m.status })) || [],
        preservedMusicsList: updatedMusics?.map(m => ({ id: m.id, title: m.title })) || [],
        
        ip,
        userAgent,
        completedAt: new Date().toISOString()
      }
    );

    console.log(`✅ Conta eliminada com sucesso: ${userToDelete.email}`, {
      deletedMusics: deletedMusics?.length || 0,
      preservedMusics: updatedMusics?.length || 0,
      deletedPlaylists: stats.totalPlaylists,
      deletedStarredSongs: stats.totalStarredSongs
    });

    return NextResponse.json({
      success: true,
      message: isAdminAction ? 
        "Conta de utilizador eliminada com sucesso." : 
        "A tua conta foi eliminada com sucesso.",
      details: {
        deletedMusics: deletedMusics?.length || 0,
        preservedApprovedMusics: updatedMusics?.length || 0,
        deletedPlaylists: stats.totalPlaylists,
        deletedStarredSongs: stats.totalStarredSongs,
        note: "Músicas aprovadas foram preservadas mas anonimizadas."
      }
    });

  } catch (error) {
    console.error('=== ERRO NA ELIMINAÇÃO DE CONTA ===');
    console.error('Erro:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');

    try {
      await logErrors('ERROR', 'Erro crítico na eliminação de conta', 'Erro inesperado durante processo de eliminação', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        performedBy: 'session?.user?.id',
        ip: 'req.headers IP',
        userAgent: 'req.headers user-agent'
      });
    } catch (logError) {
      console.warn('Erro no logging final (não crítico):', logError);
    }

    return NextResponse.json(
      { error: "Erro interno do servidor. Tenta novamente mais tarde." },
      { status: 500 }
    );
  }
}