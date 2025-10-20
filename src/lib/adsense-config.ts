/**
 * Configuração centralizada dos anúncios Google AdSense
 * 
 * TIPO DE AD UNITS: DISPLAY ADS (todas as 12 units)
 * - Responsivas por padrão
 * - Melhor inventário de anunciantes  
 * - Compatível com desktop e mobile
 * 
 * INSTRUÇÕES PARA CRIAR NO ADSENSE:
 * 1. Acesse Google AdSense Dashboard
 * 2. Ads → Create ad unit → Display ads
 * 3. Configure como "Responsive" 
 * 4. Copie o data-ad-slot de cada unit
 * 5. Substitua os valores placeholder abaixo
 * 6. Os anúncios aparecerão automaticamente no site
 */

export const ADSENSE_CONFIG = {
  // Publisher ID do Google AdSense
  CLIENT_ID: 'ca-pub-1343808891223374',
  
  // Test mode - quando true, mostra placeholders de teste
  TEST_MODE: process.env.NODE_ENV === 'development',
  
  // Use real ads (remover data-adtest em produção)
  USE_REAL_ADS: process.env.NODE_ENV === 'production',
  
  // Ad Units - SLOTS REAIS DO GOOGLE ADSENSE (ATUALIZADOS!)
  SLOTS: {
    // === PÁGINA DE MÚSICA INDIVIDUAL (/musics/[id]) ===
    MUSIC_SIDEBAR: '1441027060',     // Responsive Square/Rectangle - Sidebar desktop após tags
    MUSIC_MOBILE: '5418772850',      // Responsive Square/Rectangle - Mobile após letra  
    MUSIC_FOOTER: '5338881803',      // Responsive Horizontal - Banner horizontal final
    
    // === LISTA DE MÚSICAS (/musics) ===
    MUSIC_LIST_TOP: '4105691181',    // Responsive Horizontal - Topo após filtros
    MUSIC_LIST_SIDEBAR: '9437908919', // Responsive Vertical - Sidebar com filtros (desktop)
    MUSIC_LIST_BOTTOM: '8124827240', // Responsive Horizontal - Final antes da paginação
    
    // === PLAYLISTS (/playlists) ===
    PLAYLIST_LIST: '9314172875',     // Responsive Horizontal - Entre header e lista
    PLAYLIST_LIST_SIDEBAR: '6118638676', // Responsive Square/Rectangle - Sidebar direita (desktop)
    
    // === VISUALIZAÇÃO DE PLAYLIST (/playlists/[id]) ===
    PLAYLIST_VIEW: '3492475333',     // Responsive Horizontal - Após info, antes das músicas
    
    // === MÚSICAS FAVORITAS (/starred-songs) ===
    STARRED_SONGS: '9086555125',     // Responsive Horizontal - Após filtros, antes da lista
    
    // === EXPLORAR PLAYLISTS (/playlists/explore) ===
    EXPLORE_PLAYLISTS: '4464783837', // Responsive Horizontal - Topo da página
    
    // === PÁGINAS SECUNDÁRIAS ===
    GENERIC_BANNER: '7773473458',    // Responsive Horizontal - Banner genérico
  }
};

// Formatos comuns de anúncios
export const AD_FORMATS = {
  AUTO: 'auto',
  RECTANGLE: 'rectangle',
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
  SQUARE: 'square'
};

// Estilos padrão para diferentes tipos de anúncios
export const AD_STYLES = {
  SIDEBAR: {
    display: 'block',
    minHeight: '250px',
    width: '100%',
    maxWidth: '320px'
  },
  
  MOBILE_BANNER: {
    display: 'block',
    minHeight: '280px',
    width: '100%'
  },
  
  HORIZONTAL: {
    display: 'block',
    minHeight: '120px',
    width: '100%'
  },
  
  LARGE_RECTANGLE: {
    display: 'block',
    minHeight: '280px',
    width: '100%',
    maxWidth: '336px'
  }
};

// Configurações responsivas
export const RESPONSIVE_CONFIG = {
  MOBILE_ONLY: 'md:hidden',
  DESKTOP_ONLY: 'hidden md:block',
  ALL_DEVICES: ''
};