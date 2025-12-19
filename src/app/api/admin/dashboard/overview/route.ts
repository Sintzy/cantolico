import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { adminSupabase } from '@/lib/supabase-admin';

// In-memory cache for overview data (2 minutes TTL)
let overviewCache: any = null;
let cacheTime = 0;
const CACHE_TTL = 2 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) return authError;

    // Check cache first
    const now = Date.now();
    if (overviewCache && (now - cacheTime) < CACHE_TTL) {
      console.log('🔍 Returning cached overview data');
      return NextResponse.json(overviewCache);
    }

    console.log('🔍 Admin dashboard overview called');

    // Buscar estatísticas gerais (usando adminSupabase para performance)
    const [
      { count: totalUsers },
      { count: totalSongs },
      { count: totalPlaylists },
      { count: totalSubmissions },
      { count: pendingSubmissions },
      { count: moderatedUsers }
    ] = await Promise.all([
      adminSupabase.from('User').select('*', { count: 'exact', head: true }),
      adminSupabase.from('Song').select('*', { count: 'exact', head: true }),
      adminSupabase.from('Playlist').select('*', { count: 'exact', head: true }),
      adminSupabase.from('SongSubmission').select('*', { count: 'exact', head: true }),
      adminSupabase.from('SongSubmission').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
      adminSupabase.from('UserModeration').select('*', { count: 'exact', head: true }).neq('status', 'ACTIVE')
    ]);

    // Buscar atividade recente (últimos 7 dias)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      { count: recentUsers },
      { count: recentSongs },
      { count: recentSubmissions }
    ] = await Promise.all([
      adminSupabase.from('User').select('*', { count: 'exact', head: true })
        .gte('createdAt', sevenDaysAgo.toISOString()),
      adminSupabase.from('Song').select('*', { count: 'exact', head: true })
        .gte('createdAt', sevenDaysAgo.toISOString()),
      adminSupabase.from('SongSubmission').select('*', { count: 'exact', head: true })
        .gte('createdAt', sevenDaysAgo.toISOString())
    ]);

    // Buscar distribuição por roles com contagem otimizada
    const [
      { count: userCount },
      { count: reviewerCount },
      { count: adminCount }
    ] = await Promise.all([
      adminSupabase.from('User').select('*', { count: 'exact', head: true }).eq('role', 'USER'),
      adminSupabase.from('User').select('*', { count: 'exact', head: true }).eq('role', 'REVIEWER'),
      adminSupabase.from('User').select('*', { count: 'exact', head: true }).eq('role', 'ADMIN')
    ]);

    const roleDistribution = {
      USER: userCount || 0,
      REVIEWER: reviewerCount || 0,
      ADMIN: adminCount || 0
    };

    console.log('✅ Dashboard overview data ready');

    const result = {
      totals: {
        users: totalUsers || 0,
        songs: totalSongs || 0,
        playlists: totalPlaylists || 0,
        submissions: totalSubmissions || 0,
        pendingSubmissions: pendingSubmissions || 0,
        moderatedUsers: moderatedUsers || 0
      },
      recent: {
        users: recentUsers || 0,
        songs: recentSongs || 0,
        submissions: recentSubmissions || 0
      },
      distribution: {
        roles: roleDistribution
      },
      lastUpdated: new Date().toISOString()
    };

    // Update cache
    overviewCache = result;
    cacheTime = Date.now();

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error in admin dashboard overview:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
