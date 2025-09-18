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

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Estatísticas por período
    const [
      { count: newUsers },
      { count: newSongs },
      { count: newSubmissions },
      { count: newPlaylists }
    ] = await Promise.all([
      supabase.from('User')
        .select('id', { count: 'exact', head: true })
        .gte('createdAt', daysAgo.toISOString()),
      supabase.from('Song')
        .select('id', { count: 'exact', head: true })
        .gte('createdAt', daysAgo.toISOString()),
      supabase.from('SongSubmission')
        .select('id', { count: 'exact', head: true })
        .gte('createdAt', daysAgo.toISOString()),
      supabase.from('Playlist')
        .select('id', { count: 'exact', head: true })
        .gte('createdAt', daysAgo.toISOString())
    ]);

    // Top utilizadores por contribuições
    const { data: topContributors } = await supabase
      .from('Song')
      .select(`
        authorId,
        author:User!Song_authorId_fkey(name, image)
      `);

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

    // Estatísticas de moderação
    const { data: moderationStats } = await supabase
      .from('UserModeration')
      .select('status, type, moderatedAt')
      .gte('moderatedAt', daysAgo.toISOString());

    const moderationByType = {
      WARNING: 0,
      SUSPENSION: 0,
      BAN: 0
    };

    moderationStats?.forEach((mod: any) => {
      if (mod.type && moderationByType.hasOwnProperty(mod.type)) {
        moderationByType[mod.type as keyof typeof moderationByType]++;
      }
    });

    // Atividade por dia (últimos 7 dias)
    const dailyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const [
        { count: dailyUsers },
        { count: dailySongs },
        { count: dailySubmissions }
      ] = await Promise.all([
        supabase.from('User')
          .select('id', { count: 'exact', head: true })
          .gte('createdAt', startOfDay.toISOString())
          .lte('createdAt', endOfDay.toISOString()),
        supabase.from('Song')
          .select('id', { count: 'exact', head: true })
          .gte('createdAt', startOfDay.toISOString())
          .lte('createdAt', endOfDay.toISOString()),
        supabase.from('SongSubmission')
          .select('id', { count: 'exact', head: true })
          .gte('createdAt', startOfDay.toISOString())
          .lte('createdAt', endOfDay.toISOString())
      ]);

      dailyActivity.push({
        date: startOfDay.toISOString().split('T')[0],
        users: dailyUsers || 0,
        songs: dailySongs || 0,
        submissions: dailySubmissions || 0
      });
    }

    return NextResponse.json({
      period: {
        days: parseInt(period),
        newUsers: newUsers || 0,
        newSongs: newSongs || 0,
        newSubmissions: newSubmissions || 0,
        newPlaylists: newPlaylists || 0
      },
      topContributors: topContributorsList,
      moderation: {
        totalActions: moderationStats?.length || 0,
        byType: moderationByType
      },
      dailyActivity,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in admin analytics API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
