import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    const { id } = params;
    const { data: banner, error } = await supabase
      .from('Banner')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !banner) {
      return NextResponse.json({ error: 'Banner não encontrado' }, { status: 404 });
    }
    return NextResponse.json(banner);
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    const { id } = params;
    const body = await request.json();
    const { title, message, type, position, priority, isActive, pages, startDate, endDate } = body;
    const { data: updated, error } = await supabase
      .from('Banner')
      .update({
        title,
        message,
        type,
        position,
        priority,
        isActive,
        pages,
        startDate,
        endDate
      })
      .eq('id', id)
      .select()
      .single();
    if (error || !updated) {
      return NextResponse.json({ error: 'Erro ao atualizar banner' }, { status: 500 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
