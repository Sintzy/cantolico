import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from "@/lib/supabase-client";
import { randomUUID } from 'crypto';
import { logAdmin, logErrors } from '@/lib/logs';
import { sendEmail, createApprovalEmailTemplate } from '@/lib/email';

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
    const formData = await req.formData();

    const title = formData.get('title') as string;
    const markdown = formData.get('markdown') as string;
    const spotifyLink = formData.get('spotifyLink') as string;
    const youtubeLink = formData.get('youtubeLink') as string;
    const instrument = formData.get('instrument') as string;
    const moments = JSON.parse(formData.get('moments') as string || '[]');
    
    const tagsString = formData.get('tags') as string;
    // Processar tags mantendo o formato PostgreSQL {tag1,tag2}
    let processedTags = tagsString || '{}';
    
    // Se não tem chaves, adicionar
    if (!processedTags.startsWith('{')) {
      const tagArray = processedTags
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean)
        .map((t: string) => t.toLowerCase())
        .map((t: string) => t.replace(/['/"]/g, ''));
      processedTags = `{${tagArray.join(',')}}`;
    }

    console.log('Tags processing:', {
      original: tagsString,
      processed: processedTags
    });

    // Validações
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 });
    }

    if (!markdown?.trim()) {
      return NextResponse.json({ error: 'Letra da música é obrigatória' }, { status: 400 });
    }

    if (!instrument) {
      return NextResponse.json({ error: 'Instrumento principal é obrigatório' }, { status: 400 });
    }

    if (!Array.isArray(moments) || moments.length === 0) {
      return NextResponse.json({ error: 'Pelo menos um momento litúrgico deve ser selecionado' }, { status: 400 });
    }

    // Buscar a submissão com dados do utilizador
    const { data: submission, error: fetchError } = await supabase
      .from('SongSubmission')
      .select(`
        *,
        submitter:User!submitterId(
          id,
          name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !submission) {
      await logAdmin('WARN', 'Tentativa de aprovação de submissão inexistente', 'Admin tentou aprovar submissão que não existe', {
        adminId: session.user.id,
        adminEmail: session.user.email,
        submissionId: id,
        action: 'approve_submission_not_found'
      });
      return NextResponse.json({ error: 'Submissão não encontrada' }, { status: 404 });
    }

    if (submission.status !== 'PENDING') {
      await logAdmin('WARN', 'Tentativa de aprovação de submissão já processada', 'Admin tentou aprovar submissão que já foi processada', {
        adminId: session.user.id,
        adminEmail: session.user.email,
        submissionId: id,
        submissionTitle: submission.title,
        currentStatus: submission.status,
        action: 'approve_submission_already_processed'
      });
      return NextResponse.json({ error: 'Esta submissão já foi processada' }, { status: 400 });
    }

    // Log do início da aprovação
    await logAdmin('INFO', 'Aprovação de submissão iniciada', 'Admin iniciou processo de aprovação de submissão', {
      adminId: session.user.id,
      adminEmail: session.user.email,
      submissionId: id,
      submissionTitle: submission.title,
      submitterId: submission.submitterId,
      action: 'approve_submission_started',
      entity: 'song_submission'
    });

    // Gerar slug único
    const baseSlug = title.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .substring(0, 50);

    let slug = baseSlug;
    let counter = 1;

    // Verificar se o slug já existe
    while (true) {
      const { data: existingSong } = await supabase
        .from('Song')
        .select('id')
        .eq('slug', slug)
        .single();

      if (!existingSong) break;
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Criar nova música
    const songId = randomUUID();
    const { data: newSong, error: songError } = await supabase
      .from('Song')
      .insert({
        id: songId,
        title: title.trim(),
        slug: slug,
        type: submission.type || 'ACORDES',
        mainInstrument: instrument,
        moments: moments,
        tags: processedTags
      })
      .select('id, title, slug')
      .single();

    if (songError || !newSong) {
      console.error('Error creating song:', songError);
      return NextResponse.json({ error: 'Erro ao criar música' }, { status: 500 });
    }

    // Criar versão da música
    const versionId = randomUUID();
    const { data: newVersion, error: versionError } = await supabase
      .from('SongVersion')
      .insert({
        id: versionId,
        songId: newSong.id,
        versionNumber: 1,
        sourceType: 'MARKDOWN',
        sourceText: markdown.trim(),
        lyricsPlain: markdown.trim(),
        renderedHtml: '', // Será processado depois se necessário
        createdById: submission.submitterId,
        spotifyLink: spotifyLink?.trim() || null,
        youtubeLink: youtubeLink?.trim() || null
      })
      .select('id')
      .single();

    if (versionError || !newVersion) {
      console.error('Error creating version:', versionError);
      return NextResponse.json({ error: 'Erro ao criar versão da música' }, { status: 500 });
    }

    // Atualizar a música com a versão atual
    const { error: updateSongError } = await supabase
      .from('Song')
      .update({ 
        currentVersionId: newVersion.id
      })
      .eq('id', newSong.id);

    if (updateSongError) {
      console.error('Error updating song with current version:', updateSongError);
      return NextResponse.json({ error: 'Erro ao atualizar música com versão atual' }, { status: 500 });
    }

    // Atualizar status da submissão
    const { error: updateSubmissionError } = await supabase
      .from('SongSubmission')
      .update({
        status: 'APPROVED',
        reviewedAt: new Date().toISOString(),
        reviewerId: session.user.id
      })
      .eq('id', id);

    if (updateSubmissionError) {
      await logErrors('ERROR', 'Erro ao atualizar status da submissão aprovada', 'Erro na base de dados ao marcar submissão como aprovada', {
        adminId: session.user.id,
        adminEmail: session.user.email,
        submissionId: id,
        submissionTitle: submission.title,
        error: updateSubmissionError.message,
        action: 'approve_submission_update_error'
      });
      console.error('Error updating submission:', updateSubmissionError);
      return NextResponse.json({ error: 'Erro ao atualizar submissão' }, { status: 500 });
    }

    // Log de sucesso da aprovação
    await logAdmin('SUCCESS', 'Submissão aprovada com sucesso', 'Admin aprovou submissão e música foi criada', {
      adminId: session.user.id,
      adminEmail: session.user.email,
      submissionId: id,
      submissionTitle: submission.title,
      submitterId: submission.submitterId,
      newSongId: newSong.id,
      newSongSlug: newSong.slug,
      newSongTitle: title,
      instrument: instrument,
      momentsCount: moments.length,
      hasSpotifyLink: !!spotifyLink,
      hasYoutubeLink: !!youtubeLink,
      action: 'submission_approved',
      entity: 'song_submission'
    });

    // Enviar email de aprovação para o utilizador
    if (submission.submitter && Array.isArray(submission.submitter) && submission.submitter[0]?.email) {
      try {
        const user = submission.submitter[0];
        const emailTemplate = createApprovalEmailTemplate(
          user.name || 'Utilizador',
          title,
          newSong.id,
          session.user.name || 'Equipa de Revisão'
        );
        
        await sendEmail({
          to: user.email,
          subject: '🎉 A tua música foi aprovada! - Cantólico',
          html: emailTemplate
        });

        console.log('✅ Email de aprovação enviado para:', user.email);
      } catch (emailError) {
        console.error('❌ Erro ao enviar email de aprovação:', emailError);
        // Não falhar a operação se o email falhar
      }
    }

    return NextResponse.json({ 
      success: true, 
      songId: newSong.id,
      slug: newSong.slug,
      message: 'Submissão aprovada e música criada com sucesso' 
    });

  } catch (error) {
    console.error('Error in approve submission API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
