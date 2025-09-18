
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    // Buscar banners com dados do criador (usando userId)
    const { data: banners, error } = await supabase
      .from('Banner')
      .select(`
        *,
        user:User!Banner_userId_fkey(
          id,
          name,
          email,
          image
        )
      `)
      .order('priority', { ascending: false })
      .order('createdAt', { ascending: false });
    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar banners' }, { status: 500 });
    }
    return NextResponse.json(banners || []);
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    const body = await request.json();
    const { title, message, type, position, priority, isActive, pages, startDate, endDate } = body;
    const { data: created, error } = await supabase
      .from('Banner')
      .insert({
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
      .select()
      .single();
    if (error || !created) {
      return NextResponse.json({ error: 'Erro ao criar banner' }, { status: 500 });
    }
    return NextResponse.json(created);
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
