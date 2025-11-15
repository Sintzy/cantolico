import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logGeneral, logErrors } from '@/lib/logs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
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
      logErrors('ERROR', 'Error removing playlist member', JSON.stringify(deleteError));
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    logGeneral('INFO', 'Playlist member removed', `Member ${member.userEmail} removed from playlist ${playlist.name} by ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    });

  } catch (error) {
    logErrors('ERROR', 'Error in playlist member DELETE', String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}