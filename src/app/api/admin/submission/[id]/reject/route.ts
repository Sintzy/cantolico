import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from "@/lib/supabase-client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const { rejectionReason } = await req.json();

    if (!rejectionReason?.trim()) {
      return NextResponse.json({ error: 'Motivo da rejeição é obrigatório' }, { status: 400 });
    }

    // Buscar a submissão
    const { data: submission, error: fetchError } = await supabase
      .from('SongSubmission')
      .select('id, submitterId, status')
      .eq('id', id)
      .single();

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submissão não encontrada' }, { status: 404 });
    }

    if (submission.status !== 'PENDING') {
      return NextResponse.json({ error: 'Esta submissão já foi processada' }, { status: 400 });
    }

    // Atualizar status da submissão
    const { error: updateError } = await supabase
      .from('SongSubmission')
      .update({
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
        reviewedAt: new Date().toISOString(),
        reviewerId: session.user.id
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error rejecting submission:', updateError);
      return NextResponse.json({ error: 'Erro ao rejeitar submissão' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in reject submission API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
