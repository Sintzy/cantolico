import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client';
import { protectApiRoute, applySecurityHeaders } from '@/lib/api-protection'

export async function GET(request: NextRequest) {
  // Verifica se a requisição vem de uma origem autorizada
  const unauthorizedResponse = protectApiRoute(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const skip = (page - 1) * limit

    const [playlistsResult, totalResult] = await Promise.all([
      supabase
        .from('Playlist')
        .select(`
          id,
          name,
          description,
          isPublic,
          userId,
          createdAt,
          updatedAt,
          User!Playlist_userId_fkey (
            id,
            name,
            image
          )
        `)
        .eq('isPublic', true)
        .order('updatedAt', { ascending: false })
        .range(skip, skip + limit - 1),
      supabase
        .from('Playlist')
        .select('*', { count: 'exact', head: true })
        .eq('isPublic', true)
    ]);

    if (playlistsResult.error) {
      throw new Error(`Supabase error: ${playlistsResult.error.message}`);
    }

    const playlists = playlistsResult.data || [];
    const total = totalResult.count || 0;

    // Buscar contagem de itens para cada playlist
    const playlistIds = playlists.map(p => p.id);
    let itemCounts: { [key: string]: number } = {};
    
    if (playlistIds.length > 0) {
      const { data: itemData } = await supabase
        .from('PlaylistItem')
        .select('playlistId')
        .in('playlistId', playlistIds);
      
      // Contar itens por playlist
      (itemData || []).forEach(item => {
        itemCounts[item.playlistId] = (itemCounts[item.playlistId] || 0) + 1;
      });
    }

    // Reformatar dados para manter compatibilidade
    const formattedPlaylists = playlists.map(playlist => ({
      ...playlist,
      user: playlist.User || null,
      _count: {
        items: itemCounts[playlist.id] || 0
      }
    }));

    const response = NextResponse.json({
      playlists: formattedPlaylists,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    return applySecurityHeaders(response);
  } catch (error) {
    console.error('Erro ao buscar playlists públicas:', error)
    const response = NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
    return applySecurityHeaders(response);
  }
}
