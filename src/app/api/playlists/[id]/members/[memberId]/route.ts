import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase-admin';
import { logApiRequestError, logPlaylistSongRemoved, toErrorContext } from '@/lib/logging-helpers';

import { getClerkSession } from '@/lib/api-middleware';
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await getClerkSession();
    const { id: playlistId, memberId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is playlist owner
    const { data: playlist, error: playlistError } = await adminSupabase
      .from('Playlist')
      .select('userId, name')
      .eq('id', playlistId)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    if (playlist.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if member exists
    const { data: member, error: memberError } = await adminSupabase
      .from('PlaylistMember')
      .select('userEmail')
      .eq('id', memberId)
      .eq('playlistId', playlistId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Remove member
    const { error: deleteError } = await adminSupabase
      .from('PlaylistMember')
      .delete()
      .eq('id', memberId)
      .eq('playlistId', playlistId);

    if (deleteError) {
      const errorContext = toErrorContext(deleteError);
      logApiRequestError({
        method: request.method,
        url: request.url,
        path: '/api/playlists/[id]/members/[memberId]',
        status_code: 500,
        error: errorContext,
        details: { action: 'remove_member' }
      });
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    logPlaylistSongRemoved({
      playlist_id: playlistId,
      song_id: memberId,
      user: { user_email: session.user.email || undefined },
      details: {
        memberEmail: member.userEmail,
        playlistName: playlist.name,
        action: 'member_removed',
        removedBy: session.user.email || undefined
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    });

  } catch (error) {
    logApiRequestError({
      method: request.method,
      url: request.url,
      path: '/api/playlists/[id]/members/[memberId]',
      status_code: 500,
      error: toErrorContext(error),
      details: { action: 'member_delete_error' }
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}