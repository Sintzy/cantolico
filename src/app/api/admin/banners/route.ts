
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAdmin, logErrors } from '@/lib/logs';

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

    // Obter informações de IP e User-Agent para logs
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdmin('INFO', 'Criação de banner iniciada', 'Admin iniciou criação de novo banner', {
      adminId: session.user.id,
      adminEmail: session.user.email,
      bannerTitle: title,
      bannerType: type,
      bannerPosition: position,
      isActive,
      priority,
      ipAddress: ip,
      userAgent: userAgent,
      action: 'banner_create_attempt',
      entity: 'banner'
    });

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
        endDate,
        userId: session.user.id
      })
      .select()
      .single();
      
    if (error || !created) {
      await logErrors('ERROR', 'Erro ao criar banner', 'Erro na base de dados ao criar banner', {
        adminId: session.user.id,
        adminEmail: session.user.email,
        bannerTitle: title,
        error: error?.message,
        action: 'banner_create_error'
      });
      return NextResponse.json({ error: 'Erro ao criar banner' }, { status: 500 });
    }

    // Log de sucesso
    await logAdmin('SUCCESS', 'Banner criado com sucesso', 'Admin criou novo banner', {
      adminId: session.user.id,
      adminEmail: session.user.email,
      bannerId: created.id,
      bannerTitle: created.title,
      bannerType: created.type,
      bannerPosition: created.position,
      isActive: created.isActive,
      priority: created.priority,
      ipAddress: ip,
      userAgent: userAgent,
      action: 'banner_created',
      entity: 'banner'
    });

    return NextResponse.json(created);
  } catch (error) {
    console.error('Error creating banner:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
