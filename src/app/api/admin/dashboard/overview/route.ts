import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    console.log('🔍 Admin dashboard overview called');

    // Buscar estatísticas gerais
    const [
      { count: totalUsers },
      { count: totalSongs },
      { count: totalPlaylists },
      { count: totalSubmissions },
      { count: pendingSubmissions },
      { count: moderatedUsers }
    ] = await Promise.all([
      supabase.from('User').select('id', { count: 'exact', head: true }),
      supabase.from('Song').select('id', { count: 'exact', head: true }),
      supabase.from('Playlist').select('id', { count: 'exact', head: true }),
      supabase.from('SongSubmission').select('id', { count: 'exact', head: true }),
      supabase.from('SongSubmission').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
      supabase.from('UserModeration').select('userId', { count: 'exact', head: true }).neq('status', 'ACTIVE')
    ]);

    // Buscar atividade recente (últimos 7 dias)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      { count: recentUsers },
      { count: recentSongs },
      { count: recentSubmissions }
    ] = await Promise.all([
      supabase.from('User').select('id', { count: 'exact', head: true })
        .gte('createdAt', sevenDaysAgo.toISOString()),
      supabase.from('Song').select('id', { count: 'exact', head: true })
        .gte('createdAt', sevenDaysAgo.toISOString()),
      supabase.from('SongSubmission').select('id', { count: 'exact', head: true })
        .gte('createdAt', sevenDaysAgo.toISOString())
    ]);

    // Buscar distribuição por roles
    const { data: userRoles } = await supabase
      .from('User')
      .select('role');

    const roleDistribution = {
      USER: 0,
      REVIEWER: 0,
      ADMIN: 0
    };

    userRoles?.forEach((user: any) => {
      if (user.role && roleDistribution.hasOwnProperty(user.role)) {
        roleDistribution[user.role as keyof typeof roleDistribution]++;
      }
    });

    console.log('✅ Dashboard overview data ready');

    return NextResponse.json({
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
    });

  } catch (error) {
    console.error('❌ Error in admin dashboard overview:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
