import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';

// ================================================
// API PARA ALERTAS DE SEGURANÇA - GET
// ================================================

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Apenas admins podem ver alertas de segurança
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    
    // Parâmetros de query
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status') || 'ACTIVE';
    const severity = searchParams.get('severity') || '';
    const alertType = searchParams.get('alertType') || '';
    
    const offset = (page - 1) * limit;

    // Construir query
    let query = supabase
      .from('security_alerts')
      .select(`
        *,
        logs (
          id,
          level,
          category,
          message,
          user_email,
          ip_address,
          created_at
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Aplicar filtros
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (severity && severity !== 'all') {
      query = query.eq('severity', parseInt(severity, 10));
    }

    if (alertType) {
      query = query.eq('alert_type', alertType);
    }

    const { data: alerts, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar alertas:', error);
      return NextResponse.json({ error: 'Erro ao buscar alertas' }, { status: 500 });
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      alerts: alerts || [],
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
    console.error('Erro na API de alertas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// ================================================
// POST - Criar novo alerta de segurança
// ================================================

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Apenas admins podem criar alertas
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const alertData = await req.json();

    // Validações
    if (!alertData.alertType || !alertData.title || !alertData.description) {
      return NextResponse.json(
        { error: 'alertType, title e description são obrigatórios' },
        { status: 400 }
      );
    }

    // Preparar dados do alerta
    const completeAlertData = {
      alert_type: alertData.alertType,
      severity: alertData.severity || 3,
      title: alertData.title,
      description: alertData.description,
      log_id: alertData.logId || null,
      email_recipients: alertData.emailRecipients || []
    };

    // Inserir alerta
    const { data, error } = await supabase
      .from('security_alerts')
      .insert([completeAlertData])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar alerta:', error);
      return NextResponse.json({ error: 'Erro ao criar alerta' }, { status: 500 });
    }

    // Alertas de segurança registrados apenas no sistema (sem emails automáticos)

    // Log da criação do alerta
    await supabase.from('logs').insert([{
      level: 'SECURITY',
      category: 'SECURITY',
      message: `Alerta de segurança criado: ${alertData.title}`,
      details: {
        alertType: alertData.alertType,
        severity: completeAlertData.severity,
        createdBy: session.user.email
      },
      user_id: session.user.id,
      user_email: session.user.email
    }]);

    return NextResponse.json({
      success: true,
      alert: data,
      message: 'Alerta de segurança criado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao criar alerta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}