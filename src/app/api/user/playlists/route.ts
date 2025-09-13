import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase-client'
import { withAuthApiProtection } from '@/lib/api-middleware'

export const GET = withAuthApiProtection(async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: playlists } = await supabase
      .from('Playlist')
      .select(`
        *,
        User:userId (
          id,
          name
        )
      `)
      .eq('userId', session.user.id)
      .order('updatedAt', { ascending: false });

    // Buscar contagem de itens para cada playlist
    const playlistsWithCount = await Promise.all(
      (playlists || []).map(async (playlist) => {
        const { count } = await supabase
          .from('PlaylistItem')
          .select('*', { count: 'exact', head: true })
          .eq('playlistId', playlist.id);

        return {
          ...playlist,
          user: playlist.User,
          _count: { items: count || 0 }
        };
      })
    );

    return NextResponse.json(playlistsWithCount)
  } catch (error) {
    console.error('Erro ao buscar playlists do usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
});
