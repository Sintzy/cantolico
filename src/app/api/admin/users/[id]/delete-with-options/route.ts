import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminSupabase as supabaseAdmin } from '@/lib/supabase-admin';

type DeleteOptions = {
  deleteSongs?: boolean;
  deletePlaylists?: boolean;
  deleteStars?: boolean;
  deleteEverything?: boolean;
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: userId } = await params;
    const body = await req.json();
    const opts: DeleteOptions = body.options || {};

    // Remoção de log de início - apenas erros importantes
    console.log(`Admin ${session.user.email} deleting user ${userId} with options:`, opts);

    const results: any = {};

    if (opts.deleteEverything) {
      opts.deleteSongs = opts.deletePlaylists = opts.deleteStars = true;
    }

    if (opts.deleteSongs) {
      const { data: songs } = await supabaseAdmin.from('Song').select('id').eq('user_id', userId);
      results.songsDeleted = Array.isArray(songs) ? songs.length : 0;
      await supabaseAdmin.from('Song').delete().eq('user_id', userId);
    }

    if (opts.deletePlaylists) {
      const { data: playlists } = await supabaseAdmin.from('Playlist').select('id').eq('owner_id', userId);
      results.playlistsDeleted = Array.isArray(playlists) ? playlists.length : 0;
      await supabaseAdmin.from('Playlist').delete().eq('owner_id', userId);
    }

    if (opts.deleteStars) {
      const { data: stars } = await supabaseAdmin.from('Star').select('id').eq('user_id', userId);
      results.starsDeleted = Array.isArray(stars) ? stars.length : 0;
      await supabaseAdmin.from('Star').delete().eq('user_id', userId);
    }

    // Always remove sessions/accounts
    await supabaseAdmin.from('Session').delete().eq('user_id', userId);
    await supabaseAdmin.from('Account').delete().eq('user_id', userId);

    // Finally delete user
    await supabaseAdmin.from('User').delete().eq('id', userId);

    // Sucesso - remoção de log redundante
    console.log(`✅ Admin ${session.user.email} deleted user ${userId}. Results:`, results);

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Admin delete with options error', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
