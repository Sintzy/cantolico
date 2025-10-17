"use client";

import React, { createContext, useContext, useCallback, ReactNode, useEffect } from 'react';
import CacheManager from '@/hooks/useCache';
import { cleanExpiredCache } from '@/hooks/useCacheUtils';

interface CacheContextType {
  // Métodos para gerenciar cache de músicas
  getCachedMusicList: (key: string) => any;
  setCachedMusicList: (key: string, data: any) => void;
  
  // Métodos para gerenciar cache de estrelas
  getCachedStarCount: (songId: string) => { starCount: number; isStarred: boolean } | null;
  setCachedStarCount: (songId: string, starCount: number, isStarred: boolean) => void;
  
  // Métodos para cache de playlists
  getCachedPlaylists: (key: string) => any;
  setCachedPlaylists: (key: string, data: any) => void;
  
  // Métodos gerais
  invalidateAll: () => void;
  invalidateByPattern: (pattern: string) => void;
  getCacheStats: () => any;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

interface CacheProviderProps {
  children: ReactNode;
}

export function CacheProvider({ children }: CacheProviderProps) {
  const cacheManager = CacheManager.getInstance();

  // Cache de listas de músicas
  const getCachedMusicList = useCallback((key: string) => {
    return cacheManager.get(`musicList_${key}`);
  }, [cacheManager]);

  const setCachedMusicList = useCallback((key: string, data: any) => {
    cacheManager.set(`musicList_${key}`, data, {
      ttl: 10 * 60 * 1000, // 10 minutos
      persistOnRefresh: true
    });
  }, [cacheManager]);

  // Cache de estrelas
  const getCachedStarCount = useCallback((songId: string) => {
    return cacheManager.get<{ starCount: number; isStarred: boolean }>(`star_${songId}`);
  }, [cacheManager]);

  const setCachedStarCount = useCallback((songId: string, starCount: number, isStarred: boolean) => {
    cacheManager.set(`star_${songId}`, { starCount, isStarred }, {
      ttl: 30 * 60 * 1000, // 30 minutos
      persistOnRefresh: true
    });
  }, [cacheManager]);

  // Cache de playlists
  const getCachedPlaylists = useCallback((key: string) => {
    return cacheManager.get(`playlists_${key}`);
  }, [cacheManager]);

  const setCachedPlaylists = useCallback((key: string, data: any) => {
    cacheManager.set(`playlists_${key}`, data, {
      ttl: 15 * 60 * 1000, // 15 minutos
      persistOnRefresh: true
    });
  }, [cacheManager]);

  // Invalidar todo o cache
  const invalidateAll = useCallback(() => {
    cacheManager.clear();
  }, [cacheManager]);

  // Invalidar por padrão
  const invalidateByPattern = useCallback((pattern: string) => {
    const stats = cacheManager.getStats();
    const keysToDelete = stats.keys.filter(key => key.includes(pattern));
    
    keysToDelete.forEach(key => {
      cacheManager.delete(key);
    });
  }, [cacheManager]);

  // Obter estatísticas do cache
  const getCacheStats = useCallback(() => {
    return cacheManager.getStats();
  }, [cacheManager]);

  const value: CacheContextType = {
    getCachedMusicList,
    setCachedMusicList,
    getCachedStarCount,
    setCachedStarCount,
    getCachedPlaylists,
    setCachedPlaylists,
    invalidateAll,
    invalidateByPattern,
    getCacheStats
  };

  // Limpar cache expirado periodicamente
  useEffect(() => {
    // Limpar na inicialização
    cleanExpiredCache();
    
    // Configurar limpeza periódica (a cada 30 minutos)
    const interval = setInterval(cleanExpiredCache, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  );
}

export function useAppCache() {
  const context = useContext(CacheContext);
  if (context === undefined) {
    throw new Error('useAppCache deve ser usado dentro de um CacheProvider');
  }
  return context;
}

// Hook para invalidar cache quando dados são modificados
export function useCacheInvalidation() {
  const cache = useAppCache();

  const invalidateMusicList = useCallback(() => {
    cache.invalidateByPattern('musicList_');
  }, [cache]);

  const invalidateStarCount = useCallback((songId?: string) => {
    if (songId) {
      cache.invalidateByPattern(`star_${songId}`);
    } else {
      cache.invalidateByPattern('star_');
    }
  }, [cache]);

  const invalidatePlaylists = useCallback((userId?: string) => {
    if (userId) {
      cache.invalidateByPattern(`playlists_${userId}`);
    } else {
      cache.invalidateByPattern('playlists_');
    }
  }, [cache]);

  return {
    invalidateMusicList,
    invalidateStarCount,
    invalidatePlaylists,
    invalidateAll: cache.invalidateAll
  };
}