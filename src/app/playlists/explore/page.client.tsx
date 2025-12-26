
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Globe, 
  Music,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  userId: number;
  createdAt: string;
  updatedAt: string;
  User: {
    id: number;
    name: string;
    image?: string;
  };
  songsCount?: number;
}

const ITEMS_PER_PAGE = 12;

interface ExplorePlaylistsClientProps {
  initialPlaylists: Playlist[];
}

export default function ExplorePlaylistsClient({ initialPlaylists }: ExplorePlaylistsClientProps) {
  // Ensure initialPlaylists is always an array
  const safeInitialPlaylists = Array.isArray(initialPlaylists) ? initialPlaylists : [];
  
  const [playlists, setPlaylists] = useState<Playlist[]>(safeInitialPlaylists);
  const [filteredPlaylists, setFilteredPlaylists] = useState<Playlist[]>(safeInitialPlaylists);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('updated');
  const [currentPage, setCurrentPage] = useState(1);

  // Dados já carregados do servidor - não precisa de fetch useEffect

  // Filter and sort playlists
  useEffect(() => {
    let filtered = [...playlists];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(playlist =>
        playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        playlist.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        playlist.User.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'songs':
          return (b.songsCount || 0) - (a.songsCount || 0);
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'updated':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    setFilteredPlaylists(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [playlists, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredPlaylists.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPlaylists = filteredPlaylists.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Explorar Playlists</h1>
              <p className="text-gray-600 mt-1">Descobre playlists públicas da comunidade</p>
            </div>
            <Badge variant="secondary" className="self-start">
              {filteredPlaylists.length} playlist{filteredPlaylists.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Pesquisar por nome, descrição ou autor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Mais recente</SelectItem>
                <SelectItem value="created">Mais antiga</SelectItem>
                <SelectItem value="name">Nome A-Z</SelectItem>
                <SelectItem value="songs">Mais músicas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-900"></div>
              <span className="sr-only">A carregar...</span><span aria-hidden data-nosnippet className="text-gray-600">A carregar...</span>
            </div>
          </div>
        ) : filteredPlaylists.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? 'Nenhuma playlist encontrada' : 'Nenhuma playlist pública'}
            </h2>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? 'Tenta outro termo de pesquisa' 
                : 'Ainda não há playlists públicas disponíveis'
              }
            </p>
          </div>
        ) : (
          <>
            {/* Playlists Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-8">
              {paginatedPlaylists.map((playlist) => (
                <Card key={playlist.id} className="hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                  <Link href={`/playlists/${playlist.id}`} className="block">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <Globe className="w-5 h-5 text-green-600" />
                        <Badge variant="outline" className="text-xs">Pública</Badge>
                      </div>
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {playlist.name}
                      </CardTitle>
                      {playlist.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                          {playlist.description}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-500">
                          <User className="w-4 h-4 mr-1" />
                          <span className="truncate">{playlist.User.name}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center">
                            <Music className="w-3 h-3 mr-1" />
                            <span>{playlist.songsCount || 0} música{(playlist.songsCount || 0) !== 1 ? 's' : ''}</span>
                          </div>
                          <span>{formatDate(playlist.updatedAt)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-10 h-10 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
