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
    <main className="min-h-screen bg-white">
      {/* Banners */}
      <BannerDisplay page="MUSICS" />
      
      {/* Hero Section com estilo da landing page */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/2 top-0 -translate-x-1/2">
            <div className="h-60 w-60 rounded-full bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-[80px]" />
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto px-6 py-8 md:py-12 relative z-10">
          <div className="text-center mb-8 md:mb-12">
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
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 border-y [border-image:linear-gradient(to_right,transparent,theme(colors.slate.300/.8),transparent)1] leading-tight">
              Biblioteca de Cânticos
            </h1>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              Explora o nosso cancioneiro com filtros e pesquisa avançada.
            </p>
          </div>
        </div>
      </section>
      
      {/* Main Content */}
      <section className="bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-6">
          {/* Filters - Redesigned */}
          <Card className="mb-8 border-0 shadow-lg backdrop-blur-sm bg-white/95">
            <CardContent className="p-6">
              <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Pesquisar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Nome do cântico..."
                      className="pl-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Momento */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Momento Litúrgico</Label>
                  <Select
                    onValueChange={(v) => setSelectedMoment(v === 'ALL' ? null : v)}
                    value={selectedMoment ?? 'ALL'}
                  >
                    <SelectTrigger className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
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
                  <Label className="text-sm font-medium text-gray-700">Tags</Label>
                  <div className="relative">
                    <Tags className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      placeholder="Ex: mariana, juvenil..."
                      className="pl-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* View and Sort */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Vista</Label>
                  <div className="flex gap-2">
                    <div className="flex bg-gray-100 rounded-lg p-1 flex-1">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="flex-1 h-9"
                      >
                        <LayoutGrid className="h-4 w-4 mr-2" />
                        Grelha
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="flex-1 h-9"
                      >
                        <List className="h-4 w-4 mr-2" />
                        Lista
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Results and Clear */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Music className="h-4 w-4" />
                  <span className="font-medium">
                    {loading ? 'A carregar...' : `${filteredSongs.length} cânticos encontrados`}
                  </span>
                </div>
                {(searchTerm || selectedMoment || tagFilter) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedMoment(null);
                      setTagFilter('');
                    }}
                    className="text-gray-600 border-gray-300 hover:bg-gray-50"
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
      <section className="bg-white py-8">
        <div className="max-w-6xl mx-auto px-6">
          {loading ? (
            <MusicListSkeleton />
          ) : paginatedSongs.length === 0 ? (
            <Card className="text-center py-16 border-0 shadow-lg">
              <CardContent>
                <div className="w-20 h-20 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Music className="h-10 w-10 text-gray-400" />
                </div>
                <CardTitle className="text-xl mb-3 text-gray-900">Nenhum cântico encontrado</CardTitle>
                <CardDescription className="text-gray-600 max-w-md mx-auto">
                  Tenta ajustar os filtros ou procurar por outros termos. 
                  Todos os cânticos estão organizados por momentos litúrgicos.
                </CardDescription>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Grid View - Redesigned */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedSongs.map((song) => (
                    <Card
                      key={song.id}
                      className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50"
                    >
                      <CardContent className="p-6">
                        {/* Header com ícone */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="p-3 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-xl text-white shadow-lg group-hover:shadow-xl transition-shadow">
                            <Music className="h-6 w-6" />
                          </div>
                          <div className="flex gap-1">
                            <StarButton songId={song.id} size="sm" />
                            <AddToPlaylistButton songId={song.id} size="sm" />
                          </div>
                        </div>

                        {/* Título */}
                        <div className="mb-4">
                          <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                            <Link href={`/musics/${song.slug || song.id}`}>
                              {song.title}
                            </Link>
                          </h3>
                          <span className="text-sm text-gray-600 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full inline-block"></span>
                            {song.mainInstrument}
                          </span>
                        </div>

                        {/* Momentos */}
                        <div className="mb-4">
                          <div className="flex flex-wrap gap-2">
                            {song.moments.slice(0, 2).map((moment, momentIndex) => (
                              <Badge 
                                key={`${song.id}-moment-${momentIndex}`} 
                                className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-medium px-2 py-1"
                              >
                                {moment.replaceAll('_', ' ')}
                              </Badge>
                            ))}
                            {song.moments.length > 2 && (
                              <Badge className="bg-gray-100 text-gray-600 text-xs">
                                +{song.moments.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Tags */}
                        {song.tags.length > 0 && (
                          <div className="mb-6">
                            <div className="flex flex-wrap gap-1">
                              {song.tags.slice(0, 3).map((tag, tagIndex) => (
                                <span 
                                  key={`${song.id}-tag-${tagIndex}`} 
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {song.tags.length > 3 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                                  +{song.tags.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Action Button */}
                        <Button 
                          asChild 
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-md hover:shadow-lg transition-all"
                        >
                          <Link href={`/musics/${song.slug || song.id}`}>
                            Ver Cântico
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* List View - Redesigned */}
              {viewMode === 'list' && (
                <div className="space-y-4">
                  {paginatedSongs.map((song) => (
                    <Card
                      key={song.id}
                      className="group hover:shadow-lg transition-all duration-300 border-0 shadow-sm hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center gap-6">
                          {/* Icon */}
                          <div className="p-4 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-xl text-white shadow-md group-hover:shadow-lg transition-shadow flex-shrink-0">
                            <Music className="h-6 w-6" />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <h3 className="text-xl font-bold text-gray-900 truncate mb-1 group-hover:text-blue-600 transition-colors">
                                  <Link href={`/musics/${song.slug || song.id}`}>
                                    {song.title}
                                  </Link>
                                </h3>
                                <span className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                                  <span className="w-2 h-2 bg-blue-500 rounded-full inline-block"></span>
                                  {song.mainInstrument}
                                </span>
                                
                                {/* Tags and Moments */}
                                <div className="flex flex-wrap gap-2">
                                  {song.moments.slice(0, 3).map((moment, momentIndex) => (
                                    <Badge 
                                      key={`${song.id}-moment-${momentIndex}`} 
                                      className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                                    >
                                      {moment.replaceAll('_', ' ')}
                                    </Badge>
                                  ))}
                                  {song.tags.slice(0, 2).map((tag, tagIndex) => (
                                    <span 
                                      key={`${song.id}-tag-${tagIndex}`} 
                                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                  {(song.moments.length > 3 || song.tags.length > 2) && (
                                    <Badge className="bg-gray-100 text-gray-600 text-xs">
                                      +{(song.moments.length > 3 ? song.moments.length - 3 : 0) + (song.tags.length > 2 ? song.tags.length - 2 : 0)}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex items-center gap-3 ml-6 flex-shrink-0">
                                <StarButton songId={song.id} size="sm" />
                                <AddToPlaylistButton songId={song.id} size="sm" />
                                <Button 
                                  asChild 
                                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                                >
                                  <Link href={`/musics/${song.slug || song.id}`}>
                                    Ver Cântico
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Paginação - Redesigned */}
              {totalPages > 1 && (
                <div className="mt-12 flex justify-center">
                  <Card className="border-0 shadow-lg backdrop-blur-sm bg-white/95">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                          disabled={currentPage === 1}
                          className="border-gray-300 hover:bg-blue-50 hover:border-blue-300"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Anterior
                        </Button>
                        
                        <div className="flex gap-1 mx-2">
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
                                className={`w-10 h-10 p-0 ${
                                  page === currentPage 
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 border-0 text-white' 
                                    : 'border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                                }`}
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
                          className="border-gray-300 hover:bg-blue-50 hover:border-blue-300"
                        >
                          Seguinte
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                      
                      <div className="text-center text-sm text-gray-500 mt-3 px-2">
                        Página <span className="font-medium text-gray-700">{currentPage}</span> de <span className="font-medium text-gray-700">{totalPages}</span> • 
                        <span className="font-medium text-gray-700"> {filteredSongs.length}</span> cânticos no total
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
