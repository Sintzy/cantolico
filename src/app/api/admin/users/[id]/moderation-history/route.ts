import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id: userId } = await params;

    // Get moderation history for user
    const { data: history, error } = await supabase
      .from('ModerationHistory')
      .select(`
        id,
        status,
        type,
        reason,
        moderatorNote,
        moderatedAt,
        expiresAt,
        ipAddress,
        moderatedById
      `)
      .eq('userId', userId)
      .order('moderatedAt', { ascending: false });

    if (error) {
      console.error('Error fetching moderation history:', error);
      return NextResponse.json({ error: 'Erro ao carregar histórico' }, { status: 500 });
    }

    // Get moderator names for each entry
    const historyWithModerators = await Promise.all(
      (history || []).map(async (item: any) => {
        let moderatorInfo = null;
        if (item.moderatedById) {
          const { data: moderator } = await supabase
            .from('User')
            .select('name, email')
            .eq('id', item.moderatedById)
            .single();
          moderatorInfo = moderator;
        }

        return {
          ...item,
          moderatedBy: moderatorInfo
        };
      })
    );

    return NextResponse.json({
      history: historyWithModerators
    });

  } catch (error) {
    console.error('Error fetching moderation history:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
