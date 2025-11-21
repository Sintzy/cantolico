import React from 'react';
import { adminSupabase } from '@/lib/supabase-admin';
import AdminUserDetailClient from '../../../../../components/AdminUserDetailClient';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch basic user info server-side for initial render
  const { data: userData, error } = await adminSupabase.from('User').select('id,name,email,role,image,createdAt').eq('id', id).single();

  if (error || !userData) {
    return (
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold">Utilizador não encontrado</h1>
        <p>Não foi possível encontrar o utilizador com ID {id}.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Detalhes do Utilizador</h1>
      <AdminUserDetailClient userId={id} initialUser={userData} />
    </div>
  );
}
