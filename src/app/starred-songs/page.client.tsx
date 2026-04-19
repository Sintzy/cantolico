'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { Star, Music, Search, X, SlidersHorizontal, Clock } from 'lucide-react';
import StarButton from '@/components/StarButton';
import AddToPlaylistButton from '@/components/AddToPlaylistButton';
import removeAccents from 'remove-accents';
import { getInstrumentLabel, getLiturgicalMomentLabel } from '@/lib/constants';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';

interface StarredSong {
  id: string;
  title: string;
  slug: string;
  author: string;
  mainInstrument: string;
  moments: string[];
  tags: string[];
  starredAt: string;
  starCount: number;
}

type SortOption = 'starred-desc' | 'starred-asc' | 'title-asc' | 'title-desc';

const ITEMS_PER_PAGE = 12;

const sortOptions = [
  { value: 'starred-desc', label: 'Mais recente' },
  { value: 'starred-asc', label: 'Mais antiga' },
  { value: 'title-asc', label: 'Título A-Z' },
  { value: 'title-desc', label: 'Título Z-A' },
];

interface StarredSongsClientProps {
  songs: StarredSong[];
}

export default function StarredSongsClient({ songs }: StarredSongsClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('starred-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const filteredSongs = useMemo(() => {
    let filtered = songs;

    if (searchTerm.trim()) {
      const term = removeAccents(searchTerm.toLowerCase());
      filtered = songs.filter(
        (song) =>
          removeAccents(song.title.toLowerCase()).includes(term) ||
          removeAccents(song.author.toLowerCase()).includes(term)
      );
    }

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'starred-asc':
          return new Date(a.starredAt).getTime() - new Date(b.starredAt).getTime();
        case 'starred-desc':
        default:
          return new Date(b.starredAt).getTime() - new Date(a.starredAt).getTime();
      }
    });
  }, [songs, searchTerm, sortBy]);

  const totalPages = Math.ceil(filteredSongs.length / ITEMS_PER_PAGE);
  const paginatedSongs = filteredSongs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const clearFilters = () => {
    setSearchTerm('');
    setSortBy('starred-desc');
    setCurrentPage(1);
    setIsMobileFiltersOpen(false);
  };

  const renderFilterContent = () => (
    <div className="space-y-4">
      {/* Ordenação */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Ordenação</Label>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters */}
      {(searchTerm || sortBy !== 'starred-desc') && (
        <Button variant="outline" onClick={clearFilters} className="w-full h-9">
          <X className="h-4 w-4 mr-2" />
          Limpar filtros
        </Button>
      )}

      {/* Results Count */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-center gap-2">
          <div className="p-1 bg-muted rounded">
            <Star className="h-3 w-3 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{filteredSongs.length}</span>
            {' '}favorita{filteredSongs.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <main className="flex-1 bg-white pt-2">
      {/* Hero Section */}
      <section className="relative bg-white pt-6">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/2 top-0 -translate-x-1/2">
            <div className="h-80 w-80 rounded-full bg-linear-to-br from-yellow-50 via-white to-amber-50" />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16 relative z-10">
          <div className="text-center mb-6 sm:mb-8 md:mb-12">
            <div className="mb-4 border-y [border-image:linear-gradient(to_right,transparent,--theme(--color-slate-300/.8),transparent)1]">
              <div className="-mx-0.5 flex justify-center -space-x-2 py-2">
                <div className="w-6 h-6 bg-linear-to-r from-yellow-500 to-amber-500 rounded-full flex items-center justify-center">
                  <Star className="text-white text-xs w-3 h-3" />
                </div>
                <div className="w-6 h-6 bg-linear-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Music className="text-white text-xs w-3 h-3" />
                </div>
                <div className="w-6 h-6 bg-linear-to-r from-rose-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Search className="text-white text-xs w-3 h-3" />
                </div>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 border-y [border-image:linear-gradient(to_right,transparent,--theme(--color-slate-300/.8),transparent)1] leading-tight">
              Músicas Favoritas
            </h1>
            <p className="text-base sm:text-lg text-gray-700 max-w-2xl mx-auto px-4">
              As tuas músicas favoritas num só lugar.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
          {/* Mobile Search Bar */}
          <div className="lg:hidden mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar cântico..."
                className="pl-10 h-10 w-full"
              />
            </div>
          </div>

          {/* Mobile Filter Button */}
          <div className="lg:hidden mb-4">
            <Dialog open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filtros
                  {sortBy !== 'starred-desc' && (
                    <Badge variant="secondary" className="ml-auto">1</Badge>
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
                <div className="mt-6">{renderFilterContent()}</div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex gap-6 lg:gap-8">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-80 shrink-0">
              <div className="sticky top-8 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Pesquisar cântico..."
                    className="pl-10 h-10 w-full"
                  />
                </div>

                <Card className="border border-border shadow-sm bg-background">
                  <div className="pb-4 border-b border-border p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-md">
                        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="text-base font-medium text-foreground">Filtros</span>
                    </div>
                  </div>
                  <CardContent className="space-y-4 pt-6">
                    {renderFilterContent()}
                  </CardContent>
                </Card>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              {paginatedSongs.length === 0 ? (
                <Card className="text-center py-16 border border-border">
                  <CardContent>
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Star className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-lg mb-2 text-foreground font-medium">
                      {searchTerm ? 'Nenhuma música encontrada' : 'Nenhuma música favorita'}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground max-w-md mx-auto text-sm">
                      {searchTerm
                        ? 'Tenta ajustar a tua pesquisa ou limpar os filtros.'
                        : 'Explora a biblioteca de músicas e favorita as tuas preferidas.'}
                    </CardDescription>
                    {searchTerm ? (
                      <Button onClick={() => setSearchTerm('')} className="mt-4">
                        Limpar Pesquisa
                      </Button>
                    ) : (
                      <Button asChild className="mt-4">
                        <Link href="/musics">
                          <Music className="h-4 w-4 mr-2" />
                          Explorar Músicas
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="space-y-3">
                    {paginatedSongs.map((song) => (
                      <Card
                        key={song.id}
                        className="group hover:shadow-md transition-all duration-200 border border-border bg-card"
                      >
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex items-start gap-3 sm:gap-4">
                            {/* Icon */}
                            <div className="shrink-0">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-linear-to-br from-yellow-500/10 to-amber-500/5 rounded-lg flex items-center justify-center border border-border">
                                <Star className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 fill-yellow-500" />
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
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
                                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full" />
                                    {getInstrumentLabel(song.mainInstrument)}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Favoritada em {formatDate(song.starredAt)}
                                  </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1.5 sm:gap-2 sm:ml-4">
                                  <StarButton
                                    songId={song.id}
                                    size="sm"
                                    initialStarCount={song.starCount}
                                    initialIsStarred={true}
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

                              {/* Moments & Tags */}
                              <div className="space-y-3">
                                <div>
                                  {song.moments.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {song.moments.slice(0, 4).map((moment, i) => (
                                        <Badge
                                          key={`${song.id}-moment-${i}`}
                                          variant="secondary"
                                          className="text-xs h-6 px-2.5 bg-secondary/80"
                                        >
                                          {getLiturgicalMomentLabel(moment)}
                                        </Badge>
                                      ))}
                                      {song.moments.length > 4 && (
                                        <Badge variant="outline" className="text-xs h-6 px-2.5">
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

                                <div>
                                  {song.tags.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {song.tags.slice(0, 5).map((tag, i) => {
                                      // TESTE. TENTAR RESOLVER A CENA DO {} NAS TAGS NA PAGINA DE ESTRELINAHS.
                                      // nao meter em prod
                                    const cleanTag = tag.replace(/{|}/g, '');
                                    return (
                                      <span
                                      key={`${song.id}-tag-${i}`}
                                      className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary border border-primary/20"
                                      >
                                      #{cleanTag}
                                      </span>
                                    );
                                    })}
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

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-6 sm:mt-8 flex justify-center px-4">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => {
                                if (currentPage === 1) return;
                                setCurrentPage((p) => Math.max(1, p - 1));
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
                                return (
                                  <PaginationItem key={`ellipsis-${idx}`}>
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                );
                              }
                              if (typeof p === 'number') {
                                return (
                                  <PaginationItem key={`page-${p}`}>
                                    <PaginationLink
                                      isActive={p === currentPage}
                                      onClick={() => {
                                        setCurrentPage(p);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }}
                                    >
                                      {p}
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
                                if (currentPage === totalPages) return;
                                setCurrentPage((p) => Math.min(totalPages, p + 1));
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              aria-disabled={currentPage === totalPages}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
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
