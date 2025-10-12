import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logGeneral, logErrors } from '@/lib/logs';

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

    if (playlist.userId !== session.user.id) {
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
      logErrors('ERROR', 'Error fetching playlist members', JSON.stringify(membersError));
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
    logErrors('ERROR', 'Error in playlist members GET', String(error));
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

    if (playlist.userId !== session.user.id) {
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
      logErrors('ERROR', 'Error creating playlist invitation', JSON.stringify(invitationError));
      return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
    }

    logGeneral('INFO', 'Playlist invitation sent', `${playlistId} -> ${userEmail} by ${session.user.email}`);

    return NextResponse.json({
      success: true,
      invitation,
      message: 'Invitation sent successfully'
    });

  } catch (error) {
    logErrors('ERROR', 'Error in playlist members POST', String(error));
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

    if (playlist.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Remove member
    const { error: deleteError } = await adminSupabase
      .from('PlaylistMember')
      .delete()
      .eq('id', memberId)
      .eq('playlistId', playlistId);

    if (deleteError) {
      logErrors('ERROR', 'Error removing playlist member', JSON.stringify(deleteError));
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    logGeneral('INFO', 'Playlist member removed', `${memberId} from ${playlistId} by ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    });

  } catch (error) {
    logErrors('ERROR', 'Error in playlist members DELETE', String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}