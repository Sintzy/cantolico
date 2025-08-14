/**
 * Configuração centralizada de todas as imagens e ícones do site
 * URLs do Supabase Storage para assets do Cantólico
 */

const BASE_URL = "https://truenas-scale.fold-pence.ts.net/storage/v1/object/public/assets";

export const SITE_IMAGES = {
  // Favicons e ícones do site - versões transparentes
  favicon16: `${BASE_URL}/cantolicoimagens/transparentes/favicon-16x16.png`,
  favicon32: `${BASE_URL}/cantolicoimagens/transparentes/favicon-32x32.png`,
  faviconIco: `${BASE_URL}/cantolicoimagens/transparentes/favicon.ico`,
  
  // Ícones para dispositivos móveis e PWA - versões transparentes
  appleTouchIcon: `${BASE_URL}/cantolicoimagens/transparentes/apple-touch-icon.png`,
  androidChrome192: `${BASE_URL}/cantolicoimagens/transparentes/android-chrome-192x192.png`,
  androidChrome512: `${BASE_URL}/cantolicoimagens/transparentes/android-chrome-512x512.png`,
  
  // Logo principal do site - Cantólico Quadrado SVG transparente para interface
  logo: `${BASE_URL}/cantolicoimagens/cantolico quadrado svg.svg`,
  logoIcon: `${BASE_URL}/cantolicoimagens/cantolico.svg`,
  logoJump: `${BASE_URL}/cantolicoimagens/jump.png`,
  
  // Imagens para redes sociais (Open Graph) - com fundo branco para SEO/Google
  ogImage: `${BASE_URL}/cantolicoimagens/cantolico quadrado svg.svg`,
  twitterImage: `${BASE_URL}/cantolicoimagens/cantolico quadrado svg.svg`,
  
  // Imagem específica para SEO (Google Search) - com fundo branco
  seoImage: `${BASE_URL}/cantolicoimagens/cantolico quadrado svg.svg`,
  
  // Placeholder para utilizadores sem foto
  defaultProfile: "/default-profile.png", // Mantido local no public/
} as const;

/**
 * Informações do site para manifest e metadados
 */
export const SITE_CONFIG = {
  name: "Cantólico!",
  shortName: "Cantólico",
  description: "Encontra, submete e partilha cânticos católicos. Um projeto aberto para servir a liturgia com música de qualidade.",
  themeColor: "#000000",
  backgroundColor: "#ffffff",
  display: "standalone",
  orientation: "portrait",
  scope: "/",
  startUrl: "/",
} as const;

/**
 * Helper para obter URLs das imagens com fallback
 */
export const getImageUrl = (key: keyof typeof SITE_IMAGES, fallback?: string): string => {
  return SITE_IMAGES[key] || fallback || "";
};

/**
 * Configuração de ícones para diferentes contextos
 */
export const ICON_SIZES = {
  favicon: [16, 32],
  appleTouchIcon: [180],
  androidChrome: [192, 512],
  manifest: [192, 512],
} as const;
