import { NextRequest, NextResponse } from 'next/server';
import { requireReviewer } from '@/lib/admin-auth';
import { adminSupabase } from '@/lib/supabase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError } = await requireReviewer();
    if (authError) return authError;

    const { id: userId } = await params;

    // Get moderation history for user
    const { data: history, error } = await adminSupabase
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

    // Bulk fetch moderator names to avoid N+1
    const moderatorIds = Array.from(new Set(
      (history || []).map((h: any) => h.moderatedById).filter(Boolean)
    ));
    
    const { data: moderators } = await adminSupabase
      .from('User')
      .select('id, name, email')
      .in('id', moderatorIds);

    const moderatorMap = new Map(moderators?.map((m: any) => [m.id, m]) || []);

    // Enrich history with moderator info
    const historyWithModerators = (history || []).map((item: any) => ({
      ...item,
      moderatedBy: item.moderatedById ? moderatorMap.get(item.moderatedById) || null : null
    }));

    return NextResponse.json({
      history: historyWithModerators
    });

  } catch (error) {
    console.error('Error fetching moderation history:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
