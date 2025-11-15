import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { adminSupabase as supabase } from '@/lib/supabase-admin';
import { logSystemEvent } from '@/lib/enhanced-logging';

export async function GET(req: NextRequest) {
  try {

    
    const session = await getServerSession(authOptions);

    if (!session) {

      return NextResponse.json({ error: 'Não autenticado - sem sessão' }, { status: 401 });
    }

    if (!session.user) {

      return NextResponse.json({ error: 'Não autenticado - sem usuário' }, { status: 401 });
    }

    if (!session.user.id && session.user.id !== 0) {

      return NextResponse.json({ error: 'Não autenticado - sem ID' }, { status: 401 });
    }



    // Verificar se é admin ou reviewer
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userError || !user || (user.role !== 'ADMIN' && user.role !== 'REVIEWER')) {
      console.error('❌ [DASHBOARD STATS] Acesso negado:', userError);
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const isAdmin = user.role === 'ADMIN';
    const stats: any = {
      role: user.role,
      alerts: {
        unacknowledged: 0,
        critical: 0,
        high: 0,
        recent: []
      }
    };

    // Buscar alertas de segurança não reconhecidos (agora armazenados nos logs com tag 'security')
    const { data: securityLogs, error: alertsError } = await supabase
      .from('logs')
      .select('id, details, created_at')
      .contains('tags', ['security'])
      .not('details->>alert_status', 'eq', 'ACKNOWLEDGED')
      .order('created_at', { ascending: false });

    if (!alertsError && securityLogs) {
      stats.alerts.unacknowledged = securityLogs.length;
      // details.severity may be nested in details.alertType or details.severity
      const parsed = securityLogs.map((l: any) => ({
        id: l.id,
        severity: l.details?.severity || l.details?.details?.severity || 0,
        title: l.details?.description || l.details?.title || ''
      }));
      stats.alerts.critical = parsed.filter((a: any) => a.severity >= 4).length;
      stats.alerts.high = parsed.filter((a: any) => a.severity >= 3).length;
      stats.alerts.recent = parsed.slice(0, 5);
    }

    if (isAdmin) {
      // Músicas pendentes de aprovação
      const { data: pendingMusic, error: musicError } = await supabase
        .from('songs')
        .select('id')
        .eq('status', 'PENDING');

      if (!musicError) {
        stats.pendingMusic = pendingMusic?.length || 0;
      }

      // Reviews de música feitas pelo admin este mês
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const { data: monthlyReviews, error: monthlyError } = await supabase
        .from('logs')
        .select('id')
        .eq('category', 'ADMIN')
        .like('message', '%review%')
        .like('details->adminId', `${session.user.id}`)
        .gte('created_at', thisMonth.toISOString());

      if (!monthlyError) {
        stats.reviewsThisMonth = monthlyReviews?.length || 0;
      }

      // Utilizadores banidos recentemente (últimos 7 dias)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentBans, error: bansError } = await supabase
        .from('UserModeration')
        .select('id')
        .eq('status', 'BANNED')
        .gte('created_at', sevenDaysAgo.toISOString());

      if (!bansError) {
        stats.recentBans = recentBans?.length || 0;
      }

      // Logs críticos recentes (últimas 24h)
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data: criticalLogs, error: logsError } = await supabase
        .from('logs')
        .select('id')
        .in('level', ['ERROR', 'SECURITY'])
        .gte('created_at', twentyFourHoursAgo.toISOString());

      if (!logsError) {
        stats.criticalLogs24h = criticalLogs?.length || 0;
      }

      // Utilizadores ativos hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: activeUsers, error: usersError } = await supabase
        .from('logs')
        .select('details->userId')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())
        .not('details->userId', 'is', null);

      if (!usersError && activeUsers) {
        const uniqueUsers = new Set(
          activeUsers
            .map((log: any) => log['details->userId'])
            .filter(id => id != null)
        );
        stats.activeUsersToday = uniqueUsers.size;
      }

    } else {
      // Estatísticas específicas para REVIEWER
      // Revisões pendentes para este reviewer
      const { data: pendingReviews, error: reviewsError } = await supabase
        .from('songs')
        .select('id')
        .eq('status', 'PENDING');

      if (!reviewsError) {
        stats.pendingReviews = pendingReviews?.length || 0;
      }

      // Reviews feitas por este reviewer este mês
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const { data: monthlyReviews, error: monthlyError } = await supabase
        .from('logs')
        .select('id')
        .eq('category', 'ADMIN')
        .like('message', '%review%')
        .like('details->adminId', `${session.user.id}`)
        .gte('created_at', thisMonth.toISOString());

      if (!monthlyError) {
        stats.reviewsThisMonth = monthlyReviews?.length || 0;
      }
    }

    await logSystemEvent('dashboard_stats_access', `${user.role} consultou estatísticas do dashboard`, {
      userId: session.user.id,
      userRole: user.role,
      statsReturned: Object.keys(stats),
      alertsCount: stats.alerts.unacknowledged
    });

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
