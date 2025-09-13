import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { protectApiRoute, applySecurityHeaders } from '@/lib/api-protection';

type BannerPage = 'HOME' | 'MUSICS' | 'ADMIN' | 'ALL';

// GET - Buscar banners ativos para uma página específica
export async function GET(request: NextRequest) {
  // Verifica se a requisição vem de uma origem autorizada
  const unauthorizedResponse = protectApiRoute(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get('page') || 'ALL';
    
    // Validar se o parâmetro é um valor válido do enum
    const validPages: BannerPage[] = ['HOME', 'MUSICS', 'ADMIN', 'ALL'];
    const page = validPages.includes(pageParam as BannerPage) ? pageParam as BannerPage : 'ALL';
    
    const now = new Date();
    
    const { data: banners, error } = await supabase
      .from('Banner')
      .select(`
        id,
        title,
        message,
        type,
        position,
        priority
      `)
      .eq('isActive', true)
      .or(`pages.cs.{${page}}, pages.cs.{ALL}`)
      .or(`startDate.is.null, startDate.lte.${now.toISOString()}`)
      .or(`endDate.is.null, endDate.gte.${now.toISOString()}`)
      .order('priority', { ascending: false })
      .order('createdAt', { ascending: false });

    if (error) {
      throw error;
    }

    const response = NextResponse.json(banners || []);
    return applySecurityHeaders(response);
  } catch (error) {
    console.error('Erro ao buscar banners ativos:', error);
    const response = NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    return applySecurityHeaders(response);
  }
}
