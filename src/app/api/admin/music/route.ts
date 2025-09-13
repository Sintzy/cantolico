import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    
    const offset = (page - 1) * limit;

    // Construir query base
    let query = supabase
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
          createdById,
          createdAt,
          lyricsPlain,
          author:User!SongVersion_createdById_fkey (
            id,
            name,
            email
          )
        )
      `, { count: 'exact' })
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    // Aplicar filtros
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    if (type && type !== '') {
      query = query.eq('type', type);
    }

    const { data: songs, error, count } = await query;

    if (error) {
      console.error('Error fetching songs:', error);
      return NextResponse.json({ error: 'Erro ao buscar músicas' }, { status: 500 });
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      songs: songs || [],
      pagination: {
        currentPage: page,
        totalPages,
        totalCount: count || 0,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error in admin music API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { songId } = await req.json();
    if (!songId) {
      return NextResponse.json({ error: 'ID da música não fornecido' }, { status: 400 });
    }

    // Apagar todas as versões da música
    const { error: versionError, count: versionsDeleted } = await supabase
      .from('SongVersion')
      .delete({ count: 'exact' })
      .eq('songId', songId);

    if (versionError) {
      throw new Error(`Erro ao apagar versões: ${versionError.message}`);
    }

    // Apagar favoritos relacionados
    const { error: favoriteError, count: favoritesDeleted } = await supabase
      .from('Favorite')
      .delete({ count: 'exact' })
      .eq('songId', songId);

    if (favoriteError) {
      throw new Error(`Erro ao apagar favoritos: ${favoriteError.message}`);
    }

    // Apagar estrelas relacionadas
    const { error: starError } = await supabase
      .from('Star')
      .delete()
      .eq('songId', songId);

    if (starError) {
      throw new Error(`Erro ao apagar estrelas: ${starError.message}`);
    }

    // Apagar playlist items relacionados
    const { error: playlistItemError } = await supabase
      .from('PlaylistItem')
      .delete()
      .eq('songId', songId);

    if (playlistItemError) {
      throw new Error(`Erro ao apagar playlist items: ${playlistItemError.message}`);
    }

    // Por fim, apagar a música
    const { error: songError } = await supabase
      .from('Song')
      .delete()
      .eq('id', songId);

    if (songError) {
      throw new Error(`Erro ao apagar música: ${songError.message}`);
    }

    return NextResponse.json({
      success: true,
      details: {
        versionsDeleted: versionsDeleted || 0,
        favoritesDeleted: favoritesDeleted || 0,
      },
    });
  } catch (error) {
    console.error('Erro ao eliminar música:', error);
    return NextResponse.json({ error: 'Erro interno ao eliminar música' }, { status: 500 });
  }
}
