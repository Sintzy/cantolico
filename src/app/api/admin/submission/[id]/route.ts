import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from "@/lib/supabase-client";
import { adminSupabase } from "@/lib/supabase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;

    // Buscar a submissão com dados do submissor (apenas campos necessários)
    const { data: submission, error } = await supabase
      .from('SongSubmission')
      .select(`
        id,
        title,
        author,
        tempText,
        spotifyLink,
        youtubeLink,
        mainInstrument,
        moment,
        tags,
        type,
        status,
        submitterId,
        createdAt,
        submitter:User!SongSubmission_submitterId_fkey (
          id,
          name,
          email,
          role
        )
      `)
      .eq('id', id)
      .single();

    if (error || !submission) {
      console.error('Error fetching submission:', error);
      return NextResponse.json({ error: 'Submissão não encontrada' }, { status: 404 });
    }

    // Buscar dados de moderação do submissor
    let moderationData = null;
    let moderationHistory: any[] = [];
    const submitter = submission.submitter as unknown as { id: string; name: string; email: string; role: string } | null;

    if (submitter?.id) {
      // Moderação atual
      const { data: currentModeration } = await supabase
        .from('UserModeration')
        .select(`
          id,
          status,
          type,
          reason,
          moderatorNote,
          moderatedAt,
          expiresAt,
          moderatedBy:User!UserModeration_moderatedBy_fkey (
            name
          )
        `)
        .eq('userId', submitter.id)
        .order('moderatedAt', { ascending: false })
        .limit(1)
        .single();

      moderationData = currentModeration;

      // Histórico de moderação
      const { data: history } = await supabase
        .from('UserModeration')
        .select(`
          id,
          status,
          type,
          reason,
          moderatorNote,
          moderatedAt,
          expiresAt,
          moderatedBy:User!UserModeration_moderatedBy_fkey (
            name
          )
        `)
        .eq('userId', submitter.id)
        .order('moderatedAt', { ascending: false });

      moderationHistory = history || [];
    }

    // Montar resposta com dados completos
    const response = {
      ...submission,
      submitter: {
        ...submitter,
        currentModeration: moderationData,
        moderationHistory: moderationHistory
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in submission API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
