'use client';

import { useEffect, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LiturgicalMoment, getInstrumentLabel, getLiturgicalMomentLabel } from '@/lib/constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import removeAccents from 'remove-accents';
import Link from 'next/link';
import { Search, Tags, Music, ChevronLeft, ChevronRight, X, SlidersHorizontal, RefreshCw } from 'lucide-react';
import StarButton from '@/components/StarButton';
import AddToPlaylistButton from '@/components/AddToPlaylistButton';
import { MusicListSkeleton } from '@/components/MusicListSkeleton';
import { toast } from 'sonner';
import { usePageState } from '@/hooks/usePageState';
import { trackEvent } from '@/lib/umami';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';

// Helper function para converter chaves do enum para valores bonitos
const getMomentDisplayName = (momentKey: string): string => {
  return getLiturgicalMomentLabel(momentKey);
};

const allMoments = [
  'ENTRADA',
  'ATO_PENITENCIAL',
  'GLORIA',
  'SALMO',
  'ACLAMACAO',
  'OFERTORIO',
  'SANTO',
  'COMUNHAO',
  'ACAO_DE_GRACAS',
  'FINAL',
  'ADORACAO',
  'ASPERSAO',
  'BAPTISMO',
  'BENCAO_DAS_ALIANCAS',
  'CORDEIRO_DE_DEUS',
  'CRISMA',
  'INTRODUCAO_DA_PALAVRA',
  'LOUVOR',
  'PAI_NOSSO',
  'REFLEXAO',
  'TERCO_MISTERIO',
  'OUTROS',
];

type Song = {
  id: string;
  title: string;
  slug: string;
  moments: string[];
  tags: string[];
  mainInstrument: string;
  starCount?: number;
  isStarred?: boolean;
};

interface MusicsPageClientProps {
  initialSongs: Song[];
}

export default function MusicsPageClient({ initialSongs }: MusicsPageClientProps) {
  // Ensure initialSongs is always an array and normalize data
  const normalizedInitialSongs = (Array.isArray(initialSongs) ? initialSongs : []).map(song => ({
    ...song,
    moments: Array.isArray(song.moments) ? song.moments : [],
    tags: Array.isArray(song.tags) ? song.tags : [],
  }));

  // Estados principais
  const [songs, setSongs] = useState<Song[]>(normalizedInitialSongs);
  const [loading, setLoading] = useState(false);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(normalizedInitialSongs.length > 0); // Já temos dados do servidor

  // Use page state hook para manter estado entre navegações
  const { state, saveState, restoreScrollPosition, saveScrollPosition, isInitialized } = usePageState('musics');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMoment, setSelectedMoment] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPageInput, setJumpPageInput] = useState('');

  useEffect(() => {
    trackEvent('musics_list_view', { initialCount: normalizedInitialSongs.length });
  }, []);

  const itemsPerPage = 12;
  const totalPages = Math.ceil((filteredSongs || []).length / itemsPerPage);

  // Função para carregar dados diretamente da API (sem cache local)
  const loadMusicData = async () => {
    // Evitar múltiplas cargas simultâneas apenas se já temos dados
    if (loading && dataLoaded) {
      return;
    }

    try {
      setLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout

      const response = await fetch('/api/musics/getmusics', {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !Array.isArray(data.songs)) {
        throw new Error('Formato de dados inválido');
      }

      setSongs(data.songs);
      setDataLoaded(true);

    } catch (error) {
      console.error('Erro ao carregar músicas:', error);

      if (error instanceof Error && error.name === 'AbortError') {
        toast.error('Timeout: A requisição demorou muito tempo. Tente novamente.');
      } else {
        toast.error('Erro ao carregar as músicas. Tente novamente.');
      }

      setDataLoaded(true); // Marcar como tentado mesmo com erro para evitar loops
    } finally {
      setLoading(false);
    }
  };

  // Inicializar estado dos filtros quando usePageState estiver pronto
  useEffect(() => {
    if (isInitialized && state) {
      setSearchTerm(state.searchTerm || '');
      setSelectedMoment(state.selectedMoment || null);
      setTagFilter(state.tagFilter || '');
      setSortOrder(state.sortOrder || 'asc');
      setCurrentPage(state.currentPage || 1);
    }
  }, [isInitialized, state]);

  // Dados já carregados do servidor - não precisa de useEffect para carregar

  // Restaurar posição do scroll - apenas uma vez após carregar dados
  useEffect(() => {
    if (isInitialized && songs.length > 0 && state?.scrollPosition > 0) {
      const timer = setTimeout(() => {
        window.scrollTo({ top: state.scrollPosition, behavior: 'auto' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isInitialized, songs.length, state?.scrollPosition]);

  // Salvar posição do scroll periodicamente
  useEffect(() => {
    if (!isInitialized) return;

    let scrollTimer: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const scrollY = window.scrollY;
        if (scrollY > 100) {
          saveState({
            ...state,
            scrollPosition: scrollY,
            searchTerm,
            selectedMoment,
            tagFilter,
            sortOrder,
            currentPage
          });
        }
      }, 500); // Aumentar debounce para evitar muitas chamadas
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimer);
    };
  }, [isInitialized, state, searchTerm, selectedMoment, tagFilter, sortOrder, currentPage, saveState]);

  useEffect(() => {
    const filtered = songs
      .filter((song: Song) => {
        const titleMatch = removeAccents(song.title.toLowerCase()).includes(
          removeAccents(searchTerm.toLowerCase())
        );
        const momentMatch = selectedMoment
          ? (song.moments || []).includes(selectedMoment)
          : true;
        const tagMatch = tagFilter
          ? (song.tags || []).some((tag: string) =>
              removeAccents(tag.toLowerCase()).includes(
                removeAccents(tagFilter.toLowerCase())
              )
            )
          : true;
        return titleMatch && momentMatch && tagMatch;
      })
      .sort((a: Song, b: Song) =>
        sortOrder === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title)
      );

    setFilteredSongs(filtered);
    // Only reset to page 1 on initial loads. If we're restoring state (isInitialized === true)
    // we keep the restored currentPage so the "return from song" flow works.
    if (!isInitialized) {
      setCurrentPage(1);
    }
  }, [searchTerm, selectedMoment, tagFilter, sortOrder, songs]);

  // Função para navegar para música individual
  const handleNavigateToSong = useCallback((songSlug: string) => {
    trackEvent('musics_song_opened', { songSlug });
    // Salvar estado atual antes de navegar
    if (saveState) {
      saveState({
        scrollPosition: window.scrollY,
        currentPage,
        searchTerm,
        selectedMoment,
        tagFilter,
        sortOrder
      });
      // Also write synchronously to localStorage to ensure restore works even if React state update is async
      try {
        const syncState = JSON.parse(localStorage.getItem('pageState_musics') || '{}');
        const updated = { ...syncState, scrollPosition: window.scrollY, currentPage, searchTerm, selectedMoment, tagFilter, sortOrder };
        localStorage.setItem('pageState_musics', JSON.stringify(updated));
      } catch (err) {
        // ignore
      }
    }

    // Marcar que vamos navegar para uma página individual
    sessionStorage.setItem('navigatingToSong', 'true');
  }, [currentPage, searchTerm, selectedMoment, tagFilter, sortOrder]);

  const clearFilters = () => {
    trackEvent('musics_filters_cleared');
    setSearchTerm('');
    setSelectedMoment(null);
    setTagFilter('');
    setCurrentPage(1);
    setIsMobileFiltersOpen(false);

    // Salvar estado limpo
    if (saveState) {
      saveState({
        searchTerm: '',
        selectedMoment: null,
        tagFilter: '',
        currentPage: 1,
        scrollPosition: 0,
        sortOrder: 'asc'
      });
    }
  };

  const renderFilterContent = () => (
    <div className="space-y-4">
      {/* Momento Litúrgico */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-stone-700">Momento Litúrgico</Label>
        <Select
          onValueChange={(v) => {
            const newValue = v === 'ALL' ? null : v;
            trackEvent('musics_filter_moment_changed', { moment: newValue || 'ALL' });
            setSelectedMoment(newValue);
            if (saveState) {
              saveState({
                ...state,
                selectedMoment: newValue,
                currentPage: 1,
                scrollPosition: 0
              });
            }
          }}
          value={selectedMoment ?? 'ALL'}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todos os momentos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os momentos</SelectItem>
            {allMoments.map((moment) => (
              <SelectItem key={moment} value={moment}>
                {getMomentDisplayName(moment)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-stone-700">Tags</Label>
        <div className="relative">
          <Tags className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input
            value={tagFilter}
            onChange={(e) => {
              const newValue = e.target.value;
              setTagFilter(newValue);
              if (saveState) {
                saveState({
                  ...state,
                  tagFilter: newValue,
                  currentPage: 1,
                  scrollPosition: 0
                });
              }
            }}
            placeholder="Ex: amor, paz..."
            className="pl-10 h-9"
          />
        </div>
      </div>

      {/* Ordenação */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-stone-700">Ordenação</Label>
        <Select
          onValueChange={(v) => {
            const newValue = v as 'asc' | 'desc';
            trackEvent('musics_sort_changed', { value: newValue });
            setSortOrder(newValue);
            if (saveState) {
              saveState({
                ...state,
                sortOrder: newValue,
                scrollPosition: 0
              });
            }
          }}
          value={sortOrder}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">A-Z</SelectItem>
            <SelectItem value="desc">Z-A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters */}
      {(searchTerm || selectedMoment || tagFilter) && (
        <button onClick={clearFilters} className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-stone-200 text-sm text-stone-600 hover:bg-stone-50 transition-colors">
          <X className="h-4 w-4" />
          Limpar filtros
        </button>
      )}

      {/* Results Count */}
      <div className="pt-3 border-t border-stone-100 text-center">
        <p className="text-sm text-stone-500">
          {loading ? (
            <><span className="sr-only">A carregar...</span><span aria-hidden data-nosnippet>A carregar...</span></>
          ) : (
            <>
              <span className="font-medium text-stone-900">{filteredSongs.length}</span>
              {' '}cânticos
            </>
          )}
        </p>
      </div>
    </div>
  );

  const paginatedSongs = (filteredSongs || []).slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <main className="flex-1 bg-white">
      {/* Page header */}
      <div className="border-b border-stone-100 bg-white pt-20 pb-8">
        <div className="mx-auto max-w-screen-xl px-5">
          <div className="flex items-center gap-2 text-xs font-medium tracking-widest text-stone-400 uppercase mb-3">
            <span className="text-rose-700">✝</span>
            <span>Cânticos Católicos</span>
          </div>
          <h1 className="font-display text-4xl text-stone-900">Biblioteca de Cânticos</h1>
          <p className="mt-2 text-stone-500 text-sm max-w-xl">Explora todos os nossos cânticos católicos</p>
          {/* Refresh Button */}
          <div className="mt-4">
            <button
              onClick={() => {
                trackEvent('musics_list_refresh_clicked');
                loadMusicData();
                toast.success('Dados atualizados!');
              }}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-screen-xl px-5 py-8">
        {/* Mobile Search Bar */}
        <div className="lg:hidden mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                const newValue = e.target.value;
                setSearchTerm(newValue);
                if (saveState) {
                  saveState({
                    ...state,
                    searchTerm: newValue,
                    currentPage: 1,
                    scrollPosition: 0
                  });
                }
              }}
              placeholder="Pesquisar cântico..."
              className="pl-10 h-10 w-full"
            />
          </div>
        </div>

        {/* Mobile Filter Button */}
        <div className="lg:hidden mb-4">
          <Dialog open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
            <DialogTrigger asChild>
              <button
                onClick={() => setIsMobileFiltersOpen(true)}
                className="w-full flex items-center justify-start gap-2 h-9 rounded-lg border border-stone-200 px-3 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
              >
                <SlidersHorizontal className="h-4 w-4 text-stone-400" />
                Filtros
                {(selectedMoment || tagFilter) && (
                  <span className="ml-auto inline-flex items-center justify-center rounded-full bg-stone-900 text-white text-xs w-5 h-5">
                    {[selectedMoment, tagFilter].filter(Boolean).length}
                  </span>
                )}
              </button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-sm mx-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtros
                </DialogTitle>
              </DialogHeader>
              <div className="mt-6">
                {renderFilterContent()}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-8">
          {/* Desktop Sidebar - Filtros */}
          <aside className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-8 space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setSearchTerm(newValue);
                    if (saveState) {
                      saveState({
                        ...state,
                        searchTerm: newValue,
                        currentPage: 1,
                        scrollPosition: 0
                      });
                    }
                  }}
                  placeholder="Pesquisar cântico..."
                  className="pl-10 h-10 w-full"
                />
              </div>

              <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                <div className="border-b border-stone-100 bg-stone-50/50 px-4 py-3 flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-stone-400" />
                  <span className="text-sm font-medium text-stone-700">Filtros</span>
                </div>
                <div className="p-4 space-y-4">
                  {renderFilterContent()}
                </div>
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <MusicListSkeleton />
            ) : paginatedSongs.length === 0 ? (
              <div className="text-center py-16 rounded-xl border border-stone-200 bg-white">
                <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Music className="h-6 w-6 text-stone-400" />
                </div>
                <p className="text-stone-900 font-medium text-lg mb-1">Nenhum cântico encontrado</p>
                <p className="text-stone-500 text-sm">Tenta ajustar os filtros ou procurar por outros termos.</p>
              </div>
            ) : (
              <>
                {/* Lista de Músicas */}
                <div className="space-y-3">
                  {paginatedSongs.map((song) => (
                    <div
                      key={song.id}
                      className="group rounded-xl border border-stone-200 bg-white p-4 sm:p-5 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Icon/Avatar */}
                        <div className="shrink-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-stone-50 rounded-lg flex items-center justify-center border border-stone-200">
                            <Music className="h-5 w-5 sm:h-6 sm:w-6 text-rose-600" />
                          </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base sm:text-lg font-semibold text-stone-900 group-hover:text-rose-700 transition-colors leading-tight">
                                <Link
                                  href={`/musics/${song.slug || song.id}`}
                                  className="hover:underline"
                                  onClick={() => handleNavigateToSong(song.slug || song.id)}
                                >
                                  {song.title}
                                </Link>
                              </h3>
                              <p className="text-xs text-stone-500 mt-1">{getInstrumentLabel(song.mainInstrument)}</p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 sm:gap-2 sm:ml-4">
                              <StarButton
                                songId={song.id}
                                size="sm"
                                initialStarCount={song.starCount}
                                initialIsStarred={song.isStarred}
                              />
                              <AddToPlaylistButton songId={song.id} size="sm" />
                              <Link
                                href={`/musics/${song.slug || song.id}`}
                                onClick={() => handleNavigateToSong(song.slug || song.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                              >
                                <span className="hidden sm:inline">Ver Cântico</span>
                                <span className="sm:hidden">Ver</span>
                              </Link>
                            </div>
                          </div>

                          {/* Info Section */}
                          <div className="space-y-3">
                            {/* Momentos */}
                            <div>
                              {(song.moments || []).length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {(song.moments || []).slice(0, 4).map((moment, momentIndex) => (
                                    <span
                                      key={`${song.id}-moment-${momentIndex}`}
                                      className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-700"
                                    >
                                      {getMomentDisplayName(moment)}
                                    </span>
                                  ))}
                                  {(song.moments || []).length > 4 && (
                                    <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-700">
                                      +{(song.moments || []).length - 4}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-stone-500 italic">
                                  Sem momentos encontrados
                                </span>
                              )}
                            </div>

                            {/* Tags */}
                            <div>
                              {(song.tags || []).length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {(song.tags || []).slice(0, 5).map((tag, tagIndex) => (
                                    <span
                                      key={`${song.id}-tag-${tagIndex}`}
                                      className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 border border-rose-100"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                  {(song.tags || []).length > 5 && (
                                    <span className="inline-flex items-center rounded-full border border-stone-200 px-2.5 py-1 text-xs text-stone-500">
                                      +{(song.tags || []).length - 5}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-stone-500 italic">
                                  Sem tags encontradas
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginação melhorada: First / Prev / Página atual / Jump / Next / Last */}
                {totalPages > 1 && (
                  <div className="mt-6 sm:mt-8 flex justify-center px-4">
                    <div className="flex items-center gap-2 max-w-full overflow-hidden">
                      {/* shadcn Pagination only - removed extra First/Previous buttons */}

                      {/* Numeric window with ellipsis when many pages */}
                      <div className="flex items-center gap-1 mx-1 sm:mx-2 overflow-x-auto">
                        {/* shadcn pagination component */}
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() => {
                                  if (currentPage === 1) return; // guard: do nothing when already at first page
                                  const newPage = Math.max(currentPage - 1, 1);
                                  trackEvent('musics_pagination_changed', { toPage: newPage, source: 'previous' });
                                  setCurrentPage(newPage);
                                  if (saveState) saveState({ ...state, currentPage: newPage, scrollPosition: 0 });
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                aria-disabled={currentPage === 1}
                              />
                            </PaginationItem>

                            {(() => {
                              const pages: (number | 'left-ellipsis' | 'right-ellipsis')[] = [];
                              const maxWindow = 7;
                              if (totalPages <= maxWindow) {
                                for (let i = 1; i <= totalPages; i++) pages.push(i);
                              } else {
                                pages.push(1);
                                const left = Math.max(2, currentPage - 2);
                                const right = Math.min(totalPages - 1, currentPage + 2);
                                if (left > 2) pages.push('left-ellipsis');
                                for (let p = left; p <= right; p++) pages.push(p);
                                if (right < totalPages - 1) pages.push('right-ellipsis');
                                pages.push(totalPages);
                              }
                              return pages.map((p, idx) => {
                                if (p === 'left-ellipsis' || p === 'right-ellipsis') {
                                  const isLeft = p === 'left-ellipsis';
                                  const target = isLeft ? Math.max(2, currentPage - 3) : Math.min(totalPages - 1, currentPage + 3);
                                  return (
                                    <PaginationItem key={`ellipsis-${idx}`}>
                                      <PaginationEllipsis
                                        onClick={() => {
                                          trackEvent('musics_pagination_changed', { toPage: target, source: isLeft ? 'ellipsis_left' : 'ellipsis_right' });
                                          setCurrentPage(target);
                                          if (saveState) saveState({ ...state, currentPage: target, scrollPosition: 0 });
                                          window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                      />
                                    </PaginationItem>
                                  );
                                }
                                if (typeof p === 'number') {
                                  const pageNum = p;
                                  const isActive = pageNum === currentPage;
                                  return (
                                    <PaginationItem key={`page-${p}`}>
                                      <PaginationLink
                                        isActive={isActive}
                                        onClick={() => {
                                          trackEvent('musics_pagination_changed', { toPage: pageNum, source: 'page_number' });
                                          setCurrentPage(pageNum);
                                          if (saveState) saveState({ ...state, currentPage: pageNum, scrollPosition: 0 });
                                          window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                      >
                                        {pageNum}
                                      </PaginationLink>
                                    </PaginationItem>
                                  );
                                }
                                return null;
                              });
                            })()}

                            <PaginationItem>
                              <PaginationNext
                                onClick={() => {
                                  if (currentPage === totalPages) return; // guard: do nothing when already at last page
                                  const newPage = Math.min(currentPage + 1, totalPages);
                                  trackEvent('musics_pagination_changed', { toPage: newPage, source: 'next' });
                                  setCurrentPage(newPage);
                                  if (saveState) saveState({ ...state, currentPage: newPage, scrollPosition: 0 });
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                aria-disabled={currentPage === totalPages}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>

                      {/* removed jump-to-page input (using shadcn pagination controls) */}

                      {/* removed Last button - shadcn Pagination handles navigation */}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
