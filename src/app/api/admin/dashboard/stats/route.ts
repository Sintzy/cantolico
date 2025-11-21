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

    // Buscar estatísticas em paralelo
    const [
      { count: totalUsers },
      { count: totalSongs },
      { count: totalPlaylists },
      { count: pendingSubmissions },
      { count: moderatedUsers },
      { count: bannedUsers },
      { count: suspendedUsers }
    ] = await Promise.all([
      // Total de utilizadores
      supabase
        .from('User')
        .select('id', { count: 'exact', head: true }),
      
      // Total de músicas
      supabase
        .from('Song')
        .select('id', { count: 'exact', head: true }),
      
      // Total de playlists
      supabase
        .from('Playlist')
        .select('id', { count: 'exact', head: true }),
      
      // Submissões pendentes
      supabase
        .from('SongSubmission')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'PENDING'),
      
      // Utilizadores com moderação ativa (não ACTIVE)
      supabase
        .from('UserModeration')
        .select('userId', { count: 'exact', head: true })
        .neq('status', 'ACTIVE'),
      
      // Utilizadores banidos
      supabase
        .from('UserModeration')
        .select('userId', { count: 'exact', head: true })
        .eq('status', 'BANNED'),
      
      // Utilizadores suspensos
      supabase
        .from('UserModeration')
        .select('userId', { count: 'exact', head: true })
        .eq('status', 'SUSPENDED')
    ]);

    // Buscar utilizadores recentes (últimos 7 dias)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: recentUsers } = await supabase
      .from('User')
      .select('id', { count: 'exact', head: true })
      .gte('createdAt', sevenDaysAgo.toISOString());

    // Buscar músicas recentes (últimos 7 dias)
    const { count: recentSongs } = await supabase
      .from('Song')
      .select('id', { count: 'exact', head: true })
      .gte('createdAt', sevenDaysAgo.toISOString());

    // Buscar atividade de moderação recente (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: recentModerations } = await supabase
      .from('UserModeration')
      .select('id', { count: 'exact', head: true })
      .gte('moderatedAt', thirtyDaysAgo.toISOString());

    // Buscar estatísticas por role
    const { data: usersByRole } = await supabase
      .from('User')
      .select('role')
      .neq('role', null);

    const roleStats = {
      USER: 0,
      REVIEWER: 0,
      ADMIN: 0
    };

    usersByRole?.forEach((user: any) => {
      if (user.role in roleStats) {
        roleStats[user.role as keyof typeof roleStats]++;
      }
    });

    // Buscar top autores por número de músicas
    const { data: topAuthors } = await supabase
      .from('Song')
      .select(`
        authorId,
        author:User!Song_authorId_fkey(name, image)
      `)
      .limit(1000); // Limitamos para evitar sobrecarga

    const authorCounts: { [key: string]: { name: string; image: string | null; count: number } } = {};
    
    topAuthors?.forEach((song: any) => {
      const authorId = song.authorId;
      if (!authorCounts[authorId]) {
        authorCounts[authorId] = {
          name: song.author?.name || 'Utilizador Desconhecido',
          image: song.author?.image || null,
          count: 0
        };
      }
      authorCounts[authorId].count++;
    });

    const topAuthorsList = Object.entries(authorCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([id, data]) => ({
        id,
        name: data.name,
        image: data.image,
        songCount: data.count
      }));

    // Novos utilizadores por role (últimos 30 dias)
    // Use separate count queries per role to avoid parsing large result sets and to be robust to schema differences
    const [
      { count: newUsersUSER },
      { count: newUsersREVIEWER },
      { count: newUsersADMIN }
    ] = await Promise.all([
      supabase.from('User').select('id', { count: 'exact', head: true }).gte('createdAt', thirtyDaysAgo.toISOString()).eq('role', 'USER'),
      supabase.from('User').select('id', { count: 'exact', head: true }).gte('createdAt', thirtyDaysAgo.toISOString()).eq('role', 'REVIEWER'),
      supabase.from('User').select('id', { count: 'exact', head: true }).gte('createdAt', thirtyDaysAgo.toISOString()).eq('role', 'ADMIN')
    ]);

    const newUsersByRole = [
      { role: 'USER', count: Number(newUsersUSER ?? 0) || 0 },
      { role: 'REVIEWER', count: Number(newUsersREVIEWER ?? 0) || 0 },
      { role: 'ADMIN', count: Number(newUsersADMIN ?? 0) || 0 }
    ];

    // Agrupar músicas por momento litúrgico
    // Supondo que Song tem um campo moments que é um Postgres array ou jsonb
    const { data: songsWithMoments } = await supabase
      .from('Song')
      .select('id, moments')
      .limit(2000);

    const songsByMomentMap: Record<string, number> = {};
    songsWithMoments?.forEach((s: any) => {
      const moments = s.moments || [];
      if (Array.isArray(moments)) {
        moments.forEach((m: string) => {
          if (!m) return;
          songsByMomentMap[m] = (songsByMomentMap[m] || 0) + 1;
        });
      } else if (typeof moments === 'string') {
        // fallback if stored as "{a,b}"
        const cleaned = moments.replace(/[{}]/g, '');
        cleaned.split(',').map(x => x.trim()).filter(Boolean).forEach((m) => {
          songsByMomentMap[m] = (songsByMomentMap[m] || 0) + 1;
        });
      }
    });

    const songsByMoment = Object.entries(songsByMomentMap)
      .map(([moment, count]) => ({ moment, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      totalSongs: totalSongs || 0,
      totalPlaylists: totalPlaylists || 0,
      pendingSubmissions: pendingSubmissions || 0,
      totalSubmissions: pendingSubmissions || 0, // Para compatibilidade
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
      submissionsByMonth: [], // Dados mockados por agora
      recentActivities: [], // Dados mockados por agora
  topAuthors: topAuthorsList,
  newUsersByRole,
  songsByMoment,
  lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
