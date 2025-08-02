/**
 * Utilitários para sitemap e descoberta de conteúdo
 * 
 * NOTA: A partir de junho 2023, o Google descontinuou o ping automático
 * de sitemaps. O sistema agora foca em descoberta orgânica.
 * 
 * Referência: https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping
 */

/**
 * Força revalidação do sitemap no Next.js
 * Esta é a única parte que ainda funciona efetivamente
 */
export async function revalidateSitemap() {
  try {
    // Em produção, revalida o cache do sitemap
    if (process.env.NODE_ENV === 'production') {
      const response = await fetch('https://cantolico.pt/api/revalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          secret: process.env.REVALIDATE_SECRET,
          path: '/sitemap.xml' 
        }),
      });
      return response.ok;
    }
    return true;
  } catch (error) {
    console.error('❌ Erro ao revalidar sitemap:', error);
    return false;
  }
}

/**
 * Gera URLs de descoberta para melhorar indexação orgânica
 * Google encontra novos conteúdos através de:
 * 1. Links internos
 * 2. Sitemap atualizado  
 * 3. Descoberta via crawling regular
 */
export function generateDiscoveryUrls(songSlug: string, songTitle: string) {
  const baseUrl = 'https://cantolico.pt';
  
  return {
    // URL principal da música
    songUrl: `${baseUrl}/musics/${songSlug}`,
    
    // URLs que linkam para a música (para descoberta)
    discoveryUrls: [
      `${baseUrl}/musics`, // Lista principal
      `${baseUrl}/sitemap.xml`, // Sitemap atualizado
      `${baseUrl}`, // Homepage (se tiver widget de músicas recentes)
    ],
    
    // Dados estruturados que ajudam na descoberta
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'MusicComposition',
      'name': songTitle,
      'url': `${baseUrl}/musics/${songSlug}`,
    }
  };
}

/**
 * Estratégia moderna para descoberta de conteúdo (2023+)
 * Foca em métodos que realmente funcionam
 */
export async function modernContentDiscovery(songSlug: string, songTitle: string) {
  console.log(`� Iniciando descoberta moderna para "${songTitle}"...`);
  
  // 1. ✅ Revalidar sitemap (funciona)
  const revalidated = await revalidateSitemap();
  console.log(`📄 Sitemap revalidado: ${revalidated ? '✅' : '❌'}`);
  
  // 2. ✅ Gerar URLs de descoberta
  const discoveryData = generateDiscoveryUrls(songSlug, songTitle);
  console.log(`🔗 URLs de descoberta geradas para: ${discoveryData.songUrl}`);
  
  // 3. 📊 Log para monitorização
  console.log(`📈 Nova música disponível:`, {
    title: songTitle,
    url: discoveryData.songUrl,
    timestamp: new Date().toISOString(),
    method: 'organic_discovery'
  });
  
  return {
    revalidated,
    discoveryUrls: discoveryData.discoveryUrls,
    songUrl: discoveryData.songUrl,
    success: revalidated,
    method: 'modern_discovery_2023'
  };
}

/**
 * @deprecated O ping para motores de busca foi descontinuado pelo Google
 * Mantido apenas para referência histórica
 */
export async function legacySearchEnginePing() {
  console.warn('⚠️ AVISO: Ping para motores de busca foi descontinuado pelo Google (junho 2023)');
  console.warn('📖 Ver: https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping');
  return { success: false, reason: 'discontinued_by_google' };
}
