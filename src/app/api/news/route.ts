import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase-admin';

// In-memory cache with TTL (10 minutes for news)
let cachedNews: any = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '3', 10) || 3, 1), 12);
    
    const now = Date.now();
    
    // Return cached data if valid
    if (cachedNews && (now - cacheTime) < CACHE_TTL) {
      const slicedNews = cachedNews.slice(0, limit);
      const response = NextResponse.json(slicedNews);
      response.headers.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
      return response;
    }

    const { data, error } = await adminSupabase
      .from('News')
      .select('id,title,slug,summary,coverImageUrl,publishedAt')
      .eq('isPublished', true)
      .order('publishedAt', { ascending: false })
      .limit(12);

    if (error) {
      return NextResponse.json({ error: 'Erro ao carregar notícias' }, { status: 500 });
    }

    // Cache all news, client slices to requested limit
    cachedNews = data || [];
    cacheTime = now;
    
    const slicedNews = cachedNews.slice(0, limit);
    const response = NextResponse.json(slicedNews);
    response.headers.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
