import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase-admin';
import { protectApiRoute, applySecurityHeaders } from '@/lib/api-protection'

// Cache public playlists for 5 minutes
let cachedPublicPlaylists: any = null;
let cachedPlaylistTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const unauthorizedResponse = protectApiRoute(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const skip = (page - 1) * limit
    
    const now = Date.now();

    // Return cached if still valid
    if (cachedPublicPlaylists && (now - cachedPlaylistTime) < CACHE_TTL) {
      const startIdx = skip;
      const endIdx = startIdx + limit;
      const paginatedPlaylists = cachedPublicPlaylists.playlists.slice(startIdx, endIdx);
      
      const response = NextResponse.json({
        playlists: paginatedPlaylists,
        pagination: {
          page,
          limit,
          total: cachedPublicPlaylists.total,
          pages: Math.ceil(cachedPublicPlaylists.total / limit)
        }
      });
      response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      return applySecurityHeaders(response);
    }

    // Fetch playlists and count in parallel
    const [playlistsResult, itemCountsResult] = await Promise.all([
      adminSupabase
        .from('Playlist')
        .select('id,name,description,isPublic,userId,createdAt,updatedAt,User!Playlist_userId_fkey(id,name,image)', { count: 'exact' })
        .eq('isPublic', true)
        .order('updatedAt', { ascending: false }),
      adminSupabase
        .from('PlaylistItem')
        .select('playlistId')
    ]);

    if (playlistsResult.error) {
      throw new Error(`Supabase error: ${playlistsResult.error.message}`);
    }

    const playlists = playlistsResult.data || [];
    const total = playlistsResult.count || 0;

    // Count items per playlist efficiently
    const itemCounts: { [key: string]: number } = {};
    (itemCountsResult.data || []).forEach(item => {
      itemCounts[item.playlistId] = (itemCounts[item.playlistId] || 0) + 1;
    });

    const formattedPlaylists = playlists.map(playlist => ({
      ...playlist,
      user: playlist.User || null,
      _count: {
        items: itemCounts[playlist.id] || 0
      }
    }));

    // Cache the complete result
    cachedPublicPlaylists = { playlists: formattedPlaylists, total };
    cachedPlaylistTime = now;

    // Paginate after caching
    const paginatedPlaylists = formattedPlaylists.slice(skip, skip + limit);

    const response = NextResponse.json({
      playlists: paginatedPlaylists,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return applySecurityHeaders(response);
  } catch (error) {
    const response = NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
    return applySecurityHeaders(response);
  }
}
