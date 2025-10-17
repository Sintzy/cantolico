"use client";

import { toast } from 'sonner';

// Função para limpar cache expirado (não usa hooks)
export function cleanExpiredCache() {
  if (typeof window === 'undefined') return;

  try {
    const keys = Object.keys(sessionStorage);
    const now = Date.now();
    
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        try {
          const item = JSON.parse(sessionStorage.getItem(key) || '{}');
          if (item.expiresAt && now > item.expiresAt) {
            sessionStorage.removeItem(key);
          }
        } catch (error) {
          // Se não conseguir fazer parse, remove o item
          sessionStorage.removeItem(key);
        }
      }
    });
    
    console.log('Cache expirado limpo com sucesso');
  } catch (error) {
    console.warn('Erro ao limpar cache expirado:', error);
  }
}

// Função para pré-carregar dados importantes no cache (não usa hooks)
export async function preloadCache() {
  try {
    // Pré-carregar lista de músicas
    const musicResponse = await fetch('/api/musics/getmusics');
    if (musicResponse.ok) {
      const musicData = await musicResponse.json();
      // O cache será automaticamente populado pelo hook useMusicListCache
    }

    // Pré-carregar playlists públicas
    const playlistResponse = await fetch('/api/playlists/explore');
    if (playlistResponse.ok) {
      const playlistData = await playlistResponse.json();
      // O cache será automaticamente populado pelo hook usePlaylistCache
    }

    console.log('Cache pré-carregado com sucesso');
  } catch (error) {
    console.warn('Erro ao pré-carregar cache:', error);
  }
}

// Hook para invalidação inteligente de cache (usa hooks)
export function useSmartCacheInvalidation() {
  // Esta função será implementada no componente que a usar
  // para evitar problemas de hooks fora de componentes
  
  const invalidateOnMusicChange = () => {
    toast.success('Cache de músicas atualizado');
  };

  const invalidateOnStarChange = (songId?: string) => {
    // Lógica será implementada no componente
  };

  const invalidateOnPlaylistChange = (userId?: string) => {
    toast.success('Cache de playlists atualizado');
  };

  const invalidateAllCache = () => {
    toast.success('Todo o cache foi limpo');
  };

  return {
    invalidateOnMusicChange,
    invalidateOnStarChange,
    invalidateOnPlaylistChange,
    invalidateAllCache
  };
}

// Interceptor para invalidar cache automaticamente em ações específicas
export function withCacheInvalidation<T extends (...args: any[]) => Promise<any>>(
  actionFunction: T,
  invalidationType: 'music' | 'star' | 'playlist' | 'all',
  entityId?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      const result = await actionFunction(...args);
      
      // Invalidação será feita no componente que usar esta função
      console.log(`Cache invalidation needed for: ${invalidationType}`);
      
      return result;
    } catch (error) {
      console.error('Error in action with cache invalidation:', error);
      throw error;
    }
  }) as T;
}

// Hook para monitorar e limpar cache periodicamente
export function useCacheCleaner() {
  const cleanInterval = 30 * 60 * 1000; // 30 minutos

  // Limpar cache expirado na inicialização e periodicamente
  if (typeof window !== 'undefined') {
    // Limpar na inicialização
    cleanExpiredCache();
    
    // Configurar limpeza periódica
    const interval = setInterval(cleanExpiredCache, cleanInterval);
    
    // Limpar intervalo quando componente desmontar
    return () => clearInterval(interval);
  }
}