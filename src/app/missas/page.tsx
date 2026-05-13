import { Metadata } from 'next';
import { getAuthenticatedUser } from '@/lib/clerk-auth';
import { redirect } from 'next/navigation';
import MassesPageClient from './page.client';
import { adminSupabase as supabase } from '@/lib/supabase-admin';

export const metadata: Metadata = {
  title: 'Missas | Cantólico',
  description: 'Organiza as tuas missas com cânticos para cada momento litúrgico',
};

const MASS_SELECT = `
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
` as const;

async function getMasses(userId: number, userEmail: string) {
  // Owned masses
  const { data: ownedMasses, error } = await supabase
    .from('Mass')
    .select(MASS_SELECT)
    .eq('userId', userId)
    .order('date', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Error fetching masses:', error);
    return [];
  }

  // Masses where the user is an accepted collaborator
  const { data: memberships } = await supabase
    .from('MassMember')
    .select('massId')
    .eq('userEmail', userEmail)
    .eq('status', 'ACCEPTED');

  const collaboratedIds = (memberships || [])
    .map(m => m.massId)
    .filter(id => !(ownedMasses || []).some(m => m.id === id));

  let collaboratedMasses: typeof ownedMasses = [];
  if (collaboratedIds.length > 0) {
    const { data } = await supabase
      .from('Mass')
      .select(MASS_SELECT)
      .in('id', collaboratedIds)
      .order('date', { ascending: false, nullsFirst: false });
    collaboratedMasses = data || [];
  }

  const allMasses = [...(ownedMasses || []), ...(collaboratedMasses || [])];

  return allMasses
    .map(mass => ({
      ...mass,
      user: (mass as any).User || null,
      _count: { items: ((mass as any).MassItem || []).length },
    }))
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
}

export default async function MassesPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/sign-in?redirect_url=/missas');
  }

  const masses = await getMasses(user.supabaseUserId, user.email);

  return <MassesPageClient initialMasses={masses as any} />;
}
