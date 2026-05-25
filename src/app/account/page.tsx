import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/clerk-auth';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import AccountPageClient from './AccountPageClient';

export const metadata = {
  title: 'A Minha Conta | Cantólico',
  description: 'Gerir a minha conta e configurações',
};

export default async function AccountPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/sign-in?redirect_url=/account');
  }

  const supabase = createAdminSupabaseClient();

  const [
    { count: songsCount },
    { count: playlistsCount },
    { count: starsCount },
    { count: submissionsCount },
  ] = await Promise.all([
    supabase.from('SongSubmission').select('*', { count: 'exact', head: true }).eq('submitterId', user.supabaseUserId).eq('status', 'APPROVED'),
    supabase.from('Playlist').select('*', { count: 'exact', head: true }).eq('userId', user.supabaseUserId),
    supabase.from('Star').select('*', { count: 'exact', head: true }).eq('userId', user.supabaseUserId),
    supabase.from('SongSubmission').select('*', { count: 'exact', head: true }).eq('submitterId', user.supabaseUserId),
  ]);

  const stats = {
    songs: songsCount || 0,
    playlists: playlistsCount || 0,
    stars: starsCount || 0,
    submissions: submissionsCount || 0,
  };

  return <AccountPageClient initialStats={stats} />;
}
