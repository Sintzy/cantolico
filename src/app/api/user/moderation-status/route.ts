import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data: userModeration } = await supabase
      .from('UserModeration')
      .select(`
        status,
        type,
        reason,
        moderatedAt,
        expiresAt,
        moderatorNote
      `)
      .eq('userId', session.user.id)
      .single();

    if (!userModeration) {
      return NextResponse.json({
        status: 'ACTIVE',
        type: null,
        reason: null,
        moderatedAt: null,
        expiresAt: null
      });
    }

    // Verificar se a suspensão expirou
    if (userModeration.status === 'SUSPENDED' && userModeration.expiresAt) {
      const now = new Date();
      if (userModeration.expiresAt <= now) {
        // Automaticamente reactivar o utilizador
        await supabase
          .from('UserModeration')
          .update({
            status: 'ACTIVE',
            type: null,
            reason: null,
            expiresAt: null,
            updatedAt: new Date().toISOString()
          })
          .eq('userId', session.user.id);

        // Remoção de log de reativação automática
        console.log(`♻️ Auto-reativated user ${session.user.id} after suspension expiry`);

        return NextResponse.json({
          status: 'ACTIVE',
          type: null,
          reason: null,
          moderatedAt: null,
          expiresAt: null
        });
      }
    }

    return NextResponse.json(userModeration);
  } catch (error) {
    console.error('Erro ao verificar status de moderação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
