import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const userId = params.id;

    // Get moderation history for user
    const { data: history, error } = await supabase
      .from('UserModeration')
      .select(`
        id,
        status,
        type,
        reason,
        moderatorNote,
        moderatedAt,
        expiresAt,
        ipAddress,
        moderatedBy
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
        if (item.moderatedBy) {
          const { data: moderator } = await supabase
            .from('User')
            .select('name, email')
            .eq('id', item.moderatedBy)
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
