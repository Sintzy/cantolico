import { NextRequest, NextResponse } from 'next/server';
import { getClerkSession } from '@/lib/api-middleware';
import { adminSupabase } from '@/lib/supabase-admin';

// Cache stats for 15 minutes to reduce database load
let statsCache: any = null;
let cacheTime = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function GET(request: NextRequest) {
  try {
    const session = await getClerkSession();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Return cached data if still valid
    const now = Date.now();
    if (statsCache && (now - cacheTime) < CACHE_TTL) {
      return NextResponse.json({ ...statsCache, cached: true });
    }

    const startTime = Date.now();

    // Prepare date filters
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Execute all queries in parallel - use head: true to only count (fastest)
    const [
      usersResponse,
      songsResponse,
      playlistsResponse,
      submissionsResponse,
      recentUsersResponse,
      recentSongsResponse,
      moderationResponse,
      usersByRoleResponse,
      newUsersByRoleResponse,
      recentModerationsResponse,
      allSubmissionsResponse
    ] = await Promise.all([
      // Basic counts with head: true (only counts, no data fetched)
      adminSupabase.from('User').select('*', { count: 'exact', head: true }),
      adminSupabase.from('Song').select('*', { count: 'exact', head: true }),
      adminSupabase.from('Playlist').select('*', { count: 'exact', head: true }),
      adminSupabase.from('SongSubmission').select('*', { count: 'exact', head: true }),
      
      // Recent (7 days)
      adminSupabase.from('User')
        .select('*', { count: 'exact', head: true })
        .gte('createdAt', sevenDaysAgo.toISOString()),
      adminSupabase.from('Song')
        .select('*', { count: 'exact', head: true })
        .gte('createdAt', sevenDaysAgo.toISOString()),
      
      // Moderation data
      adminSupabase.from('UserModeration')
        .select('status')
        .in('status', ['BANNED', 'SUSPENDED', 'WARNING']),
      
      // User role distribution
      adminSupabase.from('User')
        .select('role'),
      
      // New users by role (30 days)
      adminSupabase.from('User')
        .select('role')
        .gte('createdAt', thirtyDaysAgo.toISOString()),
      
      // Recent moderations (30 days)
      adminSupabase.from('UserModeration')
        .select('*', { count: 'exact', head: true })
        .gte('moderatedAt', thirtyDaysAgo.toISOString()),

      // For Submissions by month
      adminSupabase.from('SongSubmission')
        .select('createdAt')
    ]);

    // Extract counts
    const totalUsers = usersResponse.count || 0;
    const totalSongs = songsResponse.count || 0;
    const totalPlaylists = playlistsResponse.count || 0;
    const totalSubmissions = submissionsResponse.count || 0;
    const recentUsers = recentUsersResponse.count || 0;
    const recentSongs = recentSongsResponse.count || 0;
    const recentModerations = recentModerationsResponse.count || 0;

    // Pending submissions (estimate or query separately if needed)
    const pendingSubmissions = totalSubmissions > 0 ? totalSubmissions : 0;

    // Process moderation data
    let bannedUsers = 0;
    let suspendedUsers = 0;
    if (moderationResponse.data) {
      bannedUsers = moderationResponse.data.filter((m: any) => m.status === 'BANNED').length;
      suspendedUsers = moderationResponse.data.filter((m: any) => m.status === 'SUSPENDED').length;
    }

    // Process user roles
    const roleStats = {
      USER: 0,
      REVIEWER: 0,
      ADMIN: 0
    };

    if (usersByRoleResponse.data) {
      usersByRoleResponse.data.forEach((user: any) => {
        if (user.role in roleStats) {
          roleStats[user.role as keyof typeof roleStats]++;
        }
      });
    }

    // Process new users by role
    const newUsersStats = {
      USER: 0,
      REVIEWER: 0,
      ADMIN: 0
    };

    if (newUsersByRoleResponse.data) {
      newUsersByRoleResponse.data.forEach((user: any) => {
        if (user.role in newUsersStats) {
          newUsersStats[user.role as keyof typeof newUsersStats]++;
        }
      });
    }

    // Process submissions by month (last 6 months)
    const submissionsByMonth: { month: string; count: number }[] = [];
    const nowCurrent = new Date();
    const map: Record<string, number> = {};
    
    if (allSubmissionsResponse.data) {
      for (const s of allSubmissionsResponse.data) {
        const d = s.createdAt ? new Date(s.createdAt) : null;
        if (!d || isNaN(d.getTime())) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        map[key] = (map[key] || 0) + 1;
      }
    }
    
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(nowCurrent.getFullYear(), nowCurrent.getMonth() - i, 1);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const label = dt.toLocaleString('pt-PT', { month: 'short' }).replace('.', '');
      submissionsByMonth.push({ month: label.charAt(0).toUpperCase() + label.slice(1), count: map[key] || 0 });
    }

    const stats = {
      totalUsers,
      totalSongs,
      totalPlaylists,
      pendingSubmissions,
      totalSubmissions,
      recentUsers,
      recentSongs,
      moderation: {
        moderatedUsers: bannedUsers + suspendedUsers,
        bannedUsers,
        suspendedUsers,
        recentModerations
      },
      usersByRole: [
        { role: 'USER', count: roleStats.USER },
        { role: 'REVIEWER', count: roleStats.REVIEWER },
        { role: 'ADMIN', count: roleStats.ADMIN }
      ],
      songsByType: [
        { type: 'Publicadas', count: totalSongs },
        { type: 'Pendentes', count: pendingSubmissions }
      ],
      submissionsByMonth: submissionsByMonth,
      recentActivities: [],
      topAuthors: [],
      newUsersByRole: [
        { role: 'USER', count: newUsersStats.USER },
        { role: 'REVIEWER', count: newUsersStats.REVIEWER },
        { role: 'ADMIN', count: newUsersStats.ADMIN }
      ],
      songsByMoment: [],
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
