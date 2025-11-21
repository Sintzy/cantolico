import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';

// ================================================
// API PRINCIPAL DE LOGS - GET (Listar logs)
// ================================================

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Verificar se é admin ou reviewer
    if (!session || !['ADMIN', 'REVIEWER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    
    // Parâmetros de query
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search') || '';
    const level = searchParams.get('level') || '';
    const category = searchParams.get('category') || '';
    const userId = searchParams.get('userId') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const ip = searchParams.get('ip') || '';
    const correlationId = searchParams.get('correlationId') || '';
    
    const offset = (page - 1) * limit;

    // Construir query
    let query = supabase
      .from('logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Aplicar filtros
    if (search) {
      query = query.or(`message.ilike.%${search}%,user_email.ilike.%${search}%,url.ilike.%${search}%`);
    }

    if (level && level !== 'all') {
      query = query.eq('level', level);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (ip) {
      query = query.eq('ip_address', ip);
    }

    if (correlationId) {
      query = query.eq('correlation_id', correlationId);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar logs:', error);
      return NextResponse.json({ error: 'Erro ao buscar logs' }, { status: 500 });
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      logs: logs || [],
      pagination: {
        currentPage: page,
        totalPages,
        totalCount: count || 0,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        limit
      }
    });

  } catch (error) {
    console.error('Erro na API de logs:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// ================================================
// POST - Criar novo log (sistema)
// ================================================

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const logData = await req.json();

    // Validações básicas
    if (!logData.level || !logData.category || !logData.message) {
      return NextResponse.json(
        { error: 'level, category e message são obrigatórios' },
        { status: 400 }
      );
    }

    // Obter informações do request
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const clientIp = forwarded?.split(',')[0] || realIp || 'unknown';
    const userAgent = req.headers.get('user-agent') || '';

    // Preparar dados completos do log
    const completeLogData = {
      level: logData.level,
      category: logData.category,
      status: logData.status || 'SUCCESS',
      message: logData.message,
      details: logData.details || {},
      stack_trace: logData.stackTrace || null,
      
      // Informações do utilizador
      user_id: session?.user?.id || logData.userId || null,
      user_email: session?.user?.email || logData.userEmail || null,
      user_role: session?.user?.role || logData.userRole || null,
      
      // Informações da requisição
      session_id: logData.sessionId || null,
      ip_address: clientIp,
      user_agent: userAgent,
      url: logData.url || null,
      method: logData.method || null,
      status_code: logData.statusCode || null,
      response_time_ms: logData.responseTimeMs || null,
      
      // Informações técnicas
      server_instance: logData.serverInstance || 'cantolico-main',
      environment: logData.environment || process.env.NODE_ENV || 'production',
      version: logData.version || process.env.APP_VERSION || '1.0.0',
      
      // Metadados
      tags: logData.tags || [],
      correlation_id: logData.correlationId || null,
      parent_log_id: logData.parentLogId || null
    };

    // Inserir log
    const { data, error } = await supabase
      .from('logs')
      .insert([completeLogData])
      .select()
      .single();

    if (error) {
      console.error('Erro ao inserir log:', error);
      return NextResponse.json({ error: 'Erro ao criar log' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      logId: data.id,
      message: 'Log criado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao criar log:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// ================================================
// DELETE - Apagar logs antigos (apenas admins)
// ================================================

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Apenas admins podem apagar logs
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const olderThan = searchParams.get('olderThan'); // Data ISO
    const level = searchParams.get('level'); // Nível específico
    const dryRun = searchParams.get('dryRun') === 'true'; // Apenas contar

    if (!olderThan) {
      return NextResponse.json(
        { error: 'Parâmetro olderThan é obrigatório' },
        { status: 400 }
      );
    }

    // Construir query de deleção
    let query = supabase
      .from('logs')
      .delete()
      .lt('created_at', olderThan);

    // Não apagar logs críticos e de segurança por padrão
    if (!level) {
      query = query.not('level', 'in', '(CRITICAL,SECURITY)');
    } else {
      query = query.eq('level', level);
    }

    // Se for dry run, apenas contar
    if (dryRun) {
      const countQuery = supabase
        .from('logs')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', olderThan);
      
      if (!level) {
        countQuery.not('level', 'in', '(CRITICAL,SECURITY)');
      } else {
        countQuery.eq('level', level);
      }

      const { count, error } = await countQuery;
      
      if (error) {
        return NextResponse.json({ error: 'Erro ao contar logs' }, { status: 500 });
      }

      return NextResponse.json({
        dryRun: true,
        logsToDelete: count || 0,
        criteria: { olderThan, level: level || 'all except CRITICAL/SECURITY' }
      });
    }

    // Executar deleção
    const { data, error, count } = await query.select();

    if (error) {
      console.error('Erro ao apagar logs:', error);
      return NextResponse.json({ error: 'Erro ao apagar logs' }, { status: 500 });
    }

    // Log da operação de limpeza
    await supabase.from('logs').insert([{
      level: 'INFO',
      category: 'ADMIN',
      message: `Limpeza de logs executada`,
      details: {
        deletedCount: count,
        criteria: { olderThan, level },
        executedBy: session.user.email
      },
      user_id: session.user.id,
      user_email: session.user.email || undefined
    }]);

    return NextResponse.json({
      success: true,
      deletedCount: count || 0,
      message: `${count || 0} logs apagados com sucesso`
    });

  } catch (error) {
    console.error('Erro ao apagar logs:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}