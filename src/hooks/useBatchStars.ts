import { useEffect, useState } from 'react';

interface StarData {
  starCount: number;
  isStarred: boolean;
}

/**
 * Hook otimizado para buscar star status de múltiplas músicas de uma vez
 * Reduz N requests para 1 único batch request
 * 
 * @param songIds - Array de IDs das músicas
 * @returns Map com dados de star para cada música
 */
export function useBatchStars(songIds: string[]) {
  const [starsData, setStarsData] = useState<Map<string, StarData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!songIds || songIds.length === 0) {
      setStarsData(new Map());
      setIsLoading(false);
      return;
    }

    const fetchBatchStars = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/songs/stars/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ songIds }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch stars: ${response.status}`);
        }

        const data = await response.json();
        
        // Converter objeto para Map
        const starsMap = new Map<string, StarData>();
        Object.entries(data.stars).forEach(([songId, starData]) => {
          starsMap.set(songId, starData as StarData);
        });

        setStarsData(starsMap);
      } catch (err) {
        console.error('Error fetching batch stars:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        // Em caso de erro, criar Map vazio para não quebrar a UI
        setStarsData(new Map());
      } finally {
        setIsLoading(false);
      }
    };

    fetchBatchStars();
  }, [songIds.join(',')]); // Usar join para comparação estável

  return {
    starsData,
    isLoading,
    error,
    getStarData: (songId: string): StarData => {
      return starsData.get(songId) || { starCount: 0, isStarred: false };
    },
  };
}
