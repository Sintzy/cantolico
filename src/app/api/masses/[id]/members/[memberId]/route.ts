import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase } from '@/lib/supabase-admin';
import { getClerkSession } from '@/lib/api-middleware';

interface RouteParams {
  params: Promise<{ id: string; memberId: string }>;
}

// DELETE - Remove member / cancel invite
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getClerkSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: massId, memberId } = await params;

  const { data: mass } = await supabase
    .from('Mass')
    .select('userId')
    .eq('id', massId)
    .single();

  if (!mass) {
    return NextResponse.json({ error: 'Missa não encontrada' }, { status: 404 });
  }

  const isOwnerOrAdmin = session.user.id === mass.userId || session.user.role === 'ADMIN';
  if (!isOwnerOrAdmin) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { data: member } = await supabase
    .from('MassMember')
    .select('id')
    .eq('id', memberId)
    .eq('massId', massId)
    .single();

  if (!member) {
    return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
  }

  const { error } = await supabase
    .from('MassMember')
    .delete()
    .eq('id', memberId)
    .eq('massId', massId);

  if (error) {
    return NextResponse.json({ error: 'Erro ao remover membro' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
