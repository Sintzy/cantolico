import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedUser } from '@/lib/clerk-auth';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { createClerkClient } from '@clerk/nextjs/server';
import AccountPageClient from './AccountPageClient';

export const metadata = {
  title: 'A Minha Conta | Cantólico',
  description: 'Gerir a minha conta e configurações',
};

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

export default async function AccountPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/sign-in?redirect_url=/account');
  }

  const { sessionId: currentSessionId } = await auth();
  const supabase = createAdminSupabaseClient();

  // Fetch stats and sessions in parallel on the server
  const [
    { count: songsCount },
    { count: playlistsCount },
    { count: starsCount },
    { count: submissionsCount },
    sessionList,
  ] = await Promise.all([
    supabase.from('SongSubmission').select('*', { count: 'exact', head: true }).eq('submitterId', user.supabaseUserId).eq('status', 'APPROVED'),
    supabase.from('Playlist').select('*', { count: 'exact', head: true }).eq('userId', user.supabaseUserId),
    supabase.from('Star').select('*', { count: 'exact', head: true }).eq('userId', user.supabaseUserId),
    supabase.from('SongSubmission').select('*', { count: 'exact', head: true }).eq('submitterId', user.supabaseUserId),
    clerk.sessions.getSessionList({ userId: user.clerkUserId, status: 'active' }).catch(() => ({ data: [] })),
  ]);

  const stats = {
    songs: songsCount || 0,
    playlists: playlistsCount || 0,
    stars: starsCount || 0,
    submissions: submissionsCount || 0,
  };

  const sessions = sessionList.data.map((s) => ({
    id: s.id,
    status: s.status,
    lastActiveAt: s.lastActiveAt,
    expireAt: s.expireAt,
    clientId: s.clientId,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    isCurrent: s.id === currentSessionId,
  }));

  return <AccountPageClient initialStats={stats} initialSessions={sessions} />;
}
