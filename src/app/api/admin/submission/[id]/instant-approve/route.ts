import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminSupabase as supabase } from "@/lib/supabase-admin";
import { randomUUID } from 'crypto';
import { formatTagsForPostgreSQL } from '@/lib/utils';
import { logApiRequestError } from '@/lib/logging-helpers';

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

    // Buscar a submissão
    const { data: submission, error: fetchError } = await supabase
      .from('SongSubmission')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submissão não encontrada' }, { status: 404 });
    }

    if (submission.status !== 'PENDING') {
      return NextResponse.json({ error: 'Esta submissão já foi processada' }, { status: 400 });
    }

    // Validações básicas
    if (!submission.title?.trim()) {
      return NextResponse.json({ error: 'Título da submissão é obrigatório' }, { status: 400 });
    }

    if (!submission.tempText?.trim()) {
      return NextResponse.json({ error: 'Conteúdo da submissão é obrigatório' }, { status: 400 });
    }

    // Gerar slug único
    const baseSlug = submission.title.toLowerCase()
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

    // Criar nova música baseada na submissão
    const songId = randomUUID();
    const processedTags = formatTagsForPostgreSQL(submission.tags);

    console.log('Creating song with instant-approve:', {
      songId,
      title: submission.title,
      slug,
      type: submission.type,
      mainInstrument: submission.mainInstrument,
      moments: submission.moment,
      tags: submission.tags,
      processedTags
    });
      
    const { data: newSong, error: songError } = await supabase
      .from('Song')
      .insert({
        id: songId,
        title: submission.title,
        slug: slug,
        type: submission.type || 'ACORDES',
        mainInstrument: submission.mainInstrument || 'ORGAO',
        moments: submission.moment || [],
        tags: processedTags
      })
      .select('id, title, slug')
      .single();

    if (songError || !newSong) {
      console.error('Error creating song in instant-approve:', {
        error: songError,
        submission: {
          id: submission.id,
          title: submission.title,
          type: submission.type,
          mainInstrument: submission.mainInstrument,
          moments: submission.moment,
          tags: submission.tags
        }
      });
      return NextResponse.json({ 
        error: 'Erro ao criar música', 
        details: songError?.message || 'Erro desconhecido' 
      }, { status: 500 });
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
        sourceText: submission.tempText || '',
        lyricsPlain: submission.tempText || '',
        renderedHtml: '', // Será processado depois
        createdById: submission.submitterId,
        spotifyLink: submission.spotifyLink,
        youtubeLink: submission.youtubeLink
      })
      .select('id')
      .single();

    if (versionError || !newVersion) {
      console.error('Error creating version in instant-approve:', {
        error: versionError,
        versionData: {
          songId: newSong?.id,
          sourceText: submission.tempText?.substring(0, 100) + '...',
          createdById: submission.submitterId,
          spotifyLink: submission.spotifyLink,
          youtubeLink: submission.youtubeLink
        }
      });
      return NextResponse.json({ 
        error: 'Erro ao criar versão da música', 
        details: versionError?.message || 'Erro desconhecido' 
      }, { status: 500 });
    }

    // Atualizar a música com a versão atual
    const { error: updateSongError } = await supabase
      .from('Song')
      .update({ currentVersionId: newVersion.id })
      .eq('id', newSong.id);

    if (updateSongError) {
      console.error('Error updating song with current version:', updateSongError);
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
      console.error('Error updating submission:', updateSubmissionError);
      return NextResponse.json({ error: 'Erro ao atualizar submissão' }, { status: 500 });
    }

    // Remoção de log de sucesso - apenas erros importantes
    console.log('✅ Submissão aprovada instantaneamente:', {
      submissionId: id,
      songId: newSong.id,
      title: submission.title
    });

    return NextResponse.json({ 
      success: true, 
      songId: newSong.id,
      message: 'Submissão aprovada e música criada com sucesso' 
    });

  } catch (error) {
    console.error('Error in instant approve submission API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
