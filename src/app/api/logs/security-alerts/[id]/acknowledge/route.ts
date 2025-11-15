import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';

// ================================================
// API PARA RECONHECER ALERTAS DE SEGURANÇA - PATCH
// ================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Apenas admins podem reconhecer alertas de segurança
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id: alertId } = resolvedParams;

    if (!alertId) {
      return NextResponse.json({ error: 'ID do alerta é obrigatório' }, { status: 400 });
    }

    // Verificar se o alerta existe como um log marcado com tag 'security'
    const { data: existingAlert, error: fetchError } = await supabase
      .from('logs')
      .select('id, details')
      .contains('tags', ['security'])
      .eq('id', alertId)
      .single();

    if (fetchError || !existingAlert) {
      return NextResponse.json({ error: 'Alerta não encontrado' }, { status: 404 });
    }

    // Atualizar o status do alerta para ACKNOWLEDGED no próprio log
    const { data, error } = await supabase
      .from('logs')
      .update({
        details: {
          ...(existingAlert.details || {}),
          alert_status: 'ACKNOWLEDGED',
          acknowledged_by: session.user.id,
          acknowledged_at: new Date().toISOString()
        }
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao reconhecer alerta:', error);
      return NextResponse.json({ error: 'Erro ao reconhecer alerta' }, { status: 500 });
    }

    // Log da ação de reconhecimento
    await supabase.from('logs').insert([{
      level: 'INFO',
      category: 'SECURITY',
      message: `Alerta de segurança reconhecido`,
      details: {
        alertId,
        acknowledgedBy: session.user.email,
        previousStatus: existingAlert.details?.alert_status || null
      },
      user_id: session.user.id,
      user_email: session.user.email
    }]);

    return NextResponse.json({
      success: true,
      alert: data,
      message: 'Alerta reconhecido com sucesso'
    });

  } catch (error) {
    console.error('Erro ao reconhecer alerta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}