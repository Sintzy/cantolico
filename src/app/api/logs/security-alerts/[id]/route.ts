import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';

// ================================================
// API PARA ALERTA DE SEGURANÇA INDIVIDUAL - GET/PATCH/DELETE
// ================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Apenas admins podem ver alertas de segurança
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id: alertId } = resolvedParams;

    if (!alertId) {
      return NextResponse.json({ error: 'ID do alerta é obrigatório' }, { status: 400 });
    }

    // Buscar o alerta específico
    const { data: alert, error } = await supabase
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
      `)
      .eq('id', alertId)
      .single();

    if (error || !alert) {
      return NextResponse.json({ error: 'Alerta não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      alert
    });

  } catch (error) {
    console.error('Erro ao buscar alerta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Apenas admins podem editar alertas de segurança
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id: alertId } = resolvedParams;
    const updates = await req.json();

    if (!alertId) {
      return NextResponse.json({ error: 'ID do alerta é obrigatório' }, { status: 400 });
    }

    // Verificar se o alerta existe
    const { data: existingAlert, error: fetchError } = await supabase
      .from('security_alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (fetchError || !existingAlert) {
      return NextResponse.json({ error: 'Alerta não encontrado' }, { status: 404 });
    }

    // Atualizar o alerta
    const { data, error } = await supabase
      .from('security_alerts')
      .update(updates)
      .eq('id', alertId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar alerta:', error);
      return NextResponse.json({ error: 'Erro ao atualizar alerta' }, { status: 500 });
    }

    // Log da ação de atualização
    await supabase.from('logs').insert([{
      level: 'INFO',
      category: 'SECURITY',
      message: `Alerta de segurança atualizado`,
      details: {
        alertId,
        updatedBy: session.user.email,
        updates
      },
      user_id: session.user.id,
      user_email: session.user.email
    }]);

    return NextResponse.json({
      success: true,
      alert: data,
      message: 'Alerta atualizado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar alerta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Apenas admins podem eliminar alertas de segurança
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id: alertId } = resolvedParams;

    if (!alertId) {
      return NextResponse.json({ error: 'ID do alerta é obrigatório' }, { status: 400 });
    }

    // Verificar se o alerta existe
    const { data: existingAlert, error: fetchError } = await supabase
      .from('security_alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (fetchError || !existingAlert) {
      return NextResponse.json({ error: 'Alerta não encontrado' }, { status: 404 });
    }

    // Eliminar o alerta
    const { error } = await supabase
      .from('security_alerts')
      .delete()
      .eq('id', alertId);

    if (error) {
      console.error('Erro ao eliminar alerta:', error);
      return NextResponse.json({ error: 'Erro ao eliminar alerta' }, { status: 500 });
    }

    // Log da ação de eliminação
    await supabase.from('logs').insert([{
      level: 'INFO',
      category: 'SECURITY',
      message: `Alerta de segurança eliminado`,
      details: {
        alertId,
        deletedBy: session.user.email,
        alertData: existingAlert
      },
      user_id: session.user.id,
      user_email: session.user.email
    }]);

    return NextResponse.json({
      success: true,
      message: 'Alerta eliminado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao eliminar alerta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}