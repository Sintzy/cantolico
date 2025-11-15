import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminSupabase as supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id: userIdStr } = await params;
    const userId = parseInt(userIdStr, 10);
    
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }
    
    console.log('📊 Fetching summary for user ID:', userId, 'type:', typeof userId);

    // Fetch data with simpler queries - no complex joins initially
    console.log('🔍 Fetching song versions created by user...');
    const songVersionsRes = await supabaseAdmin
      .from('SongVersion')
      .select('songId, Song!SongVersion_songId_fkey(id,title)')
      .eq('createdById', userId)
      .limit(50);
    console.log('Song versions result:', { error: songVersionsRes.error, count: songVersionsRes.data?.length });
    
    // Extract unique songs from versions
    const songsMap = new Map();
    if (songVersionsRes.data) {
      songVersionsRes.data.forEach((version: any) => {
        if (version.Song && !songsMap.has(version.Song.id)) {
          songsMap.set(version.Song.id, version.Song);
        }
      });
    }
    const songs = Array.from(songsMap.values());
    
    console.log('🔍 Fetching playlists...');
    const playlistsRes = await supabaseAdmin.from('Playlist').select('id,name').eq('userId', userId).limit(20);
    console.log('Playlists result:', { error: playlistsRes.error, count: playlistsRes.data?.length });
    
    console.log('🔍 Fetching stars...');
    const starsRes = await supabaseAdmin.from('Star').select('songId').eq('userId', userId).limit(50);
    console.log('Stars result:', { error: starsRes.error, count: starsRes.data?.length });
    
    console.log('🔍 Fetching sessions...');
    const sessionsRes = await supabaseAdmin.from('Session').select('*').eq('userId', userId);
    console.log('Sessions result:', { error: sessionsRes.error, count: sessionsRes.data?.length });
    
    console.log('🔍 Fetching logs...');
    const logsRes = await supabaseAdmin.from('logs').select('id,level,message,details,created_at').eq('user_id', userId).limit(100).order('created_at', { ascending: false });
    console.log('Logs result:', { error: logsRes.error, count: logsRes.data?.length });
    
    console.log('🔍 Fetching accounts...');
    const accountsRes = await supabaseAdmin.from('Account').select('id,provider,providerAccountId').eq('userId', userId);
    console.log('Accounts result:', { error: accountsRes.error, count: accountsRes.data?.length });

    console.log('Accounts result:', { error: accountsRes.error, count: accountsRes.data?.length });

    // Now fetch song titles for stars if we have stars
    const starsWithTitles = [];
    if (starsRes.data && starsRes.data.length > 0) {
      for (let i = 0; i < starsRes.data.length; i++) {
        const star = starsRes.data[i];
        const { data: song } = await supabaseAdmin.from('Song').select('title').eq('id', star.songId).single();
        starsWithTitles.push({
          id: i, // Use index as ID since Star table doesn't have an id
          songId: star.songId,
          title: song?.title || null
        });
      }
    }

    // Fetch playlist items for each playlist
    const playlistsWithItems: any[] = [];
    if (playlistsRes.data && playlistsRes.data.length > 0) {
      for (const playlist of playlistsRes.data) {
        const { data: items } = await supabaseAdmin
          .from('PlaylistItem')
          .select('id,trackId')
          .eq('playlistId', playlist.id)
          .order('createdAt', { ascending: false });
        
        const itemsWithTitles = [];
        if (items && items.length > 0) {
          for (const item of items) {
            const { data: song } = await supabaseAdmin.from('Song').select('title').eq('id', item.trackId).single();
            itemsWithTitles.push({
              id: item.id,
              trackId: item.trackId,
              title: song?.title || null
            });
          }
        }
        
        playlistsWithItems.push({
          ...playlist,
          title: playlist.name,
          items: itemsWithTitles
        });
      }
    }

    console.log('✅ All data fetched successfully');

    return NextResponse.json({
      songs: songs || [],
      playlists: playlistsWithItems,
      stars: starsWithTitles,
      sessions: sessionsRes.data || [],
      logs: logsRes.data || [],
      accounts: accountsRes.data || [],
      counts: {
        songs: songs.length,
        playlists: (playlistsRes.data || []).length,
        stars: (starsRes.data || []).length,
        sessions: (sessionsRes.data || []).length,
        logs: (logsRes.data || []).length,
        accounts: (accountsRes.data || []).length,
      }
    });
  } catch (error) {
    console.error('user summary error', error);
    return NextResponse.json({ error: 'Internal' }, { status: 500 });
  }
}
