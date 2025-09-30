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
  
  // Keywords padrão do site
  const defaultKeywords = [
    "cânticos católicos",
    "música religiosa", 
    "liturgia",
    "cancioneiro",
    "igreja católica",
    "música sacra",
    "partituras",
    "acordes",
    "missa",
    "celebração"
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
    title: undefined, // Usa apenas o nome do site
    description: SITE_CONFIG.description,
    type: "website",
    url: "https://cantolico.pt",
    canonical: "https://cantolico.pt",
  }),

  musics: (): Metadata => createMetadata({
    title: "Lista de Cânticos",
    description: "Descobre e pesquisa cânticos católicos para a liturgia. Mais de 100 cânticos organizados por momentos litúrgicos, instrumentos e tags.",
    keywords: ["pesquisar cânticos", "música litúrgica", "cancioneiro católico"],
    url: "https://cantolico.pt/musics",
    canonical: "https://cantolico.pt/musics",
  }),

  musicDetail: (title: string, moments: string[], tags: string[], author?: string): Metadata => {
    const momentos = moments.join(", ");
    return createMetadata({
      title,
      description: `Abre e vê a música "${title}" - Cântico católico para ${momentos}. Encontra a letra, acordes e partituras no Cantólico!`,
      keywords: [title, ...tags, ...moments, "letra", "acordes", "partitura"],
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
    description: description || `Playlist "${name}" - Coleção de cânticos católicos selecionados no Cantólico!`,
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
    description: "Entra na tua conta do Cantólico! para submeter e gerir os teus cânticos católicos.",
    noIndex: true,
  }),

  register: (): Metadata => createMetadata({
    title: "Criar Conta",
    description: "Junta-te à comunidade do Cantólico! e contribui para o maior cancioneiro católico colaborativo.",
    canonical: "https://cantolico.pt/register",
    noIndex: true,
  }),

  userProfile: (userName?: string, userBio?: string): Metadata => createMetadata({
    title: userName ? `Perfil de ${userName}` : "Perfil de Utilizador",
    description: userBio || `Perfil de ${userName || "utilizador"} no Cantólico! - Cancioneiro católico colaborativo.`,
    keywords: ["perfil", "utilizador", userName || ""].filter(Boolean),
    type: "profile",
  }),

  admin: (): Metadata => createMetadata({
    title: "Administração",
    description: "Painel de administração do Cantólico! - Gerir utilizadores, músicas e submissões.",
    noIndex: true,
  }),

  terms: (): Metadata => createMetadata({
    title: "Termos e Condições",
    description: "Termos e condições de utilização do Cantólico! - Cancioneiro católico colaborativo.",
  }),

  privacy: (): Metadata => createMetadata({
    title: "Política de Privacidade", 
    description: "Política de privacidade do Cantólico! - Como protegemos e utilizamos os teus dados.",
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
    description: `Abre e vê a música "${title}" - Cântico católico para ${momentos}. Encontra a letra, acordes e partituras no Cantólico!`,
    keywords: [title, ...tags, ...moments, "letra", "acordes", "partitura"],
    author,
    type: "article",
    url: canonicalUrl,
    canonical: canonicalUrl,
  });
}
