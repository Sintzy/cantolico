import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';
import { z } from 'zod';

const UpdateSongSchema = z.object({
  songId: z.string(),
  action: z.enum(['approve', 'reject', 'delete']),
  reason: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const offset = (page - 1) * limit;

    // Buscar músicas com dados do autor
    let songsQuery = supabase
      .from('Song')
      .select(`
        id,
        title,
        artist,
        lyrics,
        chords,
        createdAt,
        updatedAt,
        authorId,
        author:User!Song_authorId_fkey(
          id,
          name,
          email,
          image
        )
      `)
      .range(offset, offset + limit - 1)
      .order('createdAt', { ascending: false });

    // Apply search filter
    if (search) {
      songsQuery = songsQuery.or(`title.ilike.%${search}%,artist.ilike.%${search}%`);
    }

    const { data: songs, error: songsError } = await songsQuery;

    if (songsError) {
      console.error('Error fetching songs:', songsError);
      return NextResponse.json({ error: 'Erro ao carregar músicas' }, { status: 500 });
    }

    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('Song')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting songs:', countError);
    }

    const totalPages = Math.ceil((totalCount || 0) / limit);

    return NextResponse.json({
      songs: songs || [],
      totalCount: totalCount || 0,
      totalPages,
      currentPage: page
    });

  } catch (error) {
    console.error('Error in admin songs API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const { songId } = body;

    if (!songId) {
      return NextResponse.json({ error: 'ID da música é obrigatório' }, { status: 400 });
    }

    // Delete song
    const { error } = await supabase
      .from('Song')
      .delete()
      .eq('id', songId);

    if (error) {
      console.error('Error deleting song:', error);
      return NextResponse.json({ error: 'Erro ao eliminar música' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting song:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
