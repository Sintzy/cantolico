import { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase-client'

export const revalidate = 3600; // Cache por 1 hora

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://cantolico.pt'

  // Static pages com prioridades otimizadas
  // NOTA: Google ignora lastModified desde junho 2023, mas mantemos para outros crawlers
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/musics`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/musics/create`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
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

    // Dynamic music pages
    // Prioridade baseada em recência e popularidade potencial
    const musicPages = (songs || []).map((song: any, index: number) => {
      const url = `${baseUrl}/musics/${song.slug || song.id}`;
      const isRecent = (Date.now() - new Date(song.createdAt).getTime()) < (30 * 24 * 60 * 60 * 1000); // 30 dias
      const isVeryRecent = (Date.now() - new Date(song.createdAt).getTime()) < (7 * 24 * 60 * 60 * 1000); // 7 dias
      
      // Prioridade decrescente por posição, com boost para conteúdo recente
      let priority = Math.max(0.5, 0.9 - (index * 0.01)); // Decresce gradualmente
      if (isVeryRecent) priority = Math.min(0.95, priority + 0.2);
      else if (isRecent) priority = Math.min(0.9, priority + 0.1);
      
      return {
        url,
        lastModified: new Date(song.updatedAt), // Mantido para compatibilidade
        changeFrequency: isRecent ? 'weekly' as const : 'monthly' as const,
        priority: Math.round(priority * 100) / 100, // Arredonda para 2 casas
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
