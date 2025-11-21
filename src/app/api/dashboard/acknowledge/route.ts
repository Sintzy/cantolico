import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { adminSupabase as supabase } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user.id !== 0 && !session.user.id)) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se o usuário tem permissão
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userError || !user || (user.role !== 'ADMIN' && user.role !== 'REVIEWER')) {
      return NextResponse.json({ error: 'Sem permissões' }, { status: 403 });
    }

    const { type, alertIds } = await req.json();

    if (type === 'all') {
      // Reconhecer todos os alertas não reconhecidos
      const { data: updatedAlerts, error } = await supabase
        .from('logs')
        .update({ alert_status: 'ACKNOWLEDGED', acknowledged_by: session.user.id })
        .contains('tags', ['security'])
        .neq('alert_status', 'ACKNOWLEDGED')
        .select('id');

      if (error) {
        console.error('Erro ao atualizar alertas:', error);
        return NextResponse.json({ error: 'Erro ao atualizar alertas' }, { status: 500 });
      }

      console.log(`✅ ${user.role} acknowledged all alerts: ${updatedAlerts?.length || 0} alerts`);

      return NextResponse.json({ 
        success: true, 
        acknowledgedCount: updatedAlerts?.length || 0 
      });

    } else if (type === 'specific' && alertIds && Array.isArray(alertIds)) {
      // Reconhecer alertas específicos
      const { data: updatedAlerts, error } = await supabase
        .from('logs')
        .update({ alert_status: 'ACKNOWLEDGED', acknowledged_by: session.user.id })
        .in('id', alertIds)
        .contains('tags', ['security'])
        .neq('alert_status', 'ACKNOWLEDGED')
        .select('id');

      if (error) {
        console.error('Erro ao atualizar alertas específicos:', error);
        return NextResponse.json({ error: 'Erro ao atualizar alertas' }, { status: 500 });
      }

      console.log(`✅ ${user.role} acknowledged specific alerts: ${updatedAlerts?.length || 0} alerts`, alertIds);

      return NextResponse.json({ 
        success: true, 
        acknowledgedCount: updatedAlerts?.length || 0 
      });

    } else {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

  } catch (error) {
    console.error('Erro ao fazer acknowledge dos alertas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}