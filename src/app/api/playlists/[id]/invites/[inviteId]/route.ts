import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logApiRequestError, logPlaylistSongRemoved, toErrorContext } from '@/lib/logging-helpers';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: playlistId, inviteId } = await params;

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
      return NextResponse.json({ error: 'Access denied - only playlist owner can cancel invites' }, { status: 403 });
    }

    // Check if invite exists and is pending
    const { data: invite, error: inviteError } = await adminSupabase
      .from('PlaylistMember')
      .select('userEmail, status, invitedAt')
      .eq('id', inviteId)
      .eq('playlistId', playlistId)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (invite.status !== 'INVITED' && invite.status !== 'PENDING') {
      return NextResponse.json({ error: 'Only pending invites can be cancelled' }, { status: 400 });
    }

    // Log the cancellation
    logPlaylistSongRemoved({
      playlist_id: playlistId,
      song_id: inviteId,
      user: { user_id: session.user.id, user_email: session.user.email || undefined },
      details: {
        playlistName: playlist.name,
        invitedUserEmail: invite.userEmail,
        invitedAt: invite.invitedAt,
        action: 'playlist_invite_cancelled',
        entity: 'playlist'
      }
    });

    // Delete the invite
    const { error: deleteError } = await adminSupabase
      .from('PlaylistMember')
      .delete()
      .eq('id', inviteId)
      .eq('playlistId', playlistId);

    if (deleteError) {
      logApiRequestError({
        method: request.method,
        url: request.url,
        path: '/api/playlists/[id]/invites/[inviteId]',
        status_code: 500,
        error: toErrorContext(deleteError),
        details: { action: 'cancel_invite' }
      });
      return NextResponse.json({ error: 'Failed to cancel invite' }, { status: 500 });
    }

    logPlaylistSongRemoved({
      playlist_id: playlistId,
      song_id: inviteId,
      user: { user_id: session.user.id, user_email: session.user.email || undefined },
      details: {
        invitedUserEmail: invite.userEmail,
        action: 'playlist_invite_cancelled_success',
        entity: 'playlist',
        status: 'cancelled'
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Invite cancelled successfully' 
    });

  } catch (error) {
    logApiRequestError({
      method: request.method,
      url: request.url,
      path: '/api/playlists/[id]/invites/[inviteId]',
      status_code: 500,
      error: toErrorContext(error),
      details: { action: 'invite_cancellation_error' }
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}