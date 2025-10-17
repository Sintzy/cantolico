import { useState, useEffect, useCallback } from 'react';

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
  
  // Carregar estado do localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(`pageState_${pageKey}`);
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        setState(parsedState);
      } catch (error) {
        console.error('Erro ao carregar estado da página:', error);
      }
    }
  }, [pageKey]);

  // Salvar estado no localStorage
  const saveState = useCallback((newState: Partial<PageState>) => {
    const updatedState = { ...state, ...newState };
    setState(updatedState);
    localStorage.setItem(`pageState_${pageKey}`, JSON.stringify(updatedState));
  }, [state, pageKey]);

  // Restaurar posição do scroll
  const restoreScrollPosition = useCallback(() => {
    setTimeout(() => {
      window.scrollTo({ top: state.scrollPosition, behavior: 'auto' });
    }, 100);
  }, [state.scrollPosition]);

  // Salvar posição do scroll atual
  const saveScrollPosition = useCallback(() => {
    const scrollPosition = window.scrollY;
    saveState({ scrollPosition });
  }, [saveState]);

  // Limpar estado
  const clearState = useCallback(() => {
    setState(DEFAULT_STATE);
    localStorage.removeItem(`pageState_${pageKey}`);
  }, [pageKey]);

  return {
    state,
    saveState,
    restoreScrollPosition,
    saveScrollPosition,
    clearState
  };
}