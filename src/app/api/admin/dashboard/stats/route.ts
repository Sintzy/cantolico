import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminSupabase } from '@/lib/supabase-admin';

// Cache stats for 2 minutes to reduce database load
let statsCache: any = null;
let cacheTime = 0;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Return cached data if still valid
    const now = Date.now();
    if (statsCache && (now - cacheTime) < CACHE_TTL) {
      return NextResponse.json({ ...statsCache, cached: true });
    }

    // Buscar estatísticas em paralelo com admin client (mais rápido, sem RLS)
    const [
      { count: totalUsers },
      { count: totalSongs },
      { count: totalPlaylists },
      { count: pendingSubmissions },
      { count: moderatedUsers },
      { count: bannedUsers },
      { count: suspendedUsers }
    ] = await Promise.all([
      adminSupabase.from('User').select('*', { count: 'exact', head: true }),
      adminSupabase.from('Song').select('*', { count: 'exact', head: true }),
      adminSupabase.from('Playlist').select('*', { count: 'exact', head: true }),
      adminSupabase.from('SongSubmission').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
      adminSupabase.from('UserModeration').select('*', { count: 'exact', head: true }).neq('status', 'ACTIVE'),
      adminSupabase.from('UserModeration').select('*', { count: 'exact', head: true }).eq('status', 'BANNED'),
      adminSupabase.from('UserModeration').select('*', { count: 'exact', head: true }).eq('status', 'SUSPENDED')
    ]);

    // Buscar utilizadores recentes (últimos 7 dias)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [
      { count: recentUsers },
      { count: recentSongs },
      { count: recentModerations }
    ] = await Promise.all([
      adminSupabase.from('User').select('*', { count: 'exact', head: true }).gte('createdAt', sevenDaysAgo.toISOString()),
      adminSupabase.from('Song').select('*', { count: 'exact', head: true }).gte('createdAt', sevenDaysAgo.toISOString()),
      adminSupabase.from('UserModeration').select('*', { count: 'exact', head: true }).gte('moderatedAt', thirtyDaysAgo.toISOString())
    ]);

    // Buscar estatísticas por role com queries separadas (mais rápido)
    const [
      { count: userCount },
      { count: reviewerCount },
      { count: adminCount }
    ] = await Promise.all([
      adminSupabase.from('User').select('*', { count: 'exact', head: true }).eq('role', 'USER'),
      adminSupabase.from('User').select('*', { count: 'exact', head: true }).eq('role', 'REVIEWER'),
      adminSupabase.from('User').select('*', { count: 'exact', head: true }).eq('role', 'ADMIN')
    ]);

    const roleStats = {
      USER: userCount || 0,
      REVIEWER: reviewerCount || 0,
      ADMIN: adminCount || 0
    };

    // Top authors removed for performance - can be cached separately if needed
    const topAuthorsList: any[] = [];

    // Novos utilizadores por role (últimos 30 dias)
    const [
      { count: newUsersUSER },
      { count: newUsersREVIEWER },
      { count: newUsersADMIN }
    ] = await Promise.all([
      adminSupabase.from('User').select('*', { count: 'exact', head: true }).gte('createdAt', thirtyDaysAgo.toISOString()).eq('role', 'USER'),
      adminSupabase.from('User').select('*', { count: 'exact', head: true }).gte('createdAt', thirtyDaysAgo.toISOString()).eq('role', 'REVIEWER'),
      adminSupabase.from('User').select('*', { count: 'exact', head: true }).gte('createdAt', thirtyDaysAgo.toISOString()).eq('role', 'ADMIN')
    ]);

    const newUsersByRole = [
      { role: 'USER', count: Number(newUsersUSER ?? 0) || 0 },
      { role: 'REVIEWER', count: Number(newUsersREVIEWER ?? 0) || 0 },
      { role: 'ADMIN', count: Number(newUsersADMIN ?? 0) || 0 }
    ];

    // Songs by moment removed for performance - can be computed separately if needed
    const songsByMoment: any[] = [];

    const stats = {
      totalUsers: totalUsers || 0,
      totalSongs: totalSongs || 0,
      totalPlaylists: totalPlaylists || 0,
      pendingSubmissions: pendingSubmissions || 0,
      totalSubmissions: pendingSubmissions || 0,
      recentUsers: recentUsers || 0,
      recentSongs: recentSongs || 0,
      moderation: {
        moderatedUsers: moderatedUsers || 0,
        bannedUsers: bannedUsers || 0,
        suspendedUsers: suspendedUsers || 0,
        recentModerations: recentModerations || 0
      },
      usersByRole: [
        { role: 'USER', count: roleStats.USER },
        { role: 'REVIEWER', count: roleStats.REVIEWER },
        { role: 'ADMIN', count: roleStats.ADMIN }
      ],
      songsByType: [
        { type: 'Publicadas', count: totalSongs || 0 },
        { type: 'Pendentes', count: pendingSubmissions || 0 }
      ],
      submissionsByMonth: [],
      recentActivities: [],
      topAuthors: topAuthorsList,
      newUsersByRole,
      songsByMoment,
      lastUpdated: new Date().toISOString(),
      cached: false
    };

    // Update cache
    statsCache = stats;
    cacheTime = now;

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
