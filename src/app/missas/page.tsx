import { Metadata } from 'next';
import { getAuthenticatedUser } from '@/lib/clerk-auth';
import { redirect } from 'next/navigation';
import MassesPageClient from './page.client';
import { adminSupabase as supabase } from '@/lib/supabase-admin';

export const metadata: Metadata = {
  title: 'Missas | Cantólico',
  description: 'Organiza as tuas missas com cânticos para cada momento litúrgico',
};

async function getMasses(userId: number) {
  const { data: masses, error } = await supabase
    .from('Mass')
    .select(`
      id,
      name,
      description,
      date,
      parish,
      celebrant,
      celebration,
      liturgicalColor,
      visibility,
      userId,
      createdAt,
      updatedAt,
      User!Mass_userId_fkey (
        id,
        name,
        email,
        image
      ),
      MassItem (
        id
      )
    `)
    .eq('userId', userId)
    .order('date', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Error fetching masses:', error);
    return [];
  }

  return (masses || []).map(mass => ({
    ...mass,
    user: mass.User || null,
    _count: {
      items: (mass.MassItem || []).length
    }
  }));
}

export default async function MassesPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/sign-in?redirect_url=/missas');
  }

  const masses = await getMasses(user.supabaseUserId);

  return <MassesPageClient initialMasses={masses as any} />;
}
