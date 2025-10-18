import { useState, useEffect, useCallback, useRef } from 'react';

interface PageState {
  scrollPosition: number;
  currentPage: number;
  searchTerm: string;
  selectedMoment: string | null;
  tagFilter: string;
  sortOrder: 'asc' | 'desc';
}

const DEFAULT_STATE: PageState = {
  scrollPosition: 0,
  currentPage: 1,
  searchTerm: '',
  selectedMoment: null,
  tagFilter: '',
  sortOrder: 'asc'
};

export function usePageState(pageKey: string) {
  const [state, setState] = useState<PageState>(DEFAULT_STATE);
  const [isClient, setIsClient] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const isRestoringRef = useRef(false);
  
  // Detectar se estamos no cliente
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Carregar estado do localStorage apenas uma vez e no cliente
  useEffect(() => {
    if (!isClient) return;
    
    if (isInitialized) return;
    
    const savedState = localStorage.getItem(`pageState_${pageKey}`);
    const returningFromSong = sessionStorage.getItem('returningFromSong');
    
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        
        if (returningFromSong === 'true') {
          // Estamos retornando de uma página individual, mantém scroll position
          setState(parsedState);
          // Remove a flag de retorno
          sessionStorage.removeItem('returningFromSong');
        } else {
          // Carregamento normal, reseta scroll position
          setState({ ...parsedState, scrollPosition: 0 });
        }
      } catch (error) {
        console.error('Erro ao carregar estado da página:', error);
      }
    }
    
    // Marcar como inicializado independentemente de ter dados ou não
    setIsInitialized(true);
  }, [pageKey, isClient, isInitialized]);

  // Salvar estado no localStorage sem causar re-renders
  const saveState = useCallback((newState: Partial<PageState>) => {
    if (!isClient) return;
    
    setState(prevState => {
      const updatedState = { ...prevState, ...newState };
      localStorage.setItem(`pageState_${pageKey}`, JSON.stringify(updatedState));
      return updatedState;
    });
  }, [pageKey, isClient]);

  // Restaurar posição do scroll
  const restoreScrollPosition = useCallback(() => {
    if (!isClient || isRestoringRef.current || state.scrollPosition <= 0) return;
    
    isRestoringRef.current = true;
    
    // Aguardar o DOM estar pronto
    const restoreScroll = () => {
      window.scrollTo({ 
        top: state.scrollPosition, 
        behavior: 'auto' 
      });
      
      // Limpar a posição salva após restaurar
      setTimeout(() => {
        isRestoringRef.current = false;
        setState(prevState => {
          const updatedState = { ...prevState, scrollPosition: 0 };
          localStorage.setItem(`pageState_${pageKey}`, JSON.stringify(updatedState));
          return updatedState;
        });
      }, 100);
    };

    // Usar requestAnimationFrame para garantir que o DOM foi renderizado
    requestAnimationFrame(() => {
      setTimeout(restoreScroll, 50);
    });
  }, [state.scrollPosition, pageKey, isClient]);

  // Salvar posição do scroll atual
  const saveScrollPosition = useCallback(() => {
    if (!isClient || isRestoringRef.current) return;
    
    const scrollPosition = window.scrollY;
    if (scrollPosition > 100) { // Só salvar se scrollou significativamente
      setState(prevState => {
        const updatedState = { ...prevState, scrollPosition };
        localStorage.setItem(`pageState_${pageKey}`, JSON.stringify(updatedState));
        return updatedState;
      });
    }
  }, [pageKey, isClient]);

  // Limpar estado
  const clearState = useCallback(() => {
    setState(DEFAULT_STATE);
    if (isClient) {
      localStorage.removeItem(`pageState_${pageKey}`);
    }
    setIsInitialized(false);
  }, [pageKey, isClient]);

  return {
    state,
    saveState,
    restoreScrollPosition,
    saveScrollPosition,
    clearState,
    isInitialized
  };
}