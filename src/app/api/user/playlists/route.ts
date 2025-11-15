import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase-client'
import { withAuthApiProtection } from '@/lib/api-middleware'
import { logPlaylistAction, getUserInfoFromRequest } from '@/lib/user-action-logger';

export const GET = withAuthApiProtection(async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    console.log('Fetching playlists for user:', session.user.id);
    console.log('Session user object:', JSON.stringify(session.user, null, 2));

    // Primeiro, fazer uma query simples para debug
    const { data: testPlaylists, error: testError } = await supabase
      .from('Playlist')
      .select('*')
      .eq('userId', session.user.id);
    
    console.log('Simple query result:', testPlaylists?.length, testError);

    // 1. Buscar playlists próprias
    const { data: ownPlaylists, error: ownPlaylistsError } = await supabase
      .from('Playlist')
      .select(`
        *,
        User:userId (
          id,
          name,
          email,
          image
        )
      `)
      .eq('userId', session.user.id)
      .order('updatedAt', { ascending: false });

    if (ownPlaylistsError) {
      console.error('Error fetching own playlists:', ownPlaylistsError);
      return NextResponse.json({ error: 'Erro ao buscar playlists próprias' }, { status: 500 });
    }

    // 2. Buscar playlists onde é membro aceito
    const { data: membershipData, error: membershipError } = await supabase
      .from('PlaylistMember')
      .select(`
        id,
        role,
        status,
        acceptedAt,
        Playlist (
          *,
          User:userId (
            id,
            name,
            email,
            image
          )
        )
      `)
      .eq('userEmail', session.user.email)
      .eq('status', 'ACCEPTED')
      .order('acceptedAt', { ascending: false });

    if (membershipError) {
      console.error('Error fetching member playlists:', membershipError);
      return NextResponse.json({ error: 'Erro ao buscar playlists de membro' }, { status: 500 });
    }

    // 3. Combinar playlists próprias e de membro
    let allPlaylists = [
      ...(ownPlaylists || []).map(playlist => ({ 
        ...playlist, 
        userRole: 'owner',
        isOwner: true 
      })),
      ...(membershipData || []).map(member => ({
        ...member.Playlist,
        userRole: 'editor',
        isOwner: false
      }))
    ];

    // 3.a If admin, include all playlists from the system so admins can manage them
    if (session.user.role === 'ADMIN') {
      const { data: all, error: allError } = await supabase
        .from('Playlist')
        .select(`
          *,
          User:userId (
            id,
            name,
            email,
            image
          )
        `)
        .order('updatedAt', { ascending: false });

      if (!allError && all) {
        const mapped = all.map((p: any) => ({
          ...p,
          userRole: p.userId === session.user.id ? 'owner' : 'admin',
          isOwner: p.userId === session.user.id
        }));

        // Merge admin view with existing lists, prefer owner entries when duplicated
        const map = new Map();
        mapped.forEach((pl: any) => map.set(pl.id, pl));
        allPlaylists.forEach((pl: any) => map.set(pl.id, pl));
        allPlaylists = Array.from(map.values());
      }
    }

    // 4. Remover duplicatas (caso seja dono e membro)
    const uniquePlaylistsMap = new Map();
    allPlaylists.forEach(playlist => {
      if (!uniquePlaylistsMap.has(playlist.id) || playlist.isOwner) {
        uniquePlaylistsMap.set(playlist.id, playlist);
      }
    });
    
    const playlists = Array.from(uniquePlaylistsMap.values());

    console.log('Total playlists found:', playlists.length);
    console.log('Own playlists:', (ownPlaylists || []).length);
    console.log('Member playlists:', (membershipData || []).length);

    // Buscar contagem de itens e membros para cada playlist
    const playlistsWithCount = await Promise.all(
      playlists.map(async (playlist) => {
        // Buscar contagem de itens
        const { count } = await supabase
          .from('PlaylistItem')
          .select('*', { count: 'exact', head: true })
          .eq('playlistId', playlist.id);

        // Buscar membros da playlist
        const { data: members } = await supabase
          .from('PlaylistMember')
          .select(`
            id,
            userEmail,
            role,
            status
          `)
          .eq('playlistId', playlist.id);

        return {
          id: playlist.id,
          name: playlist.name,
          description: playlist.description,
          isPublic: playlist.isPublic,
          createdAt: playlist.createdAt,
          updatedAt: playlist.updatedAt,
          userRole: playlist.userRole,
          songsCount: count || 0,
          user: playlist.User || null,
          members: (members || []).map(member => ({
            id: member.id,
            role: member.role === 'EDITOR' ? 'editor' : 'viewer',
            status: member.status.toLowerCase(),
            user: {
              email: member.userEmail
            }
          }))
        };
      })
    );

    console.log('Returning playlists:', playlistsWithCount.length);

    // Log user action: viewed playlists
    try {
      await logPlaylistAction('view_playlists', getUserInfoFromRequest(request, session), true, {
        count: playlistsWithCount.length
      });
    } catch (e) {
      console.warn('Failed to log view_playlists action:', e);
    }
    return NextResponse.json(playlistsWithCount)
  } catch (error) {
    console.error('Erro ao buscar playlists do usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
});
