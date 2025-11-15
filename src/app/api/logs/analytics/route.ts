import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';

// ================================================
// API PARA ANALYTICS DE LOGS
// ================================================

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Verificar autorização
    if (!session || !['ADMIN', 'REVIEWER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '24h'; // 24h, 7d, 30d, 90d
    const type = searchParams.get('type') || 'overview'; // overview, performance, security, users

    let startDate: Date;
    const endDate = new Date();

    // Calcular período
    switch (period) {
      case '1h':
        startDate = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    let analytics = {};

    if (type === 'overview' || type === 'all') {
      analytics = {
        ...analytics,
        ...await getOverviewAnalytics(startDate, endDate)
      };
    }

    if (type === 'performance' || type === 'all') {
      analytics = {
        ...analytics,
        performance: await getPerformanceAnalytics(startDate, endDate)
      };
    }

    if (type === 'security' || type === 'all') {
      analytics = {
        ...analytics,
        security: await getSecurityAnalytics(startDate, endDate)
      };
    }

    if (type === 'users' || type === 'all') {
      analytics = {
        ...analytics,
        users: await getUserAnalytics(startDate, endDate)
      };
    }

    if (type === 'trends' || type === 'all') {
      analytics = {
        ...analytics,
        trends: await getTrendsAnalytics(startDate, endDate, period)
      };
    }

    return NextResponse.json({
      analytics,
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

  } catch (error) {
    console.error('Erro na API de analytics:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// ================================================
// FUNÇÕES DE ANALYTICS
// ================================================

async function getOverviewAnalytics(startDate: Date, endDate: Date) {
  try {
    // Contadores gerais
    const { data: totalLogs, error: totalError } = await supabase
      .from('logs')
      .select('level', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (totalError) throw totalError;

    // Distribuição por nível
    const { data: levelData } = await supabase
      .from('logs')
      .select('level')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const levelDistribution = (levelData || []).reduce((acc: any, log: any) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {});

    // Distribuição por categoria
    const { data: categoryData } = await supabase
      .from('logs')
      .select('category')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const categoryDistribution = (categoryData || []).reduce((acc: any, log: any) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {});

    // Status de APIs
    const { data: apiData } = await supabase
      .from('logs')
      .select('status_code')
      .eq('category', 'API')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .not('status_code', 'is', null);

    const statusDistribution = (apiData || []).reduce((acc: any, log: any) => {
      const statusRange = Math.floor(log.status_code / 100) * 100;
      const key = `${statusRange}s`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      total: totalLogs?.length || 0,
      levelDistribution,
      categoryDistribution,
      statusDistribution
    };
  } catch (error) {
    console.error('Erro no overview analytics:', error);
    return {};
  }
}

async function getPerformanceAnalytics(startDate: Date, endDate: Date) {
  try {
    const { data: perfData } = await supabase
      .from('logs')
      .select('response_time_ms, created_at, url, method')
      .not('response_time_ms', 'is', null)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('response_time_ms', { ascending: false });

    if (!perfData || perfData.length === 0) {
      return {
        averageResponseTime: 0,
        slowestRequests: [],
        responseTimeDistribution: {}
      };
    }

    const responseTimes = perfData.map(log => log.response_time_ms);
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    // Distribuição de tempos de resposta
    const responseTimeDistribution = perfData.reduce((acc: any, log: any) => {
      let bucket;
      if (log.response_time_ms < 100) bucket = '<100ms';
      else if (log.response_time_ms < 500) bucket = '100-500ms';
      else if (log.response_time_ms < 1000) bucket = '500ms-1s';
      else if (log.response_time_ms < 5000) bucket = '1-5s';
      else bucket = '>5s';
      
      acc[bucket] = (acc[bucket] || 0) + 1;
      return acc;
    }, {});

    return {
      averageResponseTime: Math.round(averageResponseTime),
      slowestRequests: perfData.slice(0, 10),
      responseTimeDistribution,
      totalRequests: perfData.length
    };
  } catch (error) {
    console.error('Erro no performance analytics:', error);
    return {};
  }
}

async function getSecurityAnalytics(startDate: Date, endDate: Date) {
  try {
    // Eventos de segurança
    const { data: securityLogs } = await supabase
      .from('logs')
      .select('level, category, ip_address, user_email, created_at, details')
      .or('level.eq.SECURITY,category.eq.SECURITY,category.eq.AUTH')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Alertas de segurança agora são logs com a tag 'security'
    const { data: alerts } = await supabase
      .from('logs')
      .select('details, created_at')
      .contains('tags', ['security'])
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // IPs suspeitos (múltiplas falhas)
    const failedLogins = (securityLogs || []).filter(log => 
      log.category === 'AUTH' && log.details?.success === false
    );

    const suspiciousIPs = failedLogins.reduce((acc: any, log: any) => {
      if (log.ip_address) {
        acc[log.ip_address] = (acc[log.ip_address] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      totalSecurityEvents: securityLogs?.length || 0,
      totalAlerts: alerts?.length || 0,
      failedLogins: failedLogins.length,
      suspiciousIPs: Object.entries(suspiciousIPs)
        .filter(([_, count]) => (count as number) >= 3)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10),
      alertsByType: (alerts || []).reduce((acc: any, alert: any) => {
        const at = alert.details?.alertType || alert.details?.alert_type || 'UNKNOWN';
        acc[at] = (acc[at] || 0) + 1;
        return acc;
      }, {}),
      alertsBySeverity: (alerts || []).reduce((acc: any, alert: any) => {
        const sev = alert.details?.severity || alert.details?.level || 'unknown';
        acc[sev] = (acc[sev] || 0) + 1;
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Erro no security analytics:', error);
    return {};
  }
}

async function getUserAnalytics(startDate: Date, endDate: Date) {
  try {
    const { data: userLogs } = await supabase
      .from('logs')
      .select('user_id, user_email, user_role, category, level, ip_address')
      .not('user_id', 'is', null)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const uniqueUsers = new Set((userLogs || []).map(log => log.user_id)).size;
    const uniqueIPs = new Set((userLogs || []).map(log => log.ip_address)).size;

    // Atividade por role
    const activityByRole = (userLogs || []).reduce((acc: any, log: any) => {
      acc[log.user_role] = (acc[log.user_role] || 0) + 1;
      return acc;
    }, {});

    // Top utilizadores mais ativos
    const userActivity = (userLogs || []).reduce((acc: any, log: any) => {
      const key = log.user_email || log.user_id;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const topUsers = Object.entries(userActivity)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10);

    return {
      uniqueUsers,
      uniqueIPs,
      activityByRole,
      topUsers,
      totalUserEvents: userLogs?.length || 0
    };
  } catch (error) {
    console.error('Erro no user analytics:', error);
    return {};
  }
}

async function getTrendsAnalytics(startDate: Date, endDate: Date, period: string) {
  try {
    let interval = '1 hour';
    let dateFormat = 'YYYY-MM-DD HH24:00:00';

    if (period === '7d' || period === '30d') {
      interval = '1 day';
      dateFormat = 'YYYY-MM-DD';
    } else if (period === '90d') {
      interval = '1 week';
      dateFormat = 'YYYY-WW';
    }

    const { data: trendsData } = await supabase
      .rpc('get_log_trends', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        time_interval: interval,
        date_format: dateFormat
      });

    return {
      timeline: trendsData || [],
      interval,
      dateFormat
    };
  } catch (error) {
    console.error('Erro no trends analytics:', error);
    // Fallback para dados básicos se RPC não existir
    return {
      timeline: [],
      interval: '1 hour',
      dateFormat: 'YYYY-MM-DD HH24:00:00'
    };
  }
}