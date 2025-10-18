/**
 * Configuração SEO para optimização de resultados de pesquisa
 * Foco em cânticos católicos e música litúrgica
 */

// Cânticos populares na liturgia católica
export const POPULAR_CANTICOS = [
  // Cânticos fundamentais
  "Deus está aqui", "Deus esta aqui", "Ave Maria", "Santo", "Gloria a Deus", 
  "Aleluia", "Cordeiro de Deus", "Salve Rainha", "Anjos de Deus", "Como é Grande",
  "Eu Navegarei", "Rude Cruz", "Quão Grande és Tu", "Amazing Grace", 
  "Pão da Vida", "Jesus Cristo", "Espírito Santo", "Maria Mãe", "São José",
  
  // Cânticos de eventos
  "Noite Feliz", "Vem Espírito Santo", "Ressuscitou", "Hosana", "Magnificat",
  "Te Deum", "Veni Creator", "Regina Caeli", "Tantum Ergo", "O Come All Ye Faithful",
  
  // Variações comuns de busca
  "cantico deus esta aqui", "letra deus está aqui", "acordes ave maria",
  "santo cantico catolico", "gloria gloria aleluia", "cordeiro que tiras",
  "salve rainha letra", "anjos de deus cifra", "como é grande o meu deus",
  
  // Cânticos em latim
  "Ave Verum Corpus", "Pange Lingua", "Vexilla Regis", "Te Deum Laudamus",
  "Gloria in Excelsis", "Kyrie Eleison", "Agnus Dei", "Sanctus"
] as const;

// Termos de destaque para SEO
export const PRIORITY_TERMS = [
  "canticos catolicos online", "letras acordes canticos",
  "biblioteca canticos catolicos", "site canticos gratis",
  "cancioneiro catolico online", "cifras igreja online",
  "partituras canticos catolicos", "hinario catolico online"
] as const;

// Palavras-chave para páginas de música
export const generateMusicSEOKeywords = (title: string, artist?: string) => {
  const baseKeywords = [
    // Título específico
    title.toLowerCase(),
    `${title.toLowerCase()} cantico`,
    `${title.toLowerCase()} letra`,
    `${title.toLowerCase()} acordes`,
    `${title.toLowerCase()} cifra`,
    `${title.toLowerCase()} partitura`,
    
    // Com "católico"
    `${title.toLowerCase()} católico`,
    `${title.toLowerCase()} catolico`,
    `cantico ${title.toLowerCase()}`,
    `cantico católico ${title.toLowerCase()}`,
    
    // Variações
    `letra de ${title.toLowerCase()}`,
    `acordes de ${title.toLowerCase()}`,
    `cifra ${title.toLowerCase()}`,
    `${title.toLowerCase()} igreja`,
    `${title.toLowerCase()} missa`,
    
    // Variações de busca
    `${title.toLowerCase()} cantico`,
    `${title.toLowerCase()} online`,
    `melhor ${title.toLowerCase()}`,
    
    // Termos gerais
    "cânticos católicos", "canticos catolicos", "música católica", "musica catolica"
  ];
  
  // Adicionar artista se existir
  if (artist) {
    baseKeywords.push(
      `${artist.toLowerCase()} ${title.toLowerCase()}`,
      `${title.toLowerCase()} ${artist.toLowerCase()}`,
      `cantor ${artist.toLowerCase()}`
    );
  }
  
  return baseKeywords;
};

// Descrições meta para páginas de música
export const generateMusicSEODescription = (title: string, artist?: string) => {
  const artistPart = artist ? ` de ${artist}` : '';
  
  return `${title}${artistPart} - Letra, acordes e partitura gratuitos. O Cantólico oferece a melhor colecção de cânticos católicos online para a liturgia.`;
};

// Structured data para páginas de música
export const generateMusicStructuredData = (title: string, artist?: string, lyrics?: string) => {
  return {
    "@context": "https://schema.org",
    "@type": ["MusicRecording", "CreativeWork"],
    "name": title,
    "alternateName": [
      `Cântico ${title}`,
      `${title} - Cântico Católico`,
      `Letra ${title}`,
      `Acordes ${title}`
    ],
    "description": `Cântico católico ${title} com letra completa, acordes e cifras. Disponível gratuitamente no Cantólico.`,
    "genre": ["Religious Music", "Catholic Music", "Música Católica", "Cânticos"],
    "inLanguage": "pt-PT",
    "isPartOf": {
      "@type": "MusicAlbum",
      "name": "Cânticos Católicos - Cantólico",
      "albumProductionType": "compilation"
    },
    "publisher": {
      "@type": "Organization", 
      "name": "Cantólico - Cânticos Católicos",
      "url": "https://cantolico.pt"
    },
    "url": `https://cantolico.pt/musics/${encodeURIComponent(title.toLowerCase().replace(/\s+/g, '-'))}`,
    "mainEntity": {
      "@type": "MusicComposition",
      "name": title,
      "composer": artist || "Tradicional",
      "lyrics": {
        "@type": "CreativeWork",
        "text": lyrics || `Letra completa do cântico ${title}`
      }
    },
    "audience": {
      "@type": "Audience",
      "audienceType": ["Catholics", "Church Musicians", "Liturgy Teams"]
    },
    "keywords": generateMusicSEOKeywords(title, artist).join(", ")
  };
};

// FAQ Schema para páginas de música (melhora SEO)
export const generateMusicFAQSchema = (title: string) => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `Onde encontrar a letra de ${title}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `A letra completa de ${title} está disponível gratuitamente no Cantólico, biblioteca especializada em cânticos católicos.`
        }
      },
      {
        "@type": "Question", 
        "name": `${title} tem acordes disponíveis?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Sim! No Cantólico encontra os acordes e cifras de ${title} de forma completamente gratuita, na nossa biblioteca online de cânticos católicos.`
        }
      },
      {
        "@type": "Question",
        "name": `Como tocar ${title} na guitarra?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `No Cantólico tem os acordes completos de ${title} para guitarra e violão, com cifras simplificadas para facilitar a aprendizagem.`
        }
      },
      {
        "@type": "Question",
        "name": `${title} é um cântico católico tradicional?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `${title} faz parte do repertório de cânticos católicos disponível no Cantólico, nossa biblioteca completa de música litúrgica.`
        }
      }
    ]
  };
};

// Configuração SEO para página principal
export const HOMEPAGE_SEO = {
  title: "Cantólico - Biblioteca de Cânticos Católicos | Letras, Acordes e Partituras",
  description: "Descubra a melhor colecção de cânticos católicos com letras, acordes e partituras gratuitas. Biblioteca completa de música litúrgica para celebrações e liturgia.",
  keywords: [
    ...POPULAR_CANTICOS,
    ...PRIORITY_TERMS,
    "biblioteca canticos catolicos",
    "melhor cancioneiro online", 
    "cantolico biblioteca",
    "site canticos gratis",
    "letras canticos catolicos",
    "acordes canticos igreja"
  ]
};

// Robots.txt otimizado
export const ROBOTS_CONFIG = `User-agent: *
Allow: /

# Prioritizar páginas importantes para SEO
Allow: /musics/*
Allow: /playlists/*
Allow: /
Allow: /terms
Allow: /privacy-policy

# Desallow admin e auth pages
Disallow: /admin*
Disallow: /login*
Disallow: /register*
Disallow: /auth*
Disallow: /api*

# Sitemap
Sitemap: https://cantolico.pt/sitemap.xml

# Crawl-delay para não sobrecarregar
Crawl-delay: 1`;