
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";
import { logGeneral, logErrors } from "@/lib/logs";
import { protectApiRoute, applySecurityHeaders } from "@/lib/api-protection";
import { formatTagsForPostgreSQL, parseTagsFromPostgreSQL, parseMomentsFromPostgreSQL } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Verifica se a requisição vem de uma origem autorizada
  const unauthorizedResponse = protectApiRoute(req);
  if (unauthorizedResponse) {
    await logGeneral('WARN', 'Tentativa de acesso não autorizado à API', 'Acesso negado por origem inválida', {
      action: 'unauthorized_api_access',
      origin: req.headers.get('origin'),
      referer: req.headers.get('referer'),
      endpoint: '/api/musics/[id]'
    });
    return unauthorizedResponse;
  }

  const resolvedParams = await params;
  const { id } = resolvedParams;

  try {
    await logGeneral('INFO', 'Consulta de música individual', 'Utilizador a consultar música específica', {
      musicId: id,
      action: 'fetch_single_music'
    });

    // Tentar encontrar por ID primeiro, depois por slug
    const { data: songs, error } = await supabase
      .from('Song')
      .select(`
        id,
        title,
        slug,
        moments,
        type,
        mainInstrument,
        tags,
        currentVersionId,
        createdAt,
        updatedAt,
        SongVersion!Song_currentVersionId_fkey (
          id,
          songId,
          versionNumber,
          sourceType,
          sourcePdfKey,
          sourceText,
          renderedHtml,
          keyOriginal,
          lyricsPlain,
          mediaUrl,
          youtubeLink,
          spotifyLink,
          createdAt,
          createdById,
          createdBy:User!SongVersion_createdById_fkey (
            name
          )
        )
      `)
      .or(`id.eq.${id},slug.eq.${id}`)
      .limit(1);

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!songs || songs.length === 0) {
      await logGeneral('WARN', 'Música não encontrada', 'Tentativa de acesso a música inexistente', {
        musicId: id,
        action: 'music_not_found'
      });
      const response = NextResponse.json({ error: "Música não encontrada" }, { status: 404 });
      return applySecurityHeaders(response, req);
    }

    const song = songs[0];

    // Reformatar dados para manter compatibilidade
    const formattedSong = {
      ...song,
      // Processar tags usando a função utilitária
      tags: parseTagsFromPostgreSQL(song.tags),
      // Processar moments usando a função utilitária
      moments: parseMomentsFromPostgreSQL(song.moments),
      currentVersion: song.SongVersion || null
    };

    await logGeneral('SUCCESS', 'Música carregada com sucesso', 'Dados da música enviados ao utilizador', {
      musicId: id,
      musicTitle: formattedSong.title,
      action: 'music_loaded'
    });

    const response = NextResponse.json(formattedSong);
    return applySecurityHeaders(response, req);
  } catch (error) {
    await logErrors('ERROR', 'Erro ao carregar música', 'Falha na consulta de música individual', {
      musicId: id,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'fetch_single_music_error'
    });
    console.error("[GET_MUSIC_BY_ID]", error);
    const response = NextResponse.json({ error: "Erro ao carregar música" }, { status: 500 });
    return applySecurityHeaders(response, req);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorizedResponse = protectApiRoute(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const resolvedParams = await params;
  const { id } = resolvedParams;

  try {
    const body = await req.json();
    // Processar tags usando a função utilitária
    const tags = formatTagsForPostgreSQL(body.tags);

    const { error } = await supabase
      .from('Song')
      .update({
        title: body.title,
        type: body.type,
        mainInstrument: body.mainInstrument,
        moments: body.moments,
        tags: tags,
        lyricsPlain: body.lyricsPlain,
        sourceText: body.sourceText,
        keyOriginal: body.keyOriginal,
        mediaUrl: body.mediaUrl,
        spotifyLink: body.spotifyLink,
        youtubeLink: body.youtubeLink
      })
      .eq('id', id);

    if (error) {
      await logErrors('ERROR', 'Erro ao atualizar música', 'Falha na atualização de música', {
        musicId: id,
        error: error.message,
        action: 'update_music_error'
      });
      return NextResponse.json({ error: 'Erro ao atualizar música' }, { status: 500 });
    }

    await logGeneral('SUCCESS', 'Música atualizada com sucesso', 'Dados da música atualizados', {
      musicId: id,
      musicTitle: body.title,
      action: 'music_updated'
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    await logErrors('ERROR', 'Erro ao atualizar música', 'Falha na atualização de música', {
      musicId: id,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'update_music_error'
    });
    return NextResponse.json({ error: 'Erro ao atualizar música' }, { status: 500 });
  }
}
