import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk-auth';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();

  try {
    const [
      { count: songsCount },
      { count: playlistsCount },
      { count: starsCount },
      { count: submissionsCount },
    ] = await Promise.all([
      supabase.from('SongSubmission').select('*', { count: 'exact', head: true }).eq('submitterId', user.supabaseUserId).eq('status', 'APPROVED'),
      supabase.from('Playlist').select('*', { count: 'exact', head: true }).eq('userId', user.supabaseUserId),
      supabase.from('Star').select('*', { count: 'exact', head: true }).eq('userId', user.supabaseUserId),
      supabase.from('SongSubmission').select('*', { count: 'exact', head: true }).eq('submitterId', user.supabaseUserId),
    ]);

    return NextResponse.json({
      stats: {
        songs: songsCount || 0,
        playlists: playlistsCount || 0,
        stars: starsCount || 0,
        submissions: submissionsCount || 0,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json({
      stats: { songs: 0, playlists: 0, stars: 0, submissions: 0 }
    });
  }
}
