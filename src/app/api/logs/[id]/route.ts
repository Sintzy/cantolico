import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';

// ================================================
// API PARA LOG ESPECÍFICO - GET
// ================================================

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    
    // Verificar autorização
    if (!session || !['ADMIN', 'REVIEWER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const logId = id;

    // Buscar log específico
    const { data: log, error } = await supabase
      .from('logs')
      .select('*')
      .eq('id', logId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Log não encontrado' }, { status: 404 });
      }
      console.error('Erro ao buscar log:', error);
      return NextResponse.json({ error: 'Erro ao buscar log' }, { status: 500 });
    }

    // Buscar logs relacionados (correlation_id)
    let relatedLogs: any[] = [];
    if (log.correlation_id) {
      const { data: related } = await supabase
        .from('logs')
        .select('id, level, category, message, created_at, user_email')
        .eq('correlation_id', log.correlation_id)
        .neq('id', logId)
        .order('created_at', { ascending: true })
        .limit(10);
      
      relatedLogs = related || [];
    }

    // Buscar alertas de segurança associados
    const { data: securityAlerts } = await supabase
      .from('security_alerts')
      .select('*')
      .eq('log_id', logId);

    // Log da visualização
    await supabase.from('logs').insert([{
      level: 'INFO',
      category: 'ADMIN',
      message: `Log visualizado: ${logId}`,
      details: {
        viewedLogLevel: log.level,
        viewedLogCategory: log.category,
        hasSecurityAlerts: (securityAlerts?.length || 0) > 0
      },
      user_id: session.user.id,
      user_email: session.user.email,
      correlation_id: log.correlation_id
    }]);

    return NextResponse.json({
      log,
      relatedLogs,
      securityAlerts: securityAlerts || []
    });

  } catch (error) {
    console.error('Erro na API de log específico:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// ================================================
// PATCH - Atualizar log (apenas para arquivar)
// ================================================

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    
    // Apenas admins podem atualizar logs
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const logId = id;
    const updates = await req.json();

    // Apenas permitir campos específicos para atualização
    const allowedFields = ['archived', 'tags'];
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {} as any);

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo válido para atualização' },
        { status: 400 }
      );
    }

    // Atualizar log
    const { data, error } = await supabase
      .from('logs')
      .update(filteredUpdates)
      .eq('id', logId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar log:', error);
      return NextResponse.json({ error: 'Erro ao atualizar log' }, { status: 500 });
    }

    // Log da atualização
    await supabase.from('logs').insert([{
      level: 'INFO',
      category: 'ADMIN',
      message: `Log atualizado: ${logId}`,
      details: {
        updates: filteredUpdates,
        updatedBy: session.user.email
      },
      user_id: session.user.id,
      user_email: session.user.email
    }]);

    return NextResponse.json({
      success: true,
      log: data,
      message: 'Log atualizado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar log:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}