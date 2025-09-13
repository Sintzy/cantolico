import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: songId } = await params;

    // Buscar dados da música com a versão atual
    const { data: song, error } = await supabase
      .from('Song')
      .select(`
        id,
        title,
        slug,
        type,
        mainInstrument,
        moments,
        tags,
        createdAt,
        updatedAt,
        currentVersion:SongVersion!Song_currentVersionId_fkey (
          id,
          versionNumber,
          sourceType,
          sourceText,
          renderedHtml,
          keyOriginal,
          lyricsPlain,
          chordsJson,
          abcBlocks,
          mediaUrl,
          spotifyLink,
          youtubeLink,
          createdAt,
          author:User!SongVersion_createdById_fkey (
            id,
            name,
            email
          )
        )
      `)
      .eq('id', songId)
      .single();

    if (error || !song) {
      return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 });
    }

    return NextResponse.json(song);

  } catch (error) {
    console.error('Error in admin music GET API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: songId } = await params;
    const {
      title,
      type,
      mainInstrument,
      moments,
      tags,
      lyricsPlain,
      sourceText,
      keyOriginal,
      mediaUrl,
      spotifyLink,
      youtubeLink
    } = await req.json();

    // Validações
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 });
    }

    if (!moments || moments.length === 0) {
      return NextResponse.json({ error: 'Pelo menos um momento litúrgico é obrigatório' }, { status: 400 });
    }

    // Verificar se a música existe
    const { data: existingSong, error: fetchError } = await supabase
      .from('Song')
      .select('id, currentVersionId')
      .eq('id', songId)
      .single();

    if (fetchError || !existingSong) {
      return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 });
    }

    // Gerar slug único a partir do título
    const baseSlug = title.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .substring(0, 50);

    let slug = baseSlug;
    let counter = 1;

    // Verificar se o slug já existe (excluindo a música atual)
    while (true) {
      const { data: existingSlug } = await supabase
        .from('Song')
        .select('id')
        .eq('slug', slug)
        .neq('id', songId)
        .single();

      if (!existingSlug) break;
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Atualizar dados da música
    const { error: updateSongError } = await supabase
      .from('Song')
      .update({
        title: title.trim(),
        slug,
        type,
        mainInstrument,
        moments,
        tags: tags || [],
        updatedAt: new Date().toISOString()
      })
      .eq('id', songId);

    if (updateSongError) {
      throw new Error(`Erro ao atualizar música: ${updateSongError.message}`);
    }

    // Se tem versão atual, atualizar os dados da versão
    if (existingSong.currentVersionId) {
      const { error: updateVersionError } = await supabase
        .from('SongVersion')
        .update({
          sourceText: sourceText || '',
          lyricsPlain: lyricsPlain || '',
          keyOriginal: keyOriginal || null,
          mediaUrl: mediaUrl || null,
          spotifyLink: spotifyLink || null,
          youtubeLink: youtubeLink || null
        })
        .eq('id', existingSong.currentVersionId);

      if (updateVersionError) {
        throw new Error(`Erro ao atualizar versão: ${updateVersionError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Música atualizada com sucesso',
      songId,
      slug
    });

  } catch (error) {
    console.error('Error in admin music PUT API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
