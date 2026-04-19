
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Search,
  Globe,
  Music,
  User,
  ChevronLeft,
  ChevronRight,
  ArrowLeft
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
    <div className="relative w-full min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-stone-100 bg-white pt-20 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          <Link href="/playlists" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition-colors mb-6">
            <ArrowLeft className="h-3.5 w-3.5" /> Playlists
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-rose-700 text-sm">✝</span>
            <span className="h-px w-6 bg-stone-300" />
            <span className="text-xs font-medium tracking-[0.18em] text-stone-400 uppercase">Coleções de Cânticos</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <h1 className="font-display text-4xl sm:text-5xl text-stone-900 leading-tight">
              Playlists Públicas
            </h1>
            <Badge variant="secondary" className="self-start sm:self-auto">
              {filteredPlaylists.length} playlist{filteredPlaylists.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Pesquisar por nome, descrição ou autor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-stone-200 bg-white rounded-lg text-stone-900 placeholder:text-stone-400 h-9"
            />
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48 border-stone-200 bg-white rounded-lg text-stone-900 h-9">
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

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-stone-300 border-t-stone-900"></div>
              <span className="sr-only">A carregar...</span><span aria-hidden data-nosnippet className="text-stone-500">A carregar...</span>
            </div>
          </div>
        ) : filteredPlaylists.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-stone-200">
            <Globe className="h-10 w-10 mx-auto mb-3 text-stone-200" />
            <p className="text-base font-semibold text-stone-900 mb-1">Nenhuma playlist pública</p>
            <p className="text-sm text-stone-500">Ainda não existem playlists públicas disponíveis.</p>
          </div>
        ) : (
          <>
            {/* Playlists Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-8">
              {paginatedPlaylists.map((playlist) => (
                <Link
                  key={playlist.id}
                  href={`/playlists/${playlist.id}`}
                  className="group block rounded-xl border border-stone-200 bg-white hover:shadow-sm transition-all duration-200 p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <Globe className="w-5 h-5 text-rose-700" />
                    <Badge variant="outline" className="text-xs border-stone-200 text-stone-500">Pública</Badge>
                  </div>
                  <h2 className="text-base font-semibold text-stone-900 line-clamp-2 mb-1 group-hover:text-rose-700 transition-colors">
                    {playlist.name}
                  </h2>
                  {playlist.description && (
                    <p className="text-sm text-stone-500 line-clamp-2 mb-3">
                      {playlist.description}
                    </p>
                  )}
                  <div className="space-y-1.5 mt-auto pt-2">
                    <div className="flex items-center text-sm text-stone-500">
                      <User className="w-4 h-4 mr-1.5 shrink-0" />
                      <span className="truncate">{playlist.User.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <div className="flex items-center">
                        <Music className="w-3 h-3 mr-1" />
                        <span>{playlist.songsCount || 0} música{(playlist.songsCount || 0) !== 1 ? 's' : ''}</span>
                      </div>
                      <span>{formatDate(playlist.updatedAt)}</span>
                    </div>
                  </div>
                </Link>
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
                  className="border-stone-200 text-stone-700 hover:bg-stone-50 disabled:text-stone-300 disabled:border-stone-100"
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
                        className={`w-10 h-10 p-0 ${currentPage !== pageNum ? 'border-stone-200 text-stone-700 hover:bg-stone-50' : ''}`}
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
                  className="border-stone-200 text-stone-700 hover:bg-stone-50 disabled:text-stone-300 disabled:border-stone-100"
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
