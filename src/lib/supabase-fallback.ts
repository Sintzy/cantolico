// Fallback data for when Supabase is not accessible
export const fallbackBanners = [
  {
    id: 'fallback-1',
    title: 'Serviço Temporariamente Indisponível',
    message: 'O sistema de banners está temporariamente offline. Tente novamente mais tarde.',
    type: 'INFO',
    position: 'TOP',
    priority: 1
  }
];

export const fallbackMusics = [];
export const fallbackPlaylists = [];

// Helper to detect if we should use fallback data
export function shouldUseFallback(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || '';
  
  return (
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('network') ||
    errorMessage.includes('connectivity') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connect')
  );
}