// lib/seo.ts - Sistema centralizado de SEO otimizado
import { Metadata } from 'next';

export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  image?: string;
  type?: 'website' | 'article' | 'music.song' | 'music.album';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
}

const SITE_CONFIG = {
  name: 'Cantólico',
  domain: 'cantolico.com',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://cantolico.com',
  description: 'A maior biblioteca de cânticos católicos online. Letras, acordes, cifras e partituras grátis para celebrações litúrgicas. Mais de 1000 músicas católicas.',
  keywords: [
    // Termos primários
    'canticos catolicos', 'cânticos católicos',
    'musicas catolicas', 'músicas católicas',
    'acordes catolicos', 'acordes católicos',
    'cifras catolicas', 'cifras católicas',
    'letras canticos', 'letras cânticos',
    'partituras catolicas', 'partituras católicas',
    
    // Termos específicos
    'cancioneiro catolico', 'cancioneiro católico',
    'hinario catolico', 'hinário católico',
    'cantolico', 'cantólico',
    'biblioteca canticos', 'acervo canticos',
    'repertorio catolico', 'repertório católico',
    
    // Momentos litúrgicos
    'canticos missa', 'cânticos missa',
    'musica liturgica', 'música litúrgica',
    'cantos entrada', 'cantos comunhao', 'cantos comunhão',
    'cantos ofertorio', 'cantos ofertório',
    'aleluia', 'santo', 'cordeiro de deus',
    
    // Termos populares
    'letra ave maria', 'acordes ave maria',
    'deus esta aqui', 'deus está aqui',
    'salve rainha letra', 'gloria a deus',
    'como grande é o meu amor',
    
    // SEO agressivo
    'site canticos gratis', 'melhor site canticos',
    'canticos online', 'cifras gratis',
    'acordes igreja', 'musicas igreja',
    'catolico online', 'igreja catolica musicas'
  ]
};

export function generateSEO(config: SEOConfig): Metadata {
  const {
    title,
    description,
    keywords = [],
    canonical,
    image,
    type = 'website',
    publishedTime,
    modifiedTime,
    author,
    section
  } = config;

  const fullTitle = title.includes(SITE_CONFIG.name) ? title : `${title} | ${SITE_CONFIG.name}`;
  const fullDescription = description || SITE_CONFIG.description;
  const allKeywords = [...SITE_CONFIG.keywords, ...keywords].join(', ');
  const canonicalUrl = canonical ? `${SITE_CONFIG.url}${canonical}` : undefined;
  const imageUrl = image ? `${SITE_CONFIG.url}${image}` : `${SITE_CONFIG.url}/cantolicoemail.png`;

  return {
    title: fullTitle,
    description: fullDescription,
    keywords: allKeywords,
    authors: author ? [{ name: author }] : [{ name: SITE_CONFIG.name }],
    creator: SITE_CONFIG.name,
    publisher: SITE_CONFIG.name,
    
    // Open Graph
    openGraph: {
      title: fullTitle,
      description: fullDescription,
      url: canonicalUrl,
      siteName: SITE_CONFIG.name,
      images: [{
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: fullTitle
      }],
      locale: 'pt_PT',
      type: type as any,
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(section && { section })
    },

    // Twitter
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: fullDescription,
      images: [imageUrl],
      creator: '@cantolico'
    },

    // Additional metadata
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },

    // Canonical URL
    ...(canonicalUrl && { 
      alternates: {
        canonical: canonicalUrl
      }
    }),

    // Additional tags
    other: {
      'application-name': SITE_CONFIG.name,
      'apple-mobile-web-app-title': SITE_CONFIG.name,
      'format-detection': 'telephone=no',
      'mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default'
    }
  };
}

// Funções específicas para diferentes tipos de página
export function generateHomeSEO(): Metadata {
  return generateSEO({
    title: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    canonical: '/',
    type: 'website'
  });
}

