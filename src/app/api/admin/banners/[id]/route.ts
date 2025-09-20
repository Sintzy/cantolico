import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAdmin, logErrors } from '@/lib/logs';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    const { id } = await context.params;
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

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    const { id } = await context.params;
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

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    
    const { id } = await context.params;

    // Obter informações de IP e User-Agent para logs
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Buscar banner antes de eliminar para logs
    const { data: banner, error: fetchError } = await supabase
      .from('Banner')
      .select('id, title, type, isActive')
      .eq('id', id)
      .single();

    if (fetchError || !banner) {
      await logAdmin('WARN', 'Tentativa de eliminar banner inexistente', 'Admin tentou eliminar banner que não existe', {
        adminId: session.user.id,
        adminEmail: session.user.email,
        bannerId: id,
        action: 'banner_delete_not_found'
      });
      return NextResponse.json({ error: 'Banner não encontrado' }, { status: 404 });
    }

    await logAdmin('INFO', 'Eliminação de banner iniciada', 'Admin iniciou eliminação de banner', {
      adminId: session.user.id,
      adminEmail: session.user.email,
      bannerId: banner.id,
      bannerTitle: banner.title,
      bannerType: banner.type,
      wasActive: banner.isActive,
      ipAddress: ip,
      userAgent: userAgent,
      action: 'banner_delete_attempt',
      entity: 'banner'
    });

    const { error: deleteError } = await supabase
      .from('Banner')
      .delete()
      .eq('id', id);

    if (deleteError) {
      await logErrors('ERROR', 'Erro ao eliminar banner', 'Erro na base de dados ao eliminar banner', {
        adminId: session.user.id,
        adminEmail: session.user.email,
        bannerId: banner.id,
        bannerTitle: banner.title,
        error: deleteError.message,
        action: 'banner_delete_error'
      });
      return NextResponse.json({ error: 'Erro ao eliminar banner' }, { status: 500 });
    }

    // Log de sucesso
    await logAdmin('SUCCESS', 'Banner eliminado com sucesso', 'Admin eliminou banner', {
      adminId: session.user.id,
      adminEmail: session.user.email,
      bannerId: banner.id,
      bannerTitle: banner.title,
      bannerType: banner.type,
      wasActive: banner.isActive,
      ipAddress: ip,
      userAgent: userAgent,
      action: 'banner_deleted',
      entity: 'banner'
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting banner:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
