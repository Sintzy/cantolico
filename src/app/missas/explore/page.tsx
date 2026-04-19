import { Metadata } from 'next';
import ExploreMassesClient from './page.client';
import { adminSupabase as supabase } from '@/lib/supabase-admin';

export const metadata: Metadata = {
  title: 'Explorar Missas | Cantólico',
  description: 'Descobre missas públicas organizadas pela comunidade',
};

async function getPublicMasses() {
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
    .eq('visibility', 'PUBLIC')
    .order('date', { ascending: false, nullsFirst: false })
    .limit(50);

  if (error) {
    console.error('Error fetching public masses:', error);
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

export default async function ExploreMassesPage() {
  const masses = await getPublicMasses();
  return <ExploreMassesClient initialMasses={masses as any} />;
}
