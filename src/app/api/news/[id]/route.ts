    import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    let query = supabase
      .from('News')
      .select('id, title, slug, summary, content, coverImageUrl, publishedAt')
      .eq('isPublished', true);

    query = isUuid ? query.eq('id', id) : query.eq('slug', id);

    const { data, error } = await query.limit(1);

    if (error || !data || data.length === 0) {
      return NextResponse.json({ error: 'Notícia não encontrada' }, { status: 404 });
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
