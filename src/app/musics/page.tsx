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
import removeAccents from 'remove-accents';
import Link from 'next/link';
import { Search, Filter, Tags, ArrowDownAZ, Music, ChevronLeft, ChevronRight, Grid3X3, List, LayoutGrid } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const itemsPerPage = 15;
  const totalPages = Math.ceil(filteredSongs.length / itemsPerPage);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/musics/getmusics');
        
        if (!res.ok) {
          throw new Error('Erro ao carregar músicas do servidor');
        }
        
        const data = await res.json();
        setSongs(data);
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
          ? song.moments.includes(selectedMoment)
          : true;
        const tagMatch = tagFilter
          ? song.tags.some((tag) =>
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

  const paginatedSongs = filteredSongs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Banners */}
      <BannerDisplay page="MUSICS" />
      
      {/* Header */}
      <section className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Music className="h-8 w-8 text-blue-600" />
                </div>
                Músicas
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Explora o nosso cancioneiro com filtros e pesquisa avançada.
              </p>
            </div>
            
            {/* View Toggle */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 w-8 p-0"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros de Pesquisa
              </CardTitle>
              <CardDescription>
                Usa os filtros abaixo para encontrar exatamente o que procuras
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Search className="h-4 w-4" /> Pesquisar título
                  </Label>
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Ex: Deus está aqui"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Filter className="h-4 w-4" /> Momento litúrgico
                  </Label>
                  <Select
                    onValueChange={(v) => setSelectedMoment(v === 'ALL' ? null : v)}
                    value={selectedMoment ?? 'ALL'}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Todos" />
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

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Tags className="h-4 w-4" /> Tags
                  </Label>
                  <Input
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    placeholder="Ex: mariana"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <ArrowDownAZ className="h-4 w-4" /> Ordenação
                  </Label>
                  <Select
                    onValueChange={(v: 'asc' | 'desc') => setSortOrder(v)}
                    value={sortOrder}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">A → Z</SelectItem>
                      <SelectItem value="desc">Z → A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Results Counter */}
              <Separator className="my-4" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {loading ? 'A carregar...' : `${filteredSongs.length} músicas encontradas`}
                </span>
                {(searchTerm || selectedMoment || tagFilter) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedMoment(null);
                      setTagFilter('');
                    }}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Content */}
      <section className="py-8">
        <div className="max-w-6xl mx-auto px-6">
          {loading ? (
            <MusicListSkeleton />
          ) : paginatedSongs.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Music className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <CardTitle className="mb-2">Nenhuma música encontrada</CardTitle>
                <CardDescription>
                  Tenta ajustar os filtros ou procurar por outros termos.
                </CardDescription>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedSongs.map((song) => (
                    <Card
                      key={song.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer border-0 shadow-sm"
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg line-clamp-2">
                          <Link
                            href={`/musics/${song.slug || song.id}`}
                            className="hover:text-blue-600 transition-colors"
                          >
                            {song.title}
                          </Link>
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Music className="h-4 w-4" />
                          {song.mainInstrument}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Momentos Litúrgicos */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground">
                            MOMENTOS LITÚRGICOS
                          </Label>
                          <div className="flex flex-wrap gap-1">
                            {song.moments.slice(0, 3).map((moment, momentIndex) => (
                              <Badge 
                                key={`${song.id}-moment-${momentIndex}`} 
                                variant="outline"
                                className="text-xs"
                              >
                                {moment.replaceAll('_', ' ')}
                              </Badge>
                            ))}
                            {song.moments.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{song.moments.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Tags */}
                        {song.tags.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">
                              TAGS
                            </Label>
                            <div className="flex flex-wrap gap-1">
                              {song.tags.slice(0, 3).map((tag, tagIndex) => (
                                <Badge 
                                  key={`${song.id}-tag-${tagIndex}`} 
                                  className="bg-blue-100 text-blue-800 text-xs"
                                >
                                  #{tag}
                                </Badge>
                              ))}
                              {song.tags.length > 3 && (
                                <Badge className="bg-blue-100 text-blue-800 text-xs">
                                  +{song.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <Separator />
                        
                        {/* Botões de ação */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <StarButton songId={song.id} size="sm" />
                            <AddToPlaylistButton songId={song.id} size="sm" />
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/musics/${song.slug || song.id}`}>
                              Ver detalhes
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <div className="space-y-4">
                  {paginatedSongs.map((song) => (
                    <Card
                      key={song.id}
                      className="hover:shadow-md transition-shadow border-0 shadow-sm"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-blue-100 rounded-lg">
                                <Music className="h-6 w-6 text-blue-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-semibold truncate">
                                  <Link
                                    href={`/musics/${song.slug || song.id}`}
                                    className="hover:text-blue-600 transition-colors"
                                  >
                                    {song.title}
                                  </Link>
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {song.mainInstrument}
                                </p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {song.moments.slice(0, 4).map((moment, momentIndex) => (
                                    <Badge 
                                      key={`${song.id}-moment-${momentIndex}`} 
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {moment.replaceAll('_', ' ')}
                                    </Badge>
                                  ))}
                                  {song.tags.slice(0, 3).map((tag, tagIndex) => (
                                    <Badge 
                                      key={`${song.id}-tag-${tagIndex}`} 
                                      className="bg-blue-100 text-blue-800 text-xs"
                                    >
                                      #{tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <StarButton songId={song.id} size="sm" />
                            <AddToPlaylistButton songId={song.id} size="sm" />
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/musics/${song.slug || song.id}`}>
                                Ver
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Paginação */}
              <Card className="mt-8">
                <CardContent className="p-4">
                  <div className="flex justify-center items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    
                    <div className="flex gap-1">
                      {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                        let page;
                        if (totalPages <= 5) {
                          page = i + 1;
                        } else if (currentPage <= 3) {
                          page = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          page = totalPages - 4 + i;
                        } else {
                          page = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={page}
                            size="sm"
                            variant={page === currentPage ? 'default' : 'outline'}
                            onClick={() => setCurrentPage(page)}
                            className="w-8 h-8 p-0"
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
                      className="flex items-center gap-2"
                    >
                      Seguinte
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="text-center text-sm text-muted-foreground mt-3">
                    Página {currentPage} de {totalPages} • {filteredSongs.length} músicas no total
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
