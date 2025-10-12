import { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase-client'

export const revalidate = 3600; // Cache por 1 hora

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://cantolico.pt'

  // Static pages com prioridades MÁXIMAS para SEO agressivo
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0, // MÁXIMA prioridade para homepage
    },
    {
      url: `${baseUrl}/musics`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,  
      priority: 0.95, // QUASE máxima para página de cânticos
    },
    {
      url: `${baseUrl}/playlists`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/playlists/explore`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/musics/create`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(), 
      changeFrequency: 'yearly' as const,
      priority: 0.4,
    }
    // Removido login/register do sitemap - não precisam ser indexados
  ]

  try {
    // Get all published songs with optimized query
    const { data: songs, error } = await supabase
      .from('Song')
      .select('id, slug, title, updatedAt, createdAt')
      .order('createdAt', { ascending: false })
      .order('updatedAt', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar músicas para sitemap:', error);
      return staticPages;
    }

    console.log(`📄 Sitemap: ${songs?.length || 0} músicas encontradas`);

    // Dynamic music pages - PRIORIDADE MÁXIMA para SEO agressivo
    const musicPages = (songs || []).map((song: any, index: number) => {
      const url = `${baseUrl}/musics/${song.slug || song.id}`;
      const isRecent = (Date.now() - new Date(song.createdAt).getTime()) < (30 * 24 * 60 * 60 * 1000); // 30 dias
      const isVeryRecent = (Date.now() - new Date(song.createdAt).getTime()) < (7 * 24 * 60 * 60 * 1000); // 7 dias
      
      // PRIORIDADE AGRESSIVA - todas as músicas são importantes!
      let priority = Math.max(0.7, 0.9 - (index * 0.005)); // Decresce muito lentamente
      if (isVeryRecent) priority = Math.min(0.99, priority + 0.25); // Boost grande para novo conteúdo
      else if (isRecent) priority = Math.min(0.95, priority + 0.15);
      
      // Cânticos populares com prioridade extra (detectar por título)
      const title = song.title?.toLowerCase() || '';
      const isPopularCantico = [
        'deus está aqui', 'deus esta aqui', 'ave maria', 'santo', 'gloria', 
        'aleluia', 'cordeiro', 'salve rainha', 'anjos de deus'
      ].some(popular => title.includes(popular));
      
      if (isPopularCantico) priority = Math.min(0.99, priority + 0.1);
      
      return {
        url,
        lastModified: new Date(song.updatedAt),
        changeFrequency: isVeryRecent ? 'daily' as const : (isRecent ? 'weekly' as const : 'monthly' as const),
        priority: Math.round(priority * 100) / 100,
      };
    });

    const totalPages = staticPages.length + musicPages.length;
    console.log(`📄 Sitemap gerado: ${totalPages} páginas (${staticPages.length} estáticas + ${musicPages.length} músicas)`);
    console.log(`🔍 Google Discovery: Sitemap atualizado para descoberta orgânica`);

    return [...staticPages, ...musicPages];
    
  } catch (error) {
    console.error('❌ Erro ao gerar sitemap:', error);
    // Retorna pelo menos as páginas estáticas se houver erro
    return staticPages;
  }
}
