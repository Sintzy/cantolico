import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminSupabase as supabase } from "@/lib/supabase-admin";
import { randomUUID } from 'crypto';
import { logApiRequestError, logUnauthorizedAccess, logForbiddenAccess, toErrorContext } from '@/lib/logging-helpers';
import { sendEmail, createApprovalEmailTemplate } from '@/lib/email';
import { formatTagsForPostgreSQL, formatMomentsForPostgreSQL } from '@/lib/utils';

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
    
    // Try to parse as JSON first, fallback to FormData if needed
    let body;
    let title, author, markdown, spotifyLink, youtubeLink, instrument, moments, tags;
    
    try {
      const contentType = req.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        // Handle JSON payload
        body = await req.json();
        ({ title, author, markdown, spotifyLink, youtubeLink, instrument, moments = [], tags = [] } = body);
      } else {
        // Handle FormData payload
        const formData = await req.formData();
        title = formData.get('title') as string;
        author = formData.get('author') as string || null;
        markdown = formData.get('markdown') as string;
        spotifyLink = formData.get('spotifyLink') as string;
        youtubeLink = formData.get('youtubeLink') as string;
        instrument = formData.get('instrument') as string;
        moments = JSON.parse(formData.get('moments') as string || '[]');
        
        const tagsString = formData.get('tags') as string;
        tags = tagsString?.split(',').map((t: string) => t.trim()).filter(Boolean) || [];
      }
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }
    
    // Processar tags usando a função utilitária
    const processedTags = formatTagsForPostgreSQL(
      Array.isArray(tags) ? tags : 
      (typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [])
    );

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
      logUnauthorizedAccess({
        event_type: 'unauthorized_access',
        resource: `/api/admin/submission/${id}/approve`,
        user: { user_id: session.user.id, user_email: session.user.email || undefined, user_role: session.user.role },
        network: { ip_address: req.headers.get('x-forwarded-for') || 'unknown', user_agent: req.headers.get('user-agent') || undefined },
        details: {
          submissionId: id,
          action: 'approve_submission_not_found'
        }
      });
      return NextResponse.json({ error: 'Submissão não encontrada' }, { status: 404 });
    }

    if (submission.status !== 'PENDING') {
      logForbiddenAccess({
        event_type: 'forbidden_access',
        resource: `/api/admin/submission/${id}/approve`,
        user: { user_id: session.user.id, user_email: session.user.email || undefined, user_role: session.user.role },
  network: { ip_address: req.headers.get('x-forwarded-for') || 'unknown', user_agent: req.headers.get('user-agent') || undefined },
        details: {
          submissionId: id,
          submissionTitle: submission.title,
          currentStatus: submission.status,
          action: 'approve_submission_already_processed'
        }
      });
      return NextResponse.json({ error: 'Esta submissão já foi processada' }, { status: 400 });
    }

    // Remoção de log de início - apenas erros importantes

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
        author: author?.trim() || null,
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
      logApiRequestError({
        method: req.method,
        url: req.url,
        path: `/api/admin/submission/${id}/approve`,
        status_code: 500,
        error: toErrorContext(updateSubmissionError)
      });
      console.error('Error updating submission:', updateSubmissionError);
      return NextResponse.json({ error: 'Erro ao atualizar submissão' }, { status: 500 });
    }

    // Remoção de log de sucesso - apenas erros importantes

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
          subject: 'A tua música foi aprovada! - Cantólico',
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
