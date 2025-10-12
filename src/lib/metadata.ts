/**
 * Sistema centralizado de metadados para SEO padronizado
 */

import { Metadata } from "next";
import { SITE_CONFIG, SITE_IMAGES } from "./site-images";

interface MetadataConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  type?: "website" | "article" | "profile";
  url?: string;
  image?: string;
  noIndex?: boolean;
  canonical?: string;
}

export function createMetadata(config: MetadataConfig = {}): Metadata {
  const {
    title,
    description = SITE_CONFIG.description,
    keywords = [],
    author,
    type = "website",
    url,
    image = SITE_IMAGES.ogImage,
    noIndex = false,
    canonical
  } = config;

  // O título será processado pelo template do layout raiz
  const fullTitle = title || SITE_CONFIG.name;
  
  // Keywords padrão do site - SEO AGRESSIVO
  const defaultKeywords = [
    "cânticos católicos", "canticos catolicos", "música católica", "musica catolica",
    "liturgia", "cancioneiro católico", "cancioneiro catolico", "igreja católica",
    "música sacra", "musica sacra", "partituras católicas", "partituras catolicas", 
    "acordes", "cifras", "missa", "celebração", "celebracao",
    
    // Cânticos populares
    "Deus está aqui", "Deus esta aqui", "Ave Maria", "Santo", "Gloria a Deus",
    "Aleluia", "Cordeiro de Deus", "Salve Rainha",
    
    // Competidores
    "musicristo", "vitamina c canticos", "vitaminac", "melhor que musicristo",
    "alternativa musicristo", "melhor site canticos", "site canticos gratis",
    
    // Variações
    "cantolico", "cantólico", "letras cânticos", "letras canticos",
    "acordes igreja", "cifras católicas", "cifras catolicas"
  ];

  const allKeywords = [...new Set([...keywords, ...defaultKeywords])];

  const metadata: Metadata = {
    title: fullTitle,
    description,
    keywords: allKeywords,
    authors: author ? [{ name: author }] : [{ name: SITE_CONFIG.name }],
    creator: SITE_CONFIG.name,
    publisher: SITE_CONFIG.name,
    
    // Open Graph
    openGraph: {
      title: fullTitle,
      description,
      type,
      locale: "pt_PT",
      siteName: SITE_CONFIG.name,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: fullTitle,
        }
      ],
      ...(url && { url }),
    },

    // Twitter/X
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
      creator: "@cantolico",
    },

    // Robots
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },

    // Canonical URL
    ...(canonical && {
      alternates: {
        canonical,
      },
    }),
  };

  return metadata;
}

