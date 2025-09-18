'use client';

import { useEffect, useState } from 'react';
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
import { Separator } from '@/components/ui/separator';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import removeAccents from 'remove-accents';
import Link from 'next/link';
import { Search, Filter, Tags, ArrowDownAZ, Music, ChevronLeft, ChevronRight, X, SlidersHorizontal, Menu } from 'lucide-react';
import BannerDisplay from '@/components/BannerDisplay';
import StarButton from '@/components/StarButton';
import AddToPlaylistButton from '@/components/AddToPlaylistButton';
import { MusicListSkeleton } from '@/components/MusicListSkeleton';
import { toast } from 'sonner';

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
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMoment, setSelectedMoment] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const itemsPerPage = 12;
  const totalPages = Math.ceil((filteredSongs || []).length / itemsPerPage);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/musics/getmusics');
        
        if (!res.ok) {
          throw new Error('Erro ao carregar músicas do servidor');
        }
        
        const data = await res.json();
        setSongs(data.songs || []);
      } catch (error) {
        console.error('Erro ao carregar músicas:', error);
        toast.error('Erro ao carregar as músicas. Tenta recarregar a página.');
      } finally {
        setLoading(false);
      }
    };
    fetchSongs();
  }, []);

  useEffect(() => {
    const filtered = songs
      .filter((song) => {
        const titleMatch = removeAccents(song.title.toLowerCase()).includes(
          removeAccents(searchTerm.toLowerCase())
        );
        const momentMatch = selectedMoment
          ? (song.moments || []).includes(selectedMoment)
          : true;
        const tagMatch = tagFilter
          ? (song.tags || []).some((tag) =>
              removeAccents(tag.toLowerCase()).includes(
                removeAccents(tagFilter.toLowerCase())
              )
            )
          : true;
        return titleMatch && momentMatch && tagMatch;
      })
      .sort((a, b) =>
        sortOrder === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title)
      );

    setFilteredSongs(filtered);
    setCurrentPage(1);
  }, [searchTerm, selectedMoment, tagFilter, sortOrder, songs]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedMoment(null);
    setTagFilter('');
    setIsMobileFiltersOpen(false);
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
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nome do cântico..."
            className="pl-10 h-9"
          />
        </div>
      </div>

      {/* Momento Litúrgico */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Momento Litúrgico</Label>
        <Select
          onValueChange={(v) => setSelectedMoment(v === 'ALL' ? null : v)}
          value={selectedMoment ?? 'ALL'}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todos os momentos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os momentos</SelectItem>
            {allMoments.map((moment) => (
              <SelectItem key={moment} value={moment}>
                {moment.replaceAll('_', ' ')}
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
            onChange={(e) => setTagFilter(e.target.value)}
            placeholder="Ex: mariana, juvenil..."
            className="pl-10 h-9"
          />
        </div>
      </div>

      {/* Ordenação */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Ordenação</Label>
        <Select
          onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}
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
            {loading ? 'A carregar...' : (
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
      {/* Banners */}
      <BannerDisplay page="MUSICS" />
      
      {/* Hero Section com estilo da landing page */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-10">
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
              <div className="sticky top-8">
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
                                    >
                                      {song.title}
                                    </Link>
                                  </h3>
                                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full"></span>
                                    {song.mainInstrument}
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
                                  {(song.moments || []).length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {(song.moments || []).slice(0, 4).map((moment, momentIndex) => (
                                        <Badge 
                                          key={`${song.id}-moment-${momentIndex}`} 
                                          variant="secondary"
                                          className="text-xs h-6 px-2.5 bg-secondary/80"
                                        >
                                          {moment.replaceAll('_', ' ')}
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

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="mt-6 sm:mt-8 flex justify-center px-4">
                      <div className="flex items-center gap-1 max-w-full overflow-hidden">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                          disabled={currentPage === 1}
                          className="h-8 sm:h-9 px-2 sm:px-3 flex-shrink-0"
                        >
                          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline ml-1">Anterior</span>
                        </Button>
                        
                        <div className="flex gap-1 mx-1 sm:mx-2 overflow-x-auto">
                          {[...Array(Math.min(totalPages, 3))].map((_, i) => {
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
                                className="w-8 h-8 sm:w-9 sm:h-9 p-0 text-xs sm:text-sm flex-shrink-0"
                              >
                                {page}
                              </Button>
                            );
                          })}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="h-8 sm:h-9 px-2 sm:px-3 flex-shrink-0"
                        >
                          <span className="hidden sm:inline mr-1">Seguinte</span>
                          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
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