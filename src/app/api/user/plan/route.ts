import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk-auth';
import { FREE_LIMITS, getUserPremiumState, getUserResourceCount } from '@/lib/premium';

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: 'Login necessário' }, { status: 401 });
  }

  const [premium, playlists, masses] = await Promise.all([
    getUserPremiumState(user.supabaseUserId),
    getUserResourceCount(user.supabaseUserId, 'Playlist'),
    getUserResourceCount(user.supabaseUserId, 'Mass'),
  ]);

  return NextResponse.json({
    ...premium,
    limits: FREE_LIMITS,
    usage: {
      playlists,
      masses,
    },
  });
}