// Metadados específicos para diferentes tipos de página
export const PAGE_METADATA = {
  home: (): Metadata => createMetadata({
    title: "Cantólico - Cânticos Católicos com Letras e Acordes",
    description: "Biblioteca de cânticos católicos com letras, acordes e partituras. Encontra Deus está aqui, Ave Maria, Santo e outros cânticos para a liturgia.",
    keywords: [
      // Cânticos populares para capturar tráfego
      "Deus está aqui", "Deus esta aqui letra", "Ave Maria cantico", "Santo cantico catolico",
      "Gloria a Deus", "Aleluia cantico", "Cordeiro de Deus letra", "Salve Rainha",
      
      // Competidores - dominação direta
      "musicristo", "musicristo canticos", "vitamina c canticos", "vitaminac",
      "melhor que musicristo", "alternativa musicristo", "melhor site canticos",
      "site canticos gratis", "cancioneiro online gratis",
      
      // Termos gerais high-volume
      "cânticos católicos", "canticos catolicos", "letras cânticos", "acordes canticos",
      "partituras católicas", "cifras igreja", "música católica grátis", "cancioneiro católico",
      
      // Long-tail keywords
      "maior biblioteca canticos catolicos", "todos canticos catolicos",
      "cantolico maior site", "site completo canticos", "letras acordes partituras gratis"
    ],
    type: "website",
    url: "https://cantolico.pt",
    canonical: "https://cantolico.pt",
  }),

  musics: (): Metadata => createMetadata({
    title: "Cânticos Católicos - Lista Completa com Letras e Acordes",
    description: "Biblioteca completa de cânticos católicos com letras, acordes e partituras. Pesquisa e encontra qualquer cântico para a liturgia.",
    keywords: [
      // Intenção de busca direta
      "todos canticos catolicos", "lista canticos catolicos", "biblioteca canticos",
      "pesquisar canticos", "encontrar canticos", "buscar canticos",
      
      // Competidores
      "lista musicristo", "todos canticos musicristo", "vitamina c lista",
      "melhor lista canticos", "mais canticos que musicristo",
      
      // Específicos populares
      "lista Deus está aqui", "todos Ave Maria", "canticos Santo",
      "canticos Gloria", "canticos Aleluia", "canticos missa completos",
      
      // Variações
      "cancioneiro completo", "hinario catolico completo", "cifras igreja completas",
      "acordes todos canticos", "letras todos canticos catolicos"
    ],
    url: "https://cantolico.pt/musics",
    canonical: "https://cantolico.pt/musics",
  }),

  musicDetail: (title: string, moments: string[], tags: string[], author?: string): Metadata => {
    const momentos = moments.join(", ");
    const authorPart = author ? ` de ${author}` : '';
    
    return createMetadata({
      title: `${title}${authorPart} - Letra e Acordes | Cantólico`,
      description: `${title}${authorPart} - Letra completa, acordes e cifra. Cântico católico para ${momentos}. Download disponível.`,
      keywords: [
        // Título específico - todas as variações
        title, title.toLowerCase(), 
        `${title} letra`, `${title} acordes`, `${title} cifra`, `${title} cantico`,
        `${title} católico`, `${title} catolico`, `cantico ${title}`,
        `letra ${title}`, `acordes ${title}`, `cifra ${title}`,
        
        // Com "de" se tiver autor
        ...(author ? [
          `${title} ${author}`, `${author} ${title}`, 
          `${title} de ${author}`, `cantor ${author}`
        ] : []),
        
        // Competidores específicos
        `${title} musicristo`, `${title} vitamina c`, `${title} melhor site`,
        `${title} gratis`, `${title} pdf`, `${title} download`,
        
        // Contexto litúrgico
        ...tags, ...moments,
        `${title} missa`, `${title} igreja`, `${title} liturgia`,
        
        // Variações de escrita
        `letra de ${title}`, `acordes de ${title}`, `como tocar ${title}`,
        `${title} violao`, `${title} guitarra`, `${title} piano`
      ],
      author,
      type: "article",
      url: `https://cantolico.pt/musics/${title.toLowerCase().replace(/\s+/g, "-")}`,
    });
  },

  playlists: (): Metadata => createMetadata({
    title: "Playlists",
    description: "Explora e cria playlists de cânticos católicos organizadas por temas, celebrações e momentos litúrgicos.",
    keywords: ["playlists", "coleções", "temas litúrgicos"],
    url: "https://cantolico.pt/playlists",
    canonical: "https://cantolico.pt/playlists",
  }),

  playlistDetail: (name: string, description?: string): Metadata => createMetadata({
    title: name,
    description: description || `Playlist "${name}" - Coleção de cânticos católicos selecionados.`,
    keywords: ["playlist", "coleção", name],
    type: "article",
  }),

  createMusic: (): Metadata => createMetadata({
    title: "Submeter Nova Música",
    description: "Submete o teu cântico católico para a comunidade. Partilha música de qualidade para servir a liturgia.",
    keywords: ["submeter música", "nova música", "contribuir"],
    canonical: "https://cantolico.pt/musics/create",
    noIndex: true, // Não indexar formulários
  }),

  login: (): Metadata => createMetadata({
    title: "Iniciar Sessão",
    description: "Entra na tua conta do Cantólico para submeter e gerir os teus cânticos católicos.",
    noIndex: true,
  }),

  register: (): Metadata => createMetadata({
    title: "Criar Conta",
    description: "Junta-te à comunidade do Cantólico e contribui para o cancioneiro católico colaborativo.",
    canonical: "https://cantolico.pt/register",
    noIndex: true,
  }),

  userProfile: (userName?: string, userBio?: string): Metadata => createMetadata({
    title: userName ? `Perfil de ${userName}` : "Perfil de Utilizador",
    description: userBio || `Perfil de ${userName || "utilizador"} no Cantólico - Cancioneiro católico colaborativo.`,
    keywords: ["perfil", "utilizador", userName || ""].filter(Boolean),
    type: "profile",
  }),

  admin: (): Metadata => createMetadata({
    title: "Administração",
    description: "Painel de administração do Cantólico - Gerir utilizadores, músicas e submissões.",
    noIndex: true,
  }),

  terms: (): Metadata => createMetadata({
    title: "Termos e Condições",
    description: "Termos e condições de utilização do Cantólico - Cancioneiro católico colaborativo.",
  }),

  privacy: (): Metadata => createMetadata({
    title: "Política de Privacidade", 
    description: "Política de privacidade do Cantólico - Como protegemos e utilizamos os teus dados.",
  }),

  notFound: (): Metadata => createMetadata({
    title: "Página não encontrada",
    description: "A página que procuras não existe. Explora o nosso cancioneiro católico.",
    noIndex: true,
  }),
};

// Helper para music metadata dinâmica
export function createMusicMetadata(song: {
  title: string;
  moments: string[];
  tags: string[];
  slug?: string;
  id?: string;
  author?: string;
}): Metadata {
  const { title, moments, tags, slug, id, author } = song;
  const momentos = moments.join(", ");
  
  // Sempre usar slug para URL canonical se disponível, senão usar ID
  // Isto garante consistência e evita conteúdo duplicado
  const canonicalPath = slug || id || title.toLowerCase().replace(/\s+/g, "-");
  const canonicalUrl = `https://cantolico.pt/musics/${canonicalPath}`;
  
  return createMetadata({
    title,
    description: `"${title}" - Cântico católico para ${momentos}. Letra, acordes e partituras no Cantólico.`,
    keywords: [title, ...tags, ...moments, "letra", "acordes", "partitura"],
    author,
    type: "article",
    url: canonicalUrl,
    canonical: canonicalUrl,
  });
}
