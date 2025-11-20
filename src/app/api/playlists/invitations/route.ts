import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logApiRequestError, logPlaylistSongAdded, toErrorContext } from '@/lib/logging-helpers';

// GET: Get user's playlist invitations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's pending invitations
    const { data: invitations, error: invitationsError } = await adminSupabase
      .from('PlaylistMember')
      .select(`
        id,
        role,
        status,
        invitedAt,
        Playlist!PlaylistMember_playlistId_fkey (
          id,
          name,
          description,
          visibility,
          User!Playlist_userId_fkey (
            id,
            name,
            email
          )
        ),
        User!PlaylistMember_invitedBy_fkey (
          id,
          name,
          email
        )
      `)
      .eq('userEmail', session.user.email)
      .eq('status', 'PENDING')
      .order('invitedAt', { ascending: false });

      if (invitationsError) {
        logApiRequestError({
          method: request.method,
          url: request.url,
          path: '/api/playlists/invitations',
          status_code: 500,
          error: toErrorContext(invitationsError)
        });
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      invitations: invitations || []
    });

  } catch (error) {
    logApiRequestError({
      method: request.method,
      url: request.url,
      path: '/api/playlists/invitations',
      status_code: 500,
      error: toErrorContext(error)
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Respond to invitation (accept/decline)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { invitationId, action } = await request.json();

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 });
    }

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Action must be "accept" or "decline"' }, { status: 400 });
    }

    // Verify invitation belongs to user and is pending
    const { data: invitation, error: invitationError } = await adminSupabase
      .from('PlaylistMember')
      .select(`
        id,
        userEmail,
        status,
        playlistId,
        Playlist!PlaylistMember_playlistId_fkey (
          name
        )
      `)
      .eq('id', invitationId)
      .eq('userEmail', session.user.email)
      .eq('status', 'PENDING')
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Update invitation status
    const newStatus = action === 'accept' ? 'ACCEPTED' : 'DECLINED';
    const updateData: any = {
      status: newStatus
    };

    if (action === 'accept') {
      updateData.acceptedAt = new Date().toISOString();
    }

    const { error: updateError } = await adminSupabase
      .from('PlaylistMember')
      .update(updateData)
      .eq('id', invitationId);

      if (updateError) {
        logApiRequestError({
          method: request.method,
          url: request.url,
          path: '/api/playlists/invitations',
          status_code: 500,
          error: toErrorContext(updateError)
        });
      return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 });
    }

    const actionText = action === 'accept' ? 'accepted' : 'declined';
    logPlaylistSongAdded({
      playlist_id: invitation.playlistId,
      song_id: invitationId,
      user: { user_email: session.user.email || undefined },
      details: {
        action: `invitation_${actionText}`,
        playlistName: invitation.Playlist[0]?.name || 'Unknown Playlist',
        invitedUserEmail: invitation.userEmail
      }
    });

    return NextResponse.json({
      success: true,
      message: `Invitation ${actionText} successfully`,
      status: newStatus
    });

  } catch (error) {
    logApiRequestError({
      method: request.method,
      url: request.url,
      path: '/api/playlists/invitations',
      status_code: 500,
      error: toErrorContext(error)
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}