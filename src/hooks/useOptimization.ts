import { useState, useEffect, useCallback, useRef } from 'react';

// Hook para debounce de pesquisa
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook para detectar quando o usuário chega ao final da página
export function useIntersectionObserver(
  targetRef: React.RefObject<Element>,
  callback: () => void,
  options?: IntersectionObserverInit
) {
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        callback();
      }
    }, options);

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [targetRef, callback, options]);
}

// Hook para evitar re-fetch ao voltar para a página
export function useStableData<T>(
  fetchFunction: () => Promise<T>,
  dependencies: any[] = [],
  cacheKey?: string
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const cacheTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cache simples baseado em sessionStorage
  const getCachedData = useCallback(() => {
    if (!cacheKey) return null;
    try {
      const cached = sessionStorage.getItem(`cache_${cacheKey}`);
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        // Cache válido por 5 minutos
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          return cachedData;
        }
      }
    } catch {
      // Ignore cache errors
    }
    return null;
  }, [cacheKey]);

  const setCachedData = useCallback((newData: T) => {
    if (!cacheKey) return;
    try {
      sessionStorage.setItem(`cache_${cacheKey}`, JSON.stringify({
        data: newData,
        timestamp: Date.now()
      }));
    } catch {
      // Ignore cache errors
    }
  }, [cacheKey]);

  const fetchData = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Evita fetch se foi feito recentemente (< 30 segundos) e não é forçado
    if (!force && now - lastFetch < 30000) {
      return;
    }

    // Tenta usar cache primeiro
    const cachedData = getCachedData();
    if (cachedData && !force) {
      setData(cachedData);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await fetchFunction();
      setData(result);
      setCachedData(result);
      setLastFetch(now);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, lastFetch, getCachedData, setCachedData]);

  // Auto-fetch apenas na primeira vez ou quando dependencies mudam
  useEffect(() => {
    if (!data || dependencies.some((dep, index) => 
      dep !== dependencies[index]
    )) {
      fetchData();
    }
  }, dependencies);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
    lastFetch
  };
}

// Hook para detectar focus/blur da janela
export function useWindowFocus() {
  const [isFocused, setIsFocused] = useState(true);

  useEffect(() => {
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return isFocused;
}

// Hook para scroll virtual (quando temos muitos items)
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length - 1
  );
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    setScrollTop
  };
}