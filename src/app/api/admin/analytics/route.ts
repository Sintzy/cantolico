import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { adminSupabase } from '@/lib/supabase-admin';

// In-memory cache for analytics data (5 minutes TTL)
let analyticsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    
    // Check cache
    const cacheKey = `analytics-${period}`;
    const cached = analyticsCache.get(cacheKey);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      console.log('🔍 Returning cached analytics data');
      return NextResponse.json(cached.data);
    }
    
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Estatísticas por período (usando adminSupabase e count-only queries)
    const [
      { count: newUsers },
      { count: newSongs },
      { count: newSubmissions },
      { count: newPlaylists }
    ] = await Promise.all([
      adminSupabase.from('User')
        .select('*', { count: 'exact', head: true })
        .gte('createdAt', daysAgo.toISOString()),
      adminSupabase.from('Song')
        .select('*', { count: 'exact', head: true })
        .gte('createdAt', daysAgo.toISOString()),
      adminSupabase.from('SongSubmission')
        .select('*', { count: 'exact', head: true })
        .gte('createdAt', daysAgo.toISOString()),
      adminSupabase.from('Playlist')
        .select('*', { count: 'exact', head: true })
        .gte('createdAt', daysAgo.toISOString())
    ]);

    // Top utilizadores por contribuições
    // Note: Simplified for performance - top 10 by song count
    const { data: topContributors } = await adminSupabase
      .from('Song')
      .select(`
        authorId,
        author:User!Song_authorId_fkey(name, image)
      `)
      .limit(500); // Limit to recent songs for performance

    const contributorCounts: { [key: string]: { name: string; image: string | null; count: number } } = {};
    
    topContributors?.forEach((song: any) => {
      const authorId = song.authorId;
      if (!contributorCounts[authorId]) {
        contributorCounts[authorId] = {
          name: song.author?.name || 'Utilizador Desconhecido',
          image: song.author?.image || null,
          count: 0
        };
      }
      contributorCounts[authorId].count++;
    });

    const topContributorsList = Object.entries(contributorCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([id, data]) => ({
        id,
        name: data.name,
        image: data.image,
        contributions: data.count
      }));

    // Estatísticas de moderação (optimized with count-only queries)
    const [
      { count: warningCount },
      { count: suspensionCount },
      { count: banCount }
    ] = await Promise.all([
      adminSupabase.from('UserModeration')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'WARNING')
        .gte('moderatedAt', daysAgo.toISOString()),
      adminSupabase.from('UserModeration')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'SUSPENSION')
        .gte('moderatedAt', daysAgo.toISOString()),
      adminSupabase.from('UserModeration')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'BAN')
        .gte('moderatedAt', daysAgo.toISOString())
    ]);

    const moderationByType = {
      WARNING: warningCount || 0,
      SUSPENSION: suspensionCount || 0,
      BAN: banCount || 0
    };
    
    const totalModerationActions = (warningCount || 0) + (suspensionCount || 0) + (banCount || 0);

    // Atividade por dia (últimos 7 dias) - optimized with parallel queries
    const dailyPromises = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      dailyPromises.push(
        Promise.all([
          adminSupabase.from('User')
            .select('*', { count: 'exact', head: true })
            .gte('createdAt', startOfDay.toISOString())
            .lte('createdAt', endOfDay.toISOString()),
          adminSupabase.from('Song')
            .select('*', { count: 'exact', head: true })
            .gte('createdAt', startOfDay.toISOString())
            .lte('createdAt', endOfDay.toISOString()),
          adminSupabase.from('SongSubmission')
            .select('*', { count: 'exact', head: true })
            .gte('createdAt', startOfDay.toISOString())
            .lte('createdAt', endOfDay.toISOString())
        ]).then(([usersRes, songsRes, submissionsRes]) => ({
          date: startOfDay.toISOString().split('T')[0],
          users: usersRes.count || 0,
          songs: songsRes.count || 0,
          submissions: submissionsRes.count || 0
        }))
      );
    }

    const dailyActivity = await Promise.all(dailyPromises);

    const result = {
      period: {
        days: parseInt(period),
        newUsers: newUsers || 0,
        newSongs: newSongs || 0,
        newSubmissions: newSubmissions || 0,
        newPlaylists: newPlaylists || 0
      },
      topContributors: topContributorsList,
      moderation: {
        totalActions: totalModerationActions,
        byType: moderationByType
      },
      dailyActivity,
      lastUpdated: new Date().toISOString()
    };

    // Update cache
    analyticsCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in admin analytics API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
