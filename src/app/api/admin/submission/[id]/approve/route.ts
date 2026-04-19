import { NextRequest, NextResponse } from "next/server";
import { adminSupabase as supabase } from "@/lib/supabase-admin";
import { randomUUID } from 'crypto';
import { logApiRequestError, logUnauthorizedAccess, logForbiddenAccess, toErrorContext } from '@/lib/logging-helpers';
import { sendEmail, createApprovalEmailTemplate } from '@/lib/email';
import { formatTagsForPostgreSQL, formatMomentsForPostgreSQL } from '@/lib/utils';

import { getClerkSession } from '@/lib/api-middleware';
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getClerkSession();
    
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    
    // Try to parse as JSON first, fallback to FormData if needed
    let body;
    let title, author, markdown, spotifyLink, youtubeLink, instrument, moments, tags, fileDescriptions, capo;
    
    try {
      const contentType = req.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        // Handle JSON payload
        body = await req.json();
        ({ title, author, markdown, spotifyLink, youtubeLink, instrument, moments = [], tags = [], fileDescriptions = {}, capo = 0 } = body);
      } else {
        // Handle FormData payload
        const formData = await req.formData();
        title = formData.get('title') as string;
        author = formData.get('author') as string || null;
        markdown = formData.get('markdown') as string;
        spotifyLink = formData.get('spotifyLink') as string;
        youtubeLink = formData.get('youtubeLink') as string;
        instrument = formData.get('instrument') as string;
        capo = parseInt(formData.get('capo') as string || '0') || 0;
        moments = JSON.parse(formData.get('moments') as string || '[]');
        
        const tagsString = formData.get('tags') as string;
        tags = tagsString?.split(',').map((t: string) => t.trim()).filter(Boolean) || [];
        
        const fileDescriptionsString = formData.get('fileDescriptions') as string;
        fileDescriptions = fileDescriptionsString ? JSON.parse(fileDescriptionsString) : {};
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

    // Para ACORDES, a letra é obrigatória. Para PARTITURA, não precisa.
    if (submission.type === "ACORDES" && !markdown?.trim()) {
      return NextResponse.json({ error: 'Letra da música é obrigatória' }, { status: 400 });
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
        capo: capo > 0 ? capo : null,
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
    // Para ACORDES: criar com markdown
    // Para PARTITURA: criar versão vazia (será preenchida pelos ficheiros)
    const versionId = randomUUID();
    const sourceText = submission.type === "ACORDES" ? (markdown?.trim() || '') : '';
    const lyricsPlain = submission.type === "ACORDES" ? (markdown?.trim() || '') : '';
    const sourceTypeValue = submission.type === "ACORDES" ? 'MARKDOWN' : 'PDF';
    
    const { data: newVersion, error: versionError } = await supabase
      .from('SongVersion')
      .insert({
        id: versionId,
        songId: newSong.id,
        versionNumber: 1,
        sourceType: sourceTypeValue,
        sourceText: sourceText,
        lyricsPlain: lyricsPlain,
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

    // Copiar ficheiros da submissão para a música aprovada
    try {
  // Carregar metadados originais da submissão (.metadata.json)
  // Key = storage filename inside the submission folder (e.g. "<uuid>.pdf").
  // Value stores how it should appear publicly when approved.
  let originalMetadata: Record<string, { fileName?: string; fileType?: string; description?: string; isPrincipal?: boolean }> = {};
      const { data: metadataFile } = await supabase.storage
        .from('songs')
        .download(`songs/${id}/.metadata.json`);

      if (metadataFile) {
        try {
          const metadataText = await metadataFile.text();
          originalMetadata = JSON.parse(metadataText);
          console.log('📋 Metadados originais carregados:', Object.keys(originalMetadata).length, 'ficheiros');
        } catch (e) {
          console.warn('⚠️ Falha ao processar ficheiro de metadados:', e);
        }
      }

      // Listar ficheiros no storage da submissão
      const { data: submissionFiles, error: listError } = await supabase.storage
        .from('songs')
        .list(`songs/${id}`, {
          limit: 100,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (submissionFiles && submissionFiles.length > 0) {
        // Filtrar ficheiros válidos (ignorar .metadata.json e ficheiros ocultos)
        const validFiles = submissionFiles.filter(file => 
          !file.name.startsWith('.') && 
          !file.name.endsWith('.json') &&
          (file.name.toLowerCase().endsWith('.pdf') || 
           file.name.toLowerCase().endsWith('.mp3') || 
           file.name.toLowerCase().endsWith('.wav') || 
           file.name.toLowerCase().endsWith('.ogg') || 
           file.name.toLowerCase().endsWith('.m4a'))
        );
        
        console.log(`📁 Encontrados ${validFiles.length} ficheiros válidos para copiar da submissão ${id}`);

        for (const file of validFiles) {
          try {
            const sourcePath = `songs/${id}/${file.name}`;
            
            // Download do ficheiro
            const { data: fileData, error: downloadError } = await supabase.storage
              .from('songs')
              .download(sourcePath);

            if (downloadError || !fileData) {
              console.error(`❌ Erro ao fazer download de ${sourcePath}:`, downloadError);
              continue;
            }

            // Determinar tipo de ficheiro
            const ext = file.name.toLowerCase();
            let fileType: 'PDF' | 'AUDIO' = 'PDF';
            if (ext.endsWith('.mp3') || ext.endsWith('.wav') || ext.endsWith('.ogg') || ext.endsWith('.m4a')) {
              fileType = 'AUDIO';
            }

            // Upload para o path da música aprovada
            const newFileId = randomUUID();
            const destPath = `songs/${newSong.id}/${newFileId}_${file.name}`;
            
            const { error: uploadError } = await supabase.storage
              .from('songs')
              .upload(destPath, fileData, {
                contentType: fileType === 'PDF' ? 'application/pdf' : 'audio/mpeg',
                upsert: false,
                cacheControl: '3600'
              });

            if (uploadError) {
              console.error(`❌ Erro ao fazer upload de ${destPath}:`, uploadError);
              continue;
            }

            // Inserir registo na tabela SongFile com descrição
            // Primeiro, tenta usar fileDescriptions do frontend (edições manuais)
            // Se não existir, usa os metadados originais da submissão (.metadata.json)
            const frontendMetadata = fileDescriptions?.[file.name];
            const originalFileMetadata = originalMetadata?.[file.name];
            
            // Prioridade: frontend > metadados originais > nome do ficheiro
            const description = frontendMetadata?.description || originalFileMetadata?.description || file.name;
            const originalFileName = frontendMetadata?.fileName || originalFileMetadata?.fileName || file.name;
            const isPrincipal = Boolean(frontendMetadata?.isPrincipal ?? originalFileMetadata?.isPrincipal);
            
            console.log(`📝 Ficheiro ${file.name}: desc="${description}", fileName="${originalFileName}"`);
            
            const { error: dbError } = await supabase
              .from('SongFile')
              .insert({
                id: newFileId,
                songVersionId: newVersion.id,
                fileType: fileType,
                fileName: originalFileName,
                description: description,
                fileKey: destPath,
                fileSize: file.metadata?.size || 0,
                mimeType: fileType === 'PDF' ? 'application/pdf' : 'audio/mpeg',
                isPrincipal: isPrincipal,
                uploadedById: session.user.id
              });

            if (dbError) {
              console.error(`❌ Erro ao inserir registo de ficheiro ${file.name}:`, dbError);
              continue;
            }

            console.log(`✅ Ficheiro copiado: ${file.name} (${description})`);
          } catch (fileError) {
            console.error(`❌ Erro ao processar ficheiro ${file.name}:`, fileError);
          }
        }

        console.log(`✅ Processamento de ficheiros concluído para música ${newSong.id}`);
      }
    } catch (filesError) {
      console.error('❌ Erro ao processar ficheiros da submissão:', filesError);
      // Não falhar a operação se o processamento de ficheiros falhar
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
