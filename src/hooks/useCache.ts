"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

// Tipos para o cache
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt?: number;
}

interface CacheOptions {
  ttl?: number; // Time to live em milissegundos
  persistOnRefresh?: boolean; // Manter no sessionStorage
  maxSize?: number; // Máximo de itens no cache
}

// Cache em memória global
const memoryCache = new Map<string, CacheItem<any>>();

// Utilitários de cache
class CacheManager {
  private static instance: CacheManager;
  private maxSize = 1000;

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const { ttl, persistOnRefresh = false, maxSize = this.maxSize } = options;
    
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : undefined
    };

    // Limpar cache se exceder tamanho máximo
    if (memoryCache.size >= maxSize) {
      this.clearOldestItems(Math.floor(maxSize * 0.1)); // Remove 10% dos itens mais antigos
    }

    memoryCache.set(key, item);

    // Persistir no sessionStorage se solicitado
    if (persistOnRefresh && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`cache_${key}`, JSON.stringify(item));
      } catch (error) {
        console.warn('Erro ao salvar no sessionStorage:', error);
      }
    }
  }

  get<T>(key: string): T | null {
    // Verificar primeiro no cache em memória
    let item = memoryCache.get(key);

    // Se não encontrar e estivermos no browser, verificar sessionStorage
    if (!item && typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(`cache_${key}`);
        if (stored) {
          item = JSON.parse(stored);
          // Recolocar no cache em memória
          if (item) {
            memoryCache.set(key, item);
          }
        }
      } catch (error) {
        console.warn('Erro ao ler do sessionStorage:', error);
      }
    }

    if (!item) return null;

    // Verificar se expirou
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): void {
    memoryCache.delete(key);
    
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(`cache_${key}`);
    }
  }

  clear(): void {
    memoryCache.clear();
    
    if (typeof window !== 'undefined') {
      // Limpar apenas itens de cache do sessionStorage
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          sessionStorage.removeItem(key);
        }
      });
    }
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  private clearOldestItems(count: number): void {
    const items = Array.from(memoryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, count);

    items.forEach(([key]) => {
      memoryCache.delete(key);
    });
  }

  // Método para obter estatísticas do cache
  getStats() {
    return {
      size: memoryCache.size,
      maxSize: this.maxSize,
      keys: Array.from(memoryCache.keys())
    };
  }
}

// Hook principal de cache
export function useCache<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  options: CacheOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheManager = CacheManager.getInstance();
  const fetchedRef = useRef(false);

  const {
    ttl = 5 * 60 * 1000, // 5 minutos por padrão
    persistOnRefresh = true
  } = options;

  // Função para buscar dados
  const fetchData = useCallback(async (forceRefresh = false) => {
    const cacheKey = `data_${key}`;
    
    // Verificar cache primeiro (a menos que seja refresh forçado)
    if (!forceRefresh) {
      const cachedData = cacheManager.get<T>(cacheKey);
      if (cachedData !== null) {
        setData(cachedData);
        setError(null);
        return cachedData;
      }
    }

    // Se não está no cache ou é refresh forçado, buscar
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction();
      
      // Salvar no cache
      cacheManager.set(cacheKey, result, { ttl, persistOnRefresh });
      
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [key, fetchFunction, ttl, persistOnRefresh, cacheManager]);

  // Carregar dados iniciais
  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchData();
    }
  }, [fetchData]);

  // Função para invalidar cache
  const invalidateCache = useCallback(() => {
    const cacheKey = `data_${key}`;
    cacheManager.delete(cacheKey);
  }, [key, cacheManager]);

  // Função para atualizar dados no cache sem re-fetch
  const updateCache = useCallback((newData: T) => {
    const cacheKey = `data_${key}`;
    cacheManager.set(cacheKey, newData, { ttl, persistOnRefresh });
    setData(newData);
  }, [key, ttl, persistOnRefresh, cacheManager]);

  return {
    data,
    loading,
    error,
    refetch: () => fetchData(true),
    invalidateCache,
    updateCache,
    isInCache: cacheManager.has(`data_${key}`)
  };
}

// Hook especializado para listas de músicas
export function useMusicListCache(
  endpoint: string,
  options: CacheOptions = {}
) {
  return useCache(
    `musicList_${endpoint}`,
    async () => {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Erro ao carregar músicas');
      }
      return response.json();
    },
    {
      ttl: 10 * 60 * 1000, // 10 minutos para listas de músicas
      persistOnRefresh: true,
      ...options
    }
  );
}

// Hook para cache de contador de estrelas
export function useStarCountCache(songId: string) {
  const [starCount, setStarCount] = useState<number>(0);
  const [isStarred, setIsStarred] = useState<boolean>(false);
  const cacheManager = CacheManager.getInstance();

  const updateStarCache = useCallback((newStarCount: number, newIsStarred: boolean) => {
    const cacheKey = `star_${songId}`;
    const data = { starCount: newStarCount, isStarred: newIsStarred };
    
    cacheManager.set(cacheKey, data, {
      ttl: 30 * 60 * 1000, // 30 minutos
      persistOnRefresh: true
    });
    
    setStarCount(newStarCount);
    setIsStarred(newIsStarred);
  }, [songId, cacheManager]);

  const getStarCache = useCallback(() => {
    const cacheKey = `star_${songId}`;
    const cached = cacheManager.get<{starCount: number, isStarred: boolean}>(cacheKey);
    
    if (cached) {
      setStarCount(cached.starCount);
      setIsStarred(cached.isStarred);
      return cached;
    }
    
    return null;
  }, [songId, cacheManager]);

  return {
    starCount,
    isStarred,
    setStarCount,
    setIsStarred,
    updateStarCache,
    getStarCache
  };
}

// Hook para cache de playlists
export function usePlaylistCache(userId?: string) {
  const cacheKey = userId ? `playlists_${userId}` : 'playlists_public';
  
  return useCache(
    cacheKey,
    async () => {
      const endpoint = userId ? '/api/user/playlists' : '/api/playlists/explore';
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Erro ao carregar playlists');
      }
      return response.json();
    },
    {
      ttl: 15 * 60 * 1000, // 15 minutos
      persistOnRefresh: true
    }
  );
}

export default CacheManager;