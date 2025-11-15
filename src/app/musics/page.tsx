'use client';

import { useEffect, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LiturgicalMoment, getInstrumentLabel, getLiturgicalMomentLabel } from '@/lib/constants';
import { Separator } from '@/components/ui/separator';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import removeAccents from 'remove-accents';
import Link from 'next/link';
import { Search, Filter, Tags, ArrowDownAZ, Music, ChevronLeft, ChevronRight, X, SlidersHorizontal, Menu, RefreshCw, Clock, ChevronsLeft, ChevronsRight } from 'lucide-react';
import BannerDisplay from '@/components/BannerDisplay';
import StarButton from '@/components/StarButton';
import AddToPlaylistButton from '@/components/AddToPlaylistButton';
import { MusicListSkeleton } from '@/components/MusicListSkeleton';
import { toast } from 'sonner';
import { usePageState } from '@/hooks/usePageState';
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
];

type Song = {
  id: string;
  title: string;
  slug: string;
  moments: string[];
  tags: string[];
  mainInstrument: string;
};

export default function MusicsPage() {
  // Estados principais
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false); // Flag para evitar múltiplas cargas
  
  // Use page state hook para manter estado entre navegações
  const { state, saveState, restoreScrollPosition, saveScrollPosition, isInitialized } = usePageState('musics');
  
  console.log('🎵 MusicPage render (simplified):', { 
    dataLoaded, 
    loading, 
    songsLength: songs.length, 
    timestamp: new Date().toISOString() 
  });  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMoment, setSelectedMoment] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPageInput, setJumpPageInput] = useState('');

  const itemsPerPage = 12;
  const totalPages = Math.ceil((filteredSongs || []).length / itemsPerPage);

  // Função para carregar dados (com cache simples) - sem useCallback
  const loadMusicData = async (forceRefresh = false) => {
    // Evitar múltiplas cargas simultâneas apenas se já temos dados
    if (loading && !forceRefresh && dataLoaded) {
      console.log('Carregamento já em andamento e dados já carregados, pulando...');
      return;
    }
    
    const cacheKey = 'musicList_data';
    const cacheTimeKey = 'musicList_timestamp';
    const cacheExpiry = 5 * 60 * 1000; // 5 minutos - dados mais frescos

    console.log('Iniciando carregamento de dados...', { 
      forceRefresh, 
      currentlyLoading: loading, 
      dataLoaded,
      hasCache: !!sessionStorage.getItem('musicList_data')
    });

    try {
      setLoading(true);
      
      // Verificar cache se não for refresh forçado
      if (!forceRefresh && typeof window !== 'undefined') {
        const cachedData = sessionStorage.getItem(cacheKey);
        const cacheTime = sessionStorage.getItem(cacheTimeKey);
        
        if (cachedData && cacheTime) {
          const isExpired = Date.now() - parseInt(cacheTime) > cacheExpiry;
          
          if (!isExpired) {
            try {
              const parsedData = JSON.parse(cachedData);
              setSongs(parsedData.songs || []);
              setDataLoaded(true);
              console.log('Cache: Dados carregados do cache', { 
                totalSongs: parsedData.songs?.length || 0,
                source: 'cache',
                timestamp: new Date().toISOString()
              });
              setLoading(false);
              return;
            } catch (parseError) {
              console.warn('Erro ao fazer parse do cache:', parseError);
              // Continue para buscar da API
            }
          }
        }
      }

      // Buscar dados da API com timeout
      console.log('Fazendo fetch da API...');
      
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
      
      // Salvar no cache
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
          sessionStorage.setItem(cacheTimeKey, Date.now().toString());
        } catch (storageError) {
          console.warn('Erro ao salvar no cache:', storageError);
        }
      }
      
      console.log('Cache: Dados carregados da API', { 
        totalSongs: data.songs?.length || 0,
        source: 'api',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Erro ao carregar músicas:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error('Timeout: A requisição demorou muito tempo. Tente novamente.');
      } else {
        toast.error('Erro ao carregar as músicas. Tente novamente.');
      }
      
      setDataLoaded(true); // Marcar como tentado mesmo com erro para evitar loops
    } finally {
      console.log('Finalizando carregamento...');
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

  // Carregar dados iniciais - sempre buscar dados frescos na primeira carga
  useEffect(() => {
    console.log('🔄 useEffect para carregar dados:', { isInitialized, dataLoaded });
    if (isInitialized && !dataLoaded) {
      console.log('✅ Executando loadMusicData...');
      
      // Verificar se é uma nova sessão (sessionStorage vazio = nova aba/navegador)
      const isNewSession = !sessionStorage.getItem('musicList_data');
      if (isNewSession) {
        console.log('🆕 Nova sessão detectada - forçar refresh dos dados');
        loadMusicData(true); // Forçar refresh para nova sessão
      } else {
        loadMusicData(); // Usar cache se disponível
      }
    }
  }, [isInitialized, dataLoaded]);

  // Restaurar posição do scroll - apenas uma vez após carregar dados
  useEffect(() => {
    if (isInitialized && songs.length > 0 && state?.scrollPosition > 0) {
      const timer = setTimeout(() => {
        console.log('🔄 Restaurando scroll para posição:', state.scrollPosition);
        window.scrollTo({ top: state.scrollPosition, behavior: 'auto' });
      }, 300); // Aumentar delay para garantir que a página renderizou
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
      {/* Search */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Pesquisar</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
            placeholder="Nome do cântico..."
            className="pl-10 h-9"
          />
        </div>
      </div>

      {/* Momento Litúrgico */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Momento Litúrgico</Label>
        <Select
          onValueChange={(v) => {
            const newValue = v === 'ALL' ? null : v;
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
        <Label className="text-sm font-medium text-foreground">Tags</Label>
        <div className="relative">
          <Tags className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
        <Label className="text-sm font-medium text-foreground">Ordenação</Label>
        <Select
          onValueChange={(v) => {
            const newValue = v as 'asc' | 'desc';
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
        <Button
          variant="outline"
          onClick={clearFilters}
          className="w-full h-9"
        >
          <X className="h-4 w-4 mr-2" />
          Limpar filtros
        </Button>
      )}

      {/* Results Count */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-center gap-2">
          <div className="p-1 bg-muted rounded">
            <Music className="h-3 w-3 text-muted-foreground" />
          </div>
            <p className="text-sm text-muted-foreground">
            {loading ? (<><span className="sr-only">A carregar...</span><span aria-hidden data-nosnippet>A carregar...</span></>) : (
              <>
                <span className="font-medium text-foreground">{filteredSongs.length}</span>
                {' '}cânticos
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );

  const paginatedSongs = (filteredSongs || []).slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section com estilo da landing page */}
      <section className="relative bg-white">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/2 top-0 -translate-x-1/2">
            <div className="h-60 w-60 rounded-full bg-gradient-to-br from-blue-50 via-white to-purple-50" />
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12 relative z-10">
          <div className="text-center mb-6 sm:mb-8 md:mb-12">
            {/* Decorative border */}
            <div className="mb-4 border-y [border-image:linear-gradient(to_right,transparent,theme(colors.slate.300/.8),transparent)1]">
              <div className="-mx-0.5 flex justify-center -space-x-2 py-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Music className="text-white text-xs w-3 h-3" />
                </div>
                <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Search className="text-white text-xs w-3 h-3" />
                </div>
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Filter className="text-white text-xs w-3 h-3" />
                </div>
              </div>
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 border-y [border-image:linear-gradient(to_right,transparent,theme(colors.slate.300/.8),transparent)1] leading-tight">
              Biblioteca de Cânticos
            </h1>
            <p className="text-base sm:text-lg text-gray-700 max-w-2xl mx-auto px-4">
              Explora todos os nossos cânticos!
            </p>

            {/* Refresh Button */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  loadMusicData(true);
                  toast.success('Dados atualizados!');
                }}
                className="flex items-center gap-2"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Atualizando...' : 'Atualizar'}
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Main Content */}
      <section className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
          {/* Mobile Filter Button */}
          <div className="lg:hidden mb-4">
            <Dialog open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filtros
                  {(searchTerm || selectedMoment || tagFilter) && (
                    <Badge variant="secondary" className="ml-auto">
                      {[searchTerm, selectedMoment, tagFilter].filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
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

          <div className="flex gap-6 lg:gap-8">
            {/* Desktop Sidebar - Filtros */}
            <aside className="hidden lg:block w-80 flex-shrink-0">
              <div className="sticky top-8 space-y-6">
                <Card className="border border-border shadow-sm bg-background">
                  <CardHeader className="pb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-md">
                        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-base font-medium text-foreground">Filtros</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    {renderFilterContent()}
                  </CardContent>
                </Card>
                
                {/* Sidebar Ad removed */}
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              {loading ? (
                <MusicListSkeleton />
              ) : paginatedSongs.length === 0 ? (
                <Card className="text-center py-16 border border-border">
                  <CardContent>
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Music className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-lg mb-2 text-foreground font-medium">Nenhum cântico encontrado</CardTitle>
                    <CardDescription className="text-muted-foreground max-w-md mx-auto text-sm">
                      Tenta ajustar os filtros ou procurar por outros termos.
                    </CardDescription>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Top Banner Ad removed */}
                  
                  {/* Lista de Músicas */}
                  <div className="space-y-3">
                    {paginatedSongs.map((song) => (
                      <Card
                        key={song.id}
                        className="group hover:shadow-md transition-all duration-200 border border-border bg-card"
                      >
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex items-start gap-3 sm:gap-4">
                            {/* Icon/Avatar */}
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center border border-border">
                                <Music className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                              </div>
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 min-w-0">
                              {/* Header */}
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                                    <Link 
                                      href={`/musics/${song.slug || song.id}`}
                                      className="hover:underline"
                                      onClick={() => handleNavigateToSong(song.slug || song.id)}
                                    >
                                      {song.title}
                                    </Link>
                                  </h3>
                                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full"></span>
                                    {getInstrumentLabel(song.mainInstrument)}
                                  </p>
                                </div>
                                
                                {/* Actions */}
                                <div className="flex items-center gap-1.5 sm:gap-2 sm:ml-4">
                                  <StarButton songId={song.id} size="sm" />
                                  <AddToPlaylistButton songId={song.id} size="sm" />
                                  <Button 
                                    asChild 
                                    variant="outline"
                                    size="sm"
                                    className="h-7 sm:h-8 text-xs px-2 sm:px-3"
                                  >
                                    <Link 
                                      href={`/musics/${song.slug || song.id}`}
                                      onClick={() => handleNavigateToSong(song.slug || song.id)}
                                    >
                                      <span className="hidden sm:inline">Ver Cântico</span>
                                      <span className="sm:hidden">Ver</span>
                                    </Link>
                                  </Button>
                                </div>
                              </div>

                              {/* Info Section */}
                              <div className="space-y-3">
                                {/* Momentos */}
                                <div>
                                  {(song.moments || []).length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {(song.moments || []).slice(0, 4).map((moment, momentIndex) => (
                                        <Badge 
                                          key={`${song.id}-moment-${momentIndex}`} 
                                          variant="secondary"
                                          className="text-xs h-6 px-2.5 bg-secondary/80"
                                        >
                                          {getMomentDisplayName(moment)}
                                        </Badge>
                                      ))}
                                      {(song.moments || []).length > 4 && (
                                        <Badge 
                                          variant="outline" 
                                          className="text-xs h-6 px-2.5"
                                        >
                                          +{(song.moments || []).length - 4}
                                        </Badge>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic">
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
                                          className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary border border-primary/20"
                                        >
                                          #{tag}
                                        </span>
                                      ))}
                                      {(song.tags || []).length > 5 && (
                                        <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                                          +{(song.tags || []).length - 5}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic">
                                      Sem tags encontradas
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Bottom Banner Ad removed */}

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
            </main>
          </div>
        </div>
      </section>
    </main>
  );
}