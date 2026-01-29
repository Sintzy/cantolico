import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '3', 10) || 3, 1), 12);

    const { data, error } = await supabase
      .from('News')
      .select('id, title, slug, summary, coverImageUrl, publishedAt')
      .eq('isPublished', true)
      .order('publishedAt', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: 'Erro ao carregar notícias' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