export function generateMusicSEO(music: {
  title: string;
  author?: string;
  moments?: string[];
  type?: string;
  slug: string;
  lyrics?: string;
}): Metadata {
  const moments = music.moments?.join(', ') || '';
  const typeText = music.type === 'ACORDES' ? 'com acordes' : 'partitura';
  
  // SEO super agressivo para aparecer no Google
  const lyricsPreview = music.lyrics ? ` Letra: "${music.lyrics.substring(0, 80)}..."` : '';
  const fullDescription = `${music.title} ${music.author ? `de ${music.author}` : ''} - Letra completa, acordes e cifras.${lyricsPreview} ${moments ? `Para ${moments.toLowerCase()}.` : ''} Partitura grátis no Cantólico - a maior biblioteca de cânticos católicos online.`;
  
  // Keywords ultra específicas
  const aggressiveKeywords = [
    // Nome da música - várias variações
    music.title.toLowerCase(),
    `${music.title.toLowerCase()} letra`,
    `${music.title.toLowerCase()} acordes`,
    `${music.title.toLowerCase()} cifra`,
    `${music.title.toLowerCase()} cantico`,
    `${music.title.toLowerCase()} catolico`,
    `letra de ${music.title.toLowerCase()}`,
    `acordes de ${music.title.toLowerCase()}`,
    `como tocar ${music.title.toLowerCase()}`,
    `partitura ${music.title.toLowerCase()}`,
    `${music.title.toLowerCase()} igreja`,
    `${music.title.toLowerCase()} missa`,
    
    // Autor
    ...(music.author ? [
      music.author.toLowerCase(),
      `${music.author.toLowerCase()} canticos`,
      `musicas ${music.author.toLowerCase()}`,
      `${music.title.toLowerCase()} ${music.author.toLowerCase()}`,
      `${music.author.toLowerCase()} ${music.title.toLowerCase()}`
    ] : []),
    
    // Momentos litúrgicos
    ...(music.moments?.flatMap(moment => [
      moment.toLowerCase().replace('_', ' '),
      `cantico ${moment.toLowerCase().replace('_', ' ')}`,
      `${music.title.toLowerCase()} ${moment.toLowerCase().replace('_', ' ')}`,
      `${moment.toLowerCase().replace('_', ' ')} ${music.title.toLowerCase()}`
    ]) || []),
    
    // Termos gerais estratégicos
    'música católica',
    'cantico catolico',
    'acordes igreja',
    'cifras catolicas',
    'letras canticos',
    'partituras gratis'
  ].filter(Boolean);
  
  return generateSEO({
    title: `${music.title} - Letra e Acordes | Cântico Católico`,
    description: fullDescription,
    keywords: [...new Set(aggressiveKeywords)],
    canonical: `/musics/${music.slug}`,
    type: 'music.song',
    author: music.author,
    section: 'Músicas'
  });
}

export function generatePlaylistSEO(playlist: {
  name: string;
  description?: string;
  id: string;
  songCount?: number;
}): Metadata {
  return generateSEO({
    title: `${playlist.name} - Playlist Católica`,
    description: playlist.description || `Playlist católica ${playlist.name} com ${playlist.songCount || 'várias'} músicas selecionadas. Repertório completo para celebrações.`,
    keywords: [
      playlist.name.toLowerCase(),
      'playlist católica',
      'repertório',
      'músicas selecionadas'
    ],
    canonical: `/playlists/${playlist.id}`,
    type: 'article',
    section: 'Playlists'
  });
}

export function generateSearchSEO(query?: string): Metadata {
  const title = query ? `Buscar "${query}"` : 'Buscar Músicas Católicas';
  const description = query 
    ? `Resultados da busca por "${query}" no maior acervo de músicas católicas online.`
    : 'Busque músicas católicas por título, autor, momento litúrgico ou letra. Mais de 1000 músicas disponíveis.';

  return generateSEO({
    title,
    description,
    keywords: query ? [query.toLowerCase(), 'buscar música católica'] : ['buscar', 'pesquisar', 'encontrar música católica'],
    canonical: query ? `/musics?search=${encodeURIComponent(query)}` : '/musics',
    type: 'website'
  });
}