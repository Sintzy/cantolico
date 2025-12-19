'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { Star, Music, ChevronLeft, ChevronRight, Clock, Search, ArrowUpDown, RefreshCw } from 'lucide-react';
import StarButton from '@/components/StarButton';
import AddToPlaylistButton from '@/components/AddToPlaylistButton';
import { MusicListSkeleton } from '@/components/MusicListSkeleton';
import { toast } from 'sonner';
import { useCache } from '@/hooks/useCache';
import { useAppCache } from '@/components/providers/CacheProvider';
import removeAccents from 'remove-accents';
import { LiturgicalMoment, getLiturgicalMomentLabel } from '@/lib/constants';

interface StarredSong {
  id: string;
  title: string;
  slug: string;
  author: string;
  mainInstrument?: string;
  moments: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
  starred_at: string;
  starCount?: number;
  isStarred?: boolean;
  User: {
    id: string;
    name: string;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type SortOption = 'title-asc' | 'title-desc' | 'starred-desc' | 'starred-asc';

// Constantes
const SONGS_PER_PAGE = 12;

// Helper function para converter chaves do enum para valores bonitos
const getMomentDisplayName = (momentKey: string): string => {
  return getLiturgicalMomentLabel(momentKey);
};

const sortOptions = [
  { value: 'starred-desc', label: 'Favoritada mais recente' },
  { value: 'starred-asc', label: 'Favoritada mais antiga' },
  { value: 'title-asc', label: 'Título A-Z' },
  { value: 'title-desc', label: 'Título Z-A' },
];

export default function StarredSongsPage() {
  const { data: session, status } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('starred-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Use cache para músicas favoritas
  const { 
    data: starredData, 
    loading, 
    refetch: refetchStarredSongs 
  } = useCache(
    `starred-songs-${session?.user?.id}`,
    async () => {
      if (!session?.user?.id) {
        throw new Error('User not authenticated');
      }
      const response = await fetch(`/api/user/starred-songs?page=1&limit=1000`);
      if (!response.ok) {
        throw new Error('Falha ao carregar músicas favoritas');
      }
      return response.json();
    },
    {
      ttl: 5 * 60 * 1000, // 5 minutos
      persistOnRefresh: true
    }
  );

  const allSongs = starredData?.songs || [];
  const itemsPerPage = 12;

  // Log do cache no console
  useEffect(() => {
    if (starredData && !loading) {
      console.log('Cache: Músicas favoritas carregadas do cache', { 
        totalSongs: allSongs.length,
        source: 'cache',
        timestamp: new Date().toISOString()
      });
    }
  }, [starredData, loading, allSongs.length]);

  // Filtro e ordenação em memória
  const filteredAndSortedSongs = useMemo(() => {
    let filtered = allSongs;

    // Aplicar filtro de pesquisa
    if (searchTerm.trim()) {
      filtered = allSongs.filter((song: StarredSong) => 
        removeAccents(song.title.toLowerCase()).includes(
          removeAccents(searchTerm.toLowerCase())
        ) ||
        removeAccents(song.author.toLowerCase()).includes(
          removeAccents(searchTerm.toLowerCase())
        ) ||
        (song.mainInstrument && removeAccents(song.mainInstrument.toLowerCase()).includes(
          removeAccents(searchTerm.toLowerCase())
        ))
      );
    }

    // Aplicar ordenação
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'starred-desc':
          return new Date(b.starred_at).getTime() - new Date(a.starred_at).getTime();
        case 'starred-asc':
          return new Date(a.starred_at).getTime() - new Date(b.starred_at).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [allSongs, searchTerm, sortBy]);

  // Paginação local
  const paginatedSongs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedSongs.slice(startIndex, endIndex);
  }, [filteredAndSortedSongs, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedSongs.length / itemsPerPage);

  useEffect(() => {
    if (status === 'unauthenticated') {
      setError('Precisas de estar autenticado para veres as tuas músicas favoritas');
    }
  }, [status]);

  // Reset página quando filtro/ordenação mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (status === 'loading' || loading) {
    return (
      <main className="flex-1 bg-background">
        <section className="py-8 sm:py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Star className="h-8 w-8 text-yellow-500" />
                <h1 className="text-3xl font-bold text-foreground">Músicas Favoritas</h1>
              </div>
              <p className="text-muted-foreground">As tuas músicas favoritas</p>
            </div>
            <MusicListSkeleton />
          </div>
        </section>
      </main>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <main className="flex-1 bg-background">
        <section className="py-8 sm:py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Restrito</h1>
              <p className="text-muted-foreground mb-6">Precisas de estar autenticado para veres as tuas músicas favoritas.</p>
              <Link href="/login">
                <Button>Fazer Login</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 bg-background">
        <section className="py-8 sm:py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <Star className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Erro</h1>
              <p className="text-destructive mb-6">{error}</p>
              <Button onClick={() => refetchStarredSongs()}>Tentar Novamente</Button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-background">
      <section className="py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Star className="h-8 w-8 text-yellow-500" />
                <h1 className="text-3xl font-bold text-foreground">Músicas Favoritas</h1>
              </div>
              
              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchStarredSongs();
                  toast.success('Músicas favoritas atualizadas!');
                  console.log('Cache: Músicas favoritas atualizadas manualmente');
                }}
                className="flex items-center gap-2"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Atualizando...' : 'Atualizar'}
              </Button>
            </div>
            <p className="text-muted-foreground">
              {filteredAndSortedSongs.length === 0 ? 'Ainda não favoritaste nenhuma música' : 
               `${filteredAndSortedSongs.length} música${filteredAndSortedSongs.length !== 1 ? 's' : ''} favorita${filteredAndSortedSongs.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Filtros */}
          {allSongs.length > 0 && (
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              {/* Barra de Pesquisa */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Pesquisar por título, autor ou instrumento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Ordenação */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Top Banner Ad removed */}

          {/* Lista de Músicas */}
          {filteredAndSortedSongs.length === 0 && !loading ? (
            <div className="text-center py-12">
              <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {searchTerm ? 'Nenhuma música encontrada' : 'Nenhuma música favorita'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {searchTerm ? 
                  'Tenta ajustar a tua pesquisa ou limpar os filtros.' :
                  'Explora a biblioteca de músicas e favorita as tuas preferidas para as veres aqui.'
                }
              </p>
              {searchTerm ? (
                <Button onClick={() => setSearchTerm('')}>Limpar Pesquisa</Button>
              ) : (
                <Link href="/musics">
                  <Button>
                    <Music className="h-4 w-4 mr-2" />
                    Explorar Músicas
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Grid de Músicas */}
              <div className="grid gap-4 sm:gap-6">
                {paginatedSongs.map((song) => (
                  <Card
                    key={song.id}
                    className="group hover:shadow-md transition-all duration-200 border border-border bg-card"
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Icon/Avatar */}
                        <div className="shrink-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-linear-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center border border-border">
                            <Star className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
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
                                >
                                  {song.title}
                                </Link>
                              </h3>
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full"></span>
                                {song.mainInstrument || song.author}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Favoritado em {formatDate(song.starred_at)}
                              </p>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-1.5 sm:gap-2 sm:ml-4">
                              <StarButton 
                                songId={song.id} 
                                size="sm" 
                                initialStarCount={song.starCount ?? 0}
                                initialIsStarred={song.isStarred ?? true}
                              />
                              <AddToPlaylistButton songId={song.id} size="sm" />
                              <Button 
                                asChild 
                                variant="outline"
                                size="sm"
                                className="h-7 sm:h-8 text-xs px-2 sm:px-3"
                              >
                                <Link href={`/musics/${song.slug || song.id}`}>
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
                              {(Array.isArray(song.moments) && song.moments.length > 0) ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {song.moments.slice(0, 4).map((moment: string, momentIndex: number) => (
                                    <Badge 
                                      key={`${song.id}-moment-${momentIndex}`} 
                                      variant="secondary"
                                      className="text-xs h-6 px-2.5 bg-secondary/80"
                                    >
                                      {getMomentDisplayName(moment)}
                                    </Badge>
                                  ))}
                                  {song.moments.length > 4 && (
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs h-6 px-2.5"
                                    >
                                      +{song.moments.length - 4}
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
                              {(Array.isArray(song.tags) && song.tags.length > 0) ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {song.tags.slice(0, 5).map((tag: string, tagIndex: number) => (
                                    <span 
                                      key={`${song.id}-tag-${tagIndex}`} 
                                      className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary border border-primary/20"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                  {song.tags.length > 5 && (
                                    <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                                      +{song.tags.length - 5}
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

              {/* Paginação Simples */}
              {filteredAndSortedSongs.length > SONGS_PER_PAGE && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-border">
                  <div className="text-sm text-muted-foreground order-2 sm:order-1">
                    Página {currentPage} de {totalPages} ({filteredAndSortedSongs.length} música{filteredAndSortedSongs.length !== 1 ? 's' : ''})
                  </div>
                  
                  <div className="flex items-center gap-2 order-1 sm:order-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="h-8 sm:h-9 px-2 sm:px-3 shrink-0"
                    >
                      <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline ml-1">Anterior</span>
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                        let page;
                        const maxPages = 3;
                        if (totalPages <= maxPages) {
                          page = i + 1;
                        } else if (currentPage <= Math.floor(maxPages/2) + 1) {
                          page = i + 1;
                        } else if (currentPage >= totalPages - Math.floor(maxPages/2)) {
                          page = totalPages - maxPages + 1 + i;
                        } else {
                          page = currentPage - Math.floor(maxPages/2) + i;
                        }
                        
                        return (
                          <Button
                            key={page}
                            size="sm"
                            variant={page === currentPage ? 'default' : 'outline'}
                            onClick={() => setCurrentPage(page)}
                            className="w-8 h-8 sm:w-9 sm:h-9 p-0 text-xs sm:text-sm shrink-0"
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 sm:h-9 px-2 sm:px-3 shrink-0"
                    >
                      <span className="hidden sm:inline mr-1">Seguinte</span>
                      <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}