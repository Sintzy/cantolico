import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase-client";
import { logApiRequestError, logUnauthorizedAccess, logForbiddenAccess, toErrorContext } from "@/lib/logging-helpers";

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
          logUnauthorizedAccess({
            event_type: 'unauthorized_access',
            resource: `/api/user/delete-account`,
            user: { user_id: session.user.id, user_role: session.user.role },
            network: { ip_address: ip, user_agent: userAgent },
            details: {
              attemptedBy: session.user.id,
              targetUser: userIdToDelete,
              userRole: session.user.role
            }
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
        logForbiddenAccess({
          event_type: 'forbidden_access',
          resource: `/api/user/delete-account`,
          user: { user_id: session.user.id, user_role: session.user.role },
          network: { ip_address: ip, user_agent: userAgent },
          details: {
            attemptedBy: session.user.id,
            targetUser: userIdToDelete,
            targetUserRole: targetUser.role
          }
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
      logApiRequestError({
        method: req.method,
        url: req.url,
        path: '/api/user/delete-account',
        status_code: 404,
        error: toErrorContext(userFetchError),
        details: {
          targetUserId: userIdToDelete,
          performedBy: session.user.id,
          isAdminAction
        }
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

    // Log do evento antes da eliminação
    logUnauthorizedAccess({
      event_type: 'unauthorized_access',
      resource: `/api/user/delete-account`,
      user: { 
        user_id: session.user.id, 
        user_email: session.user.email || undefined,
        user_role: session.user.role 
      },
      network: { ip_address: ip, user_agent: userAgent },
      details: {
        targetUserId: userIdToDelete,
        targetUserEmail: userToDelete.email,
        targetUserName: userToDelete.name,
        isAdminAction,
        reason: reason || (isAdminAction ? 'Eliminação administrativa' : 'Auto-eliminação'),
        userStats: stats,
        timestamp: new Date().toISOString()
      }
    });

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
      
      logApiRequestError({
        method: req.method,
        url: req.url,
        path: '/api/user/delete-account',
        status_code: 500,
        error: toErrorContext(deleteUserError),
        details: {
          targetUserId: userIdToDelete,
          performedBy: session.user.id,
          isAdminAction,
          errorCode: deleteUserError.code,
          userStats: stats
        }
      });

      return NextResponse.json(
        { error: "Erro interno ao eliminar a conta. Tenta novamente mais tarde." },
        { status: 500 }
      );
    }

    // Log final de sucesso
    logUnauthorizedAccess({
      event_type: 'unauthorized_access',
      resource: `/api/user/delete-account`,
      user: { 
        user_id: session.user.id, 
        user_email: session.user.email || undefined,
        user_role: session.user.role 
      },
      network: { ip_address: ip, user_agent: userAgent },
      details: {
        deletedUserId: userIdToDelete,
        deletedUserEmail: userToDelete.email,
        deletedUserName: userToDelete.name,
        isAdminAction,
        reason: reason || (isAdminAction ? 'Eliminação administrativa' : 'Auto-eliminação'),
        eliminationStats: {
          ...stats,
          deletedMusics: deletedMusics?.length || 0,
          preservedApprovedMusics: updatedMusics?.length || 0,
          deletedPlaylistsCount: stats.totalPlaylists,
          deletedStarredSongsCount: stats.totalStarredSongs
        },
        deletedMusicsList: deletedMusics?.map(m => ({ id: m.id, title: m.title, status: m.status })) || [],
        preservedMusicsList: updatedMusics?.map(m => ({ id: m.id, title: m.title })) || [],
        completedAt: new Date().toISOString()
      }
    });

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
      logApiRequestError({
        method: req.method,
        url: req.url,
        path: '/api/user/delete-account',
        status_code: 500,
        error: toErrorContext(error),
        details: {
          action: 'delete_account_critical_error',
          stack: error instanceof Error ? error.stack : undefined
        }
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