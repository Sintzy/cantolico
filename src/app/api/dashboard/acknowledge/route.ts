import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { logSystemEvent } from '@/lib/enhanced-logging';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
        .from('security_alerts')
        .update({
          status: 'ACKNOWLEDGED',
          acknowledged_by: session.user.id
        })
        .neq('status', 'ACKNOWLEDGED')
        .select('id');

      if (error) {
        console.error('Erro ao atualizar alertas:', error);
        return NextResponse.json({ error: 'Erro ao atualizar alertas' }, { status: 500 });
      }

      await logSystemEvent('acknowledge_all_alerts', `${user.role} reconheceu todos os alertas`, {
        userId: session.user.id,
        userRole: user.role,
        action: 'acknowledge_all_alerts',
        acknowledgedCount: updatedAlerts?.length || 0
      });

      return NextResponse.json({ 
        success: true, 
        acknowledgedCount: updatedAlerts?.length || 0 
      });

    } else if (type === 'specific' && alertIds && Array.isArray(alertIds)) {
      // Reconhecer alertas específicos
      const { data: updatedAlerts, error } = await supabase
        .from('security_alerts')
        .update({
          status: 'ACKNOWLEDGED',
          acknowledged_by: session.user.id
        })
        .in('id', alertIds)
        .neq('status', 'ACKNOWLEDGED')
        .select('id');

      if (error) {
        console.error('Erro ao atualizar alertas específicos:', error);
        return NextResponse.json({ error: 'Erro ao atualizar alertas' }, { status: 500 });
      }

      await logSystemEvent('acknowledge_specific_alerts', `${user.role} reconheceu alertas específicos`, {
        userId: session.user.id,
        userRole: user.role,
        action: 'acknowledge_specific_alerts',
        alertIds,
        acknowledgedCount: updatedAlerts?.length || 0
      });

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