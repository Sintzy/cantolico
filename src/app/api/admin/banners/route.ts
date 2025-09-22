
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAdmin, logErrors } from '@/lib/logs';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    // Buscar banners com dados do criador (usando createdById)
    const { data: banners, error } = await supabase
      .from('Banner')
      .select(`
        *,
        user:User!Banner_createdById_fkey(
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
    
    console.log('🔍 [BANNER API] Session:', { 
      hasSession: !!session, 
      userId: session?.user?.id, 
      userRole: session?.user?.role,
      userEmail: session?.user?.email 
    });
    
    if (!session || session.user.role !== 'ADMIN') {
      console.log('❌ [BANNER API] Acesso negado - sessão inválida ou não admin');
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    
    const body = await request.json();
    console.log('📝 [BANNER API] Body recebido:', body);
    
    const { title, message, type, position, priority, isActive, pages, startDate, endDate } = body;

    // Validação básica
    if (!title || !message || !type) {
      console.log('❌ [BANNER API] Dados obrigatórios em falta');
      return NextResponse.json({ error: 'Título, mensagem e tipo são obrigatórios' }, { status: 400 });
    }

    // Obter informações de IP e User-Agent para logs
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const bannerId = randomUUID();
    
    console.log('📊 [BANNER API] Dados para inserção:', {
      id: bannerId,
      title,
      message,
      type,
      position,
      priority,
      isActive,
      pages,
      startDate,
      endDate,
      createdById: session.user.id
    });

    await logAdmin('INFO', 'Criação de banner iniciada', 'Admin iniciou criação de novo banner', {
      adminId: session.user.id,
      adminEmail: session.user.email,
      bannerId,
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
        id: bannerId,
        title,
        message,
        type,
        position,
        priority,
        isActive,
        pages,
        startDate,
        endDate,
        createdById: session.user.id // Corrigido: era userId, agora é createdById
      })
      .select()
      .single();
      
    console.log('💾 [BANNER API] Resultado da inserção:', { created: !!created, error: error?.message });
      
    if (error || !created) {
      console.error('❌ [BANNER API] Erro na base de dados:', error);
      
      await logErrors('ERROR', 'Erro ao criar banner', 'Erro na base de dados ao criar banner', {
        adminId: session.user.id,
        adminEmail: session.user.email,
        bannerTitle: title,
        error: error?.message,
        action: 'banner_create_error'
      });
      return NextResponse.json({ error: 'Erro ao criar banner' }, { status: 500 });
    }

        console.log('✨ [BANNER API] Banner criado com sucesso:', {
      id: created.id,
      title: created.title,
      type: created.type,
      isActive: created.isActive
    });

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
    console.error('❌ [BANNER API] Erro crítico:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'Sem stack trace');
    
    // Tentar fazer log do erro se possível
    try {
      await logErrors('ERROR', 'Erro crítico na API de banners', 'Erro não capturado na criação de banner', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        action: 'banner_create_critical_error'
      });
    } catch (logError) {
      console.error('❌ [BANNER API] Erro ao fazer log:', logError);
    }
    
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
