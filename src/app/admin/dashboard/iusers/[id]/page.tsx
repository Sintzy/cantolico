import { adminSupabase } from '@/lib/supabase-admin';
import { notFound } from 'next/navigation';
import AdminUserPageClient from './AdminUserPageClient';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Verificação básica server-side
  const { data: user, error } = await adminSupabase
    .from('User')
    .select('id, name, email')
    .eq('id', id)
    .single();

  if (error || !user) {
    notFound();
  }

  return <AdminUserPageClient userId={id} />;
}
