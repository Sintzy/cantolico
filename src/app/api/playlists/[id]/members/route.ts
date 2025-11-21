import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logApiRequestError, logPlaylistSongAdded, logPlaylistSongRemoved, toErrorContext } from '@/lib/logging-helpers';

// GET: List playlist members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: playlistId } = await params;

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

    // Get playlist members
    const { data: members, error: membersError } = await adminSupabase
      .from('PlaylistMember')
      .select(`
        id,
        userEmail,
        role,
        status,
        invitedAt,
        acceptedAt,
        User!PlaylistMember_invitedBy_fkey (
          id,
          name,
          email
        )
      `)
      .eq('playlistId', playlistId)
      .order('invitedAt', { ascending: false });

    if (membersError) {
      logApiRequestError({
        method: request.method,
        url: request.url,
        path: '/api/playlists/[id]/members',
        status_code: 500,
        error: toErrorContext(membersError),
        details: { action: 'fetch_members', playlistId } as any
      });
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    // Get all emails (invited + owner) in one query for better performance
    const invitedEmails = (members || []).map((member: any) => member.userEmail).filter(Boolean);
    const allEmails = [...invitedEmails, playlist.userId]; // Add owner ID for single query

    // Single query for all user data including owner
    const { data: allUsers } = await adminSupabase
      .from('User')
      .select('id, name, email, image')
      .or(`email.in.(${invitedEmails.join(',')}),id.eq.${playlist.userId}`);
    
    const usersData = allUsers || [];
    const owner = usersData.find(user => user.id === playlist.userId);

    // Format members more efficiently
    const formattedMembers = (members || []).map((member: any) => {
      const userData = usersData.find(user => user.email === member.userEmail);
      return {
        id: member.id,
        email: member.userEmail,
        name: userData?.name || null,
        image: userData?.image || null,
        role: member.role === 'OWNER' ? 'owner' : 'editor',
        status: member.status === 'ACCEPTED' ? 'accepted' : 'pending',
        joinedAt: member.acceptedAt || member.invitedAt
      };
    });

    // Add owner to the members list (faster construction)
    const allMembers = [
      {
        id: `owner-${playlist.userId}`,
        email: owner?.email || '',
        name: owner?.name || null,
        image: owner?.image || null,
        role: 'owner',
        status: 'accepted',
        joinedAt: new Date().toISOString()
      },
      ...formattedMembers
    ];

    console.log('All members for playlist', playlistId, ':', allMembers);

    return NextResponse.json(allMembers);

  } catch (error) {
    logApiRequestError({
      method: request.method,
      url: request.url,
      path: '/api/playlists/[id]/members',
      status_code: 500,
      error: toErrorContext(error),
      details: { action: 'members_get_error' }
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Invite user to playlist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: playlistId } = await params;
    const { userEmail, role = 'EDITOR' } = await request.json();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!userEmail || !userEmail.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    if (!['EDITOR', 'VIEWER'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
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

    // Check if user exists
    const { data: invitedUser, error: userError } = await adminSupabase
      .from('User')
      .select('id, name, email')
      .eq('email', userEmail)
      .single();

    if (userError || !invitedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if invitation already exists
    const { data: existingInvitation, error: existingError } = await adminSupabase
      .from('PlaylistMember')
      .select('id, status')
      .eq('playlistId', playlistId)
      .eq('userEmail', userEmail)
      .single();

    if (existingInvitation) {
      if (existingInvitation.status === 'PENDING') {
        return NextResponse.json({ error: 'Invitation already sent' }, { status: 409 });
      } else if (existingInvitation.status === 'ACCEPTED') {
        return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
      }
    }

    // Create invitation
    const { data: invitation, error: invitationError } = await adminSupabase
      .from('PlaylistMember')
      .insert({
        playlistId,
        userEmail,
        role,
        status: 'PENDING',
        invitedBy: session.user.id
      })
      .select(`
        id,
        userEmail,
        role,
        status,
        invitedAt,
        User!PlaylistMember_invitedBy_fkey (
          id,
          name,
          email
        )
      `)
      .single();

    if (invitationError) {
      logApiRequestError({
        method: request.method,
        url: request.url,
        path: '/api/playlists/[id]/members',
        status_code: 500,
        error: toErrorContext(invitationError),
        details: { action: 'create_invitation_error', userEmail } as any
      });
      return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
    }

    logPlaylistSongAdded({
      playlist_id: playlistId,
      song_id: invitation.id,
      user: { user_email: session.user.email || undefined },
      details: {
        action: 'invitation_sent',
        invitedUserEmail: userEmail,
        role
      }
    });

    return NextResponse.json({
      success: true,
      invitation,
      message: 'Invitation sent successfully'
    });

  } catch (error) {
    logApiRequestError({
      method: request.method,
      url: request.url,
      path: '/api/playlists/[id]/members',
      status_code: 500,
      error: toErrorContext(error),
      details: { action: 'members_post_error' } as any
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Remove member or cancel invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: playlistId } = await params;
    const url = new URL(request.url);
    const memberId = url.searchParams.get('memberId');

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    // Check if user is playlist owner
    const { data: playlist, error: playlistError } = await adminSupabase
      .from('Playlist')
      .select('userId')
      .eq('id', playlistId)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    if (playlist.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Remove member
    const { error: deleteError } = await adminSupabase
      .from('PlaylistMember')
      .delete()
      .eq('id', memberId)
      .eq('playlistId', playlistId);

    if (deleteError) {
      logApiRequestError({
        method: request.method,
        url: request.url,
        path: '/api/playlists/[id]/members',
        status_code: 500,
        error: toErrorContext(deleteError),
        details: { action: 'remove_member_error', memberId }
      });
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    logPlaylistSongRemoved({
      playlist_id: playlistId,
      song_id: memberId,
      user: { user_email: session.user.email || undefined },
      details: {
        action: 'member_removed',
        memberId
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
      path: '/api/playlists/[id]/members',
      status_code: 500,
      error: toErrorContext(error),
      details: { action: 'members_delete_error' }
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}