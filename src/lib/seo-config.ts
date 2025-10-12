/**
 * Configuração SEO Agressiva para Dominação dos Resultados de Busca
 * Objetivo: Aparecer em TODAS as buscas de cânticos católicos
 */

// Lista de cânticos populares para SEO targeting
export const POPULAR_CANTICOS = [
  // Top cânticos mais buscados
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

// Termos competitors para dominar
export const COMPETITOR_TERMS = [
  "musicristo", "musicristo canticos", "musicristo acordes",
  "vitamina c canticos", "vitaminac", "vitamina c cifras",
  "melhor que musicristo", "alternativa musicristo", 
  "melhor site canticos", "site canticos gratis",
  "cancioneiro online", "cifras igreja online"
] as const;

// Meta keywords agressivos para cada página de música
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
    
    // Competidores
    `${title.toLowerCase()} musicristo`,
    `${title.toLowerCase()} vitamina c`,
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

// Meta descriptions agressivas
export const generateMusicSEODescription = (title: string, artist?: string) => {
  const artistPart = artist ? ` de ${artist}` : '';
  
  return `🎵 ${title}${artistPart} - Letra completa, acordes e cifra GRÁTIS! Melhor que MusiCristo e VitaminaC. ⭐ Cantólico tem a maior biblioteca de cânticos católicos online!`;
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
          "text": `A letra completa de ${title} está disponível gratuitamente no Cantólico, a maior biblioteca de cânticos católicos online.`
        }
      },
      {
        "@type": "Question", 
        "name": `${title} tem acordes disponíveis?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Sim! No Cantólico você encontra os acordes e cifras de ${title} de forma gratuita, melhor que MusiCristo ou VitaminaC.`
        }
      },
      {
        "@type": "Question",
        "name": `Como tocar ${title} na guitarra?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `No Cantólico temos os acordes completos de ${title} para guitarra e violão, com cifras simplificadas para facilitar o aprendizado.`
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

// SEO config para homepage
export const HOMEPAGE_SEO = {
  title: "🎵 Cantólico - A Maior Biblioteca de Cânticos Católicos | Letras, Acordes, Partituras Grátis",
  description: "⭐ Encontra QUALQUER cântico católico! +1000 cânticos com letras, acordes e partituras GRÁTIS. Melhor que MusiCristo e VitaminaC. Deus está aqui, Ave Maria, Santo e muito mais!",
  keywords: [
    ...POPULAR_CANTICOS,
    ...COMPETITOR_TERMS,
    "maior site canticos catolicos",
    "melhor cancioneiro online", 
    "cantolico maior biblioteca",
    "site canticos gratis completo",
    "todas letras canticos catolicos",
    "todos acordes canticos igreja"
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