import { useState, useCallback, useRef, useEffect } from 'react';
import { useIntersectionObserver } from './useOptimization';

interface InfiniteScrollData<T> {
  items: T[];
  totalCount: number;
  currentPage: number;
  hasMore: boolean;
}

interface InfiniteScrollOptions {
  limit?: number;
  threshold?: number;
  rootMargin?: string;
}

interface ApiResponse<T> {
  data: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export function useInfiniteScroll<T>(
  fetchFunction: (page: number, limit: number, ...args: any[]) => Promise<ApiResponse<T>>,
  dependencies: any[] = [],
  options: InfiniteScrollOptions = {}
) {
  const {
    limit = 20,
    threshold = 0.1,
    rootMargin = '100px'
  } = options;

  const [data, setData] = useState<InfiniteScrollData<T>>({
    items: [],
    totalCount: 0,
    currentPage: 0,
    hasMore: true
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  
  const loadingRef = useRef<Element>(null);
  
  const loadMore = useCallback(async (reset = false) => {
    if (loading) return;
    
    const nextPage = reset ? 1 : data.currentPage + 1;
    
    if (!reset && !data.hasMore) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchFunction(nextPage, limit, ...dependencies);
      
      setData(prev => ({
        items: reset ? response.data : [...prev.items, ...response.data],
        totalCount: response.totalCount,
        currentPage: nextPage,
        hasMore: response.currentPage < response.totalPages
      }));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [fetchFunction, loading, data.currentPage, data.hasMore, limit, dependencies]);

  // Reset and reload when dependencies change
    useEffect(() => {
      setData({
        items: [],
        totalCount: 0,
        currentPage: 0,
        hasMore: true
      });
      loadMore(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(dependencies), initialLoad]);

  // Set up intersection observer for loading more
  useEffect(() => {
    if (!loadingRef.current || !data.hasMore || loading) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loading && data.hasMore) {
        loadMore();
      }
    }, { threshold, rootMargin });

    observer.observe(loadingRef.current);

    return () => {
      if (loadingRef.current) {
        observer.unobserve(loadingRef.current);
      }
    };
  }, [loadingRef.current, data.hasMore, loading, loadMore, threshold, rootMargin]);

  const refresh = useCallback(() => {
    setData({
      items: [],
      totalCount: 0,
      currentPage: 0,
      hasMore: true
    });
    loadMore(true);
  }, [loadMore]);

  return {
    data: data.items,
    totalCount: data.totalCount,
    hasMore: data.hasMore,
    loading,
    error,
    loadingRef,
    refresh,
    loadMore: () => loadMore()
  };
}

// Alternative hook that supports search/filter
export function useInfiniteScrollWithFilters<T>(
  apiEndpoint: string,
  searchParams: Record<string, string> = {},
  options: InfiniteScrollOptions = {}
) {
  const fetchData = useCallback(async (page: number, limit: number) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...searchParams
    });

    const response = await fetch(`${apiEndpoint}?${params}`);
    
    if (!response.ok) {
      throw new Error('Erro ao carregar dados');
    }
    
    const result = await response.json();
    
    // Normalize different API response formats
    if (result.songs) {
      return {
        data: result.songs,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        currentPage: result.currentPage
      };
    } else if (result.users) {
      return {
        data: result.users,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        currentPage: result.currentPage
      };
    } else if (result.playlists) {
      return {
        data: result.playlists,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        currentPage: result.currentPage
      };
    } else if (Array.isArray(result)) {
      // For banners or simple arrays
      return {
        data: result,
        totalCount: result.length,
        totalPages: 1,
        currentPage: 1
      };
    }
    
    // Default format
    return {
      data: result.data || [],
      totalCount: result.totalCount || 0,
      totalPages: result.totalPages || 1,
      currentPage: result.currentPage || 1
    };
  }, [apiEndpoint, searchParams]);

  return useInfiniteScroll(fetchData, [searchParams], options);
}