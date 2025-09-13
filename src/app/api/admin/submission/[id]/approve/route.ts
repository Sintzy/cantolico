import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from "@/lib/supabase-client";
import { randomUUID } from 'crypto';

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
    const tags = (tagsString || '')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .map(t => t.toLowerCase())
      .map(t => t.replace(/['"]/g, '')); // Remove aspas que podem causar problemas

    console.log('Tags processing:', {
      original: tagsString,
      processed: tags
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
        tags: tags
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
