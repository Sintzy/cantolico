'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import removeAccents from 'remove-accents';
import { Clock, Heart, Music, Search, SlidersHorizontal, Star, X } from 'lucide-react';
import AddToPlaylistButton from '@/components/AddToPlaylistButton';
import StarButton from '@/components/StarButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getInstrumentLabel, getLiturgicalMomentLabel } from '@/lib/constants';

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
  { value: 'title-asc', label: 'Titulo A-Z' },
  { value: 'title-desc', label: 'Titulo Z-A' },
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
    const term = removeAccents(searchTerm.trim().toLowerCase());
    const filtered = term
      ? songs.filter((song) =>
          removeAccents(`${song.title} ${song.author}`.toLowerCase()).includes(term)
        )
      : songs;

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

  const filterContent = (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Ordenacao</Label>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="h-9 border-border bg-background">
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

      {(searchTerm || sortBy !== 'starred-desc') && (
        <Button variant="outline" onClick={clearFilters} className="h-9 w-full">
          <X className="mr-2 h-4 w-4" />
          Limpar filtros
        </Button>
      )}

      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Star className="h-3.5 w-3.5 text-amber-500" />
          <span>
            <span className="font-medium text-foreground">{filteredSongs.length}</span>{' '}
            favorita{filteredSongs.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-background pt-24 pb-10">
        <div className="mx-auto max-w-screen-xl px-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="text-sm leading-none text-rose-700">+ </span>
            <span className="h-px w-6 bg-border" />
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Biblioteca pessoal
            </span>
          </div>
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-display text-[clamp(2.4rem,5vw,4.4rem)] leading-none text-foreground">
                Musicas Favoritas
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
                Os canticos que guardaste para voltar a encontrar rapidamente.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <Star className="h-4 w-4 fill-current" />
              </div>
              <div>
                <p className="text-2xl font-semibold leading-none">{songs.length}</p>
                <p className="text-xs text-muted-foreground">favoritas</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-screen-xl gap-8 px-5 py-8 lg:grid-cols-[280px_1fr] lg:py-10">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar cantico..."
                className="h-10 border-border bg-card pl-10"
              />
            </div>
            <Card className="border-border bg-card shadow-none">
              <div className="border-b border-border px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-semibold text-card-foreground">Filtros</span>
                </div>
              </div>
              <CardContent className="px-5 py-5">{filterContent}</CardContent>
            </Card>
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <div className="grid gap-3 lg:hidden">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar cantico..."
                className="h-10 border-border bg-card pl-10"
              />
            </div>
            <Dialog open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Filtros
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Filtros</DialogTitle>
                </DialogHeader>
                {filterContent}
              </DialogContent>
            </Dialog>
          </div>

          {paginatedSongs.length === 0 ? (
            <Card className="border-border bg-card text-center shadow-none">
              <CardContent className="px-6 py-16">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Star className="h-6 w-6 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold">
                  {searchTerm ? 'Nenhuma musica encontrada' : 'Nenhuma musica favorita'}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  {searchTerm
                    ? 'Tenta ajustar a pesquisa ou limpar os filtros.'
                    : 'Explora a biblioteca e guarda os canticos que usas mais vezes.'}
                </p>
                <Button asChild className="mt-5">
                  <Link href="/musics">
                    <Music className="mr-2 h-4 w-4" />
                    Explorar canticos
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {paginatedSongs.map((song) => (
                <Card key={song.id} className="group border-border bg-card shadow-none transition-colors hover:border-rose-700/30">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-500">
                        <Star className="h-5 w-5 fill-current" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="text-lg font-semibold leading-tight text-card-foreground transition-colors group-hover:text-rose-700">
                              <Link href={`/musics/${song.slug || song.id}`}>{song.title}</Link>
                            </h3>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                {getInstrumentLabel(song.mainInstrument)}
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <Clock className="h-3 w-3" />
                                Guardada em {formatDate(song.starredAt)}
                              </span>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <StarButton
                              songId={song.id}
                              size="sm"
                              initialStarCount={song.starCount}
                              initialIsStarred
                            />
                            <AddToPlaylistButton songId={song.id} size="sm" />
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {song.moments.slice(0, 4).map((moment, i) => (
                            <Badge key={`${song.id}-moment-${i}`} variant="secondary" className="font-medium">
                              {getLiturgicalMomentLabel(moment)}
                            </Badge>
                          ))}
                          {song.moments.length > 4 && (
                            <Badge variant="outline">+{song.moments.length - 4}</Badge>
                          )}
                        </div>

                        {song.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {song.tags.slice(0, 5).map((tag, i) => {
                              const cleanTag = tag.replace(/{|}/g, '');
                              return (
                                <span
                                  key={`${song.id}-tag-${i}`}
                                  className="inline-flex items-center rounded-full border border-rose-700/15 bg-rose-700/10 px-2.5 py-1 text-xs font-medium text-rose-700 dark:text-rose-300"
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
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="pt-4">
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

                  {buildPagination(totalPages, currentPage).map((page, index) =>
                    page === 'ellipsis' ? (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={page === currentPage}
                          onClick={() => {
                            setCurrentPage(page);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}

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
        </div>
      </section>
    </main>
  );
}

function buildPagination(totalPages: number, currentPage: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | 'ellipsis'> = [1];
  const left = Math.max(2, currentPage - 2);
  const right = Math.min(totalPages - 1, currentPage + 2);

  if (left > 2) pages.push('ellipsis');
  for (let page = left; page <= right; page++) pages.push(page);
  if (right < totalPages - 1) pages.push('ellipsis');
  pages.push(totalPages);

  return pages;
}
