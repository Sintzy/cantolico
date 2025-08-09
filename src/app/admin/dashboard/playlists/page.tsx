'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { 
  ListMusic, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Globe,
  Lock,
  Trash2,
  Eye,
  User,
  Calendar,
  Music,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string | null;
    email: string;
  };
  _count: {
    items: number;
  };
}

interface PlaylistsResponse {
  playlists: Playlist[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export default function PlaylistsManagement() {
  const { data: session } = useSession();
  const router = useRouter();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [deletingPlaylist, setDeletingPlaylist] = useState<string | null>(null);

  useEffect(() => {
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/');
      return;
    }
    fetchPlaylists();
  }, [session, currentPage, searchTerm, visibilityFilter]);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        search: searchTerm,
        visibility: visibilityFilter === 'all' ? '' : visibilityFilter
      });

      const response = await fetch(`/api/admin/playlists?${params}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar playlists');
      }
      
      const data: PlaylistsResponse = await response.json();
      setPlaylists(data.playlists);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (error) {
      console.error('Erro ao carregar playlists:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      toast.error('Erro ao carregar playlists');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: string, playlistName: string) => {
    if (!confirm(`Tem a certeza que pretende eliminar a playlist "${playlistName}"? Esta ação é irreversível.`)) {
      return;
    }

    try {
      setDeletingPlaylist(playlistId);
      
      const response = await fetch(`/api/admin/playlists/${playlistId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao eliminar playlist');
      }

      setPlaylists(playlists.filter(playlist => playlist.id !== playlistId));
      toast.success(`Playlist "${playlistName}" foi eliminada com sucesso!`);
    } catch (error) {
      console.error('Erro ao eliminar playlist:', error);
      toast.error('Erro ao eliminar playlist');
    } finally {
      setDeletingPlaylist(null);
    }
  };

  const handleToggleVisibility = async (playlistId: string, currentVisibility: boolean) => {
    try {
      const response = await fetch(`/api/admin/playlists/${playlistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !currentVisibility }),
      });

      if (!response.ok) {
        throw new Error('Erro ao alterar visibilidade');
      }

      setPlaylists(playlists.map(playlist => 
        playlist.id === playlistId 
          ? { ...playlist, isPublic: !currentVisibility }
          : playlist
      ));

      toast.success(`Playlist tornada ${!currentVisibility ? 'pública' : 'privada'}`);
    } catch (error) {
      console.error('Erro ao alterar visibilidade:', error);
      toast.error('Erro ao alterar visibilidade da playlist');
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleVisibilityFilter = (value: string) => {
    setVisibilityFilter(value);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold">Erro ao carregar playlists</h2>
        <p className="text-gray-600">{error}</p>
        <Button onClick={fetchPlaylists} variant="outline">
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
            <ListMusic className="h-8 w-8" />
            Gestão de Playlists
          </h1>
          <p className="text-gray-600">
            Gerir playlists da comunidade ({totalCount} total)
          </p>
        </div>
        <Button onClick={fetchPlaylists} variant="outline" size="sm">
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar por nome ou descrição..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full lg:w-48">
              <Select value={visibilityFilter} onValueChange={handleVisibilityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Visibilidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="public">Públicas</SelectItem>
                  <SelectItem value="private">Privadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Playlists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {playlists.map((playlist) => (
          <Card key={playlist.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">{playlist.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge 
                      variant={playlist.isPublic ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {playlist.isPublic ? (
                        <>
                          <Globe className="h-3 w-3 mr-1" />
                          Pública
                        </>
                      ) : (
                        <>
                          <Lock className="h-3 w-3 mr-1" />
                          Privada
                        </>
                      )}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Music className="h-3 w-3 mr-1" />
                      {playlist._count.items} músicas
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {playlist.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {playlist.description}
                </p>
              )}
              
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{playlist.user.name || playlist.user.email}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Criada em {new Date(playlist.createdAt).toLocaleDateString('pt-PT')}</span>
                </div>
                {playlist.updatedAt !== playlist.createdAt && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Atualizada em {new Date(playlist.updatedAt).toLocaleDateString('pt-PT')}</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 pt-2 border-t">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href={`/playlists/${playlist.id}`} target="_blank">
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Link>
                </Button>
                
                <Button
                  onClick={() => handleToggleVisibility(playlist.id, playlist.isPublic)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  {playlist.isPublic ? (
                    <>
                      <Lock className="h-4 w-4 mr-1" />
                      Tornar Privada
                    </>
                  ) : (
                    <>
                      <Globe className="h-4 w-4 mr-1" />
                      Tornar Pública
                    </>
                  )}
                </Button>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deletingPlaylist === playlist.id}
                    >
                      {deletingPlaylist === playlist.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirmar Eliminação</DialogTitle>
                      <DialogDescription>
                        Tem a certeza que pretende eliminar a playlist "{playlist.name}"? 
                        Esta ação é irreversível e removerá todas as músicas associadas à playlist.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline">Cancelar</Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleDeletePlaylist(playlist.id, playlist.name)}
                      >
                        Eliminar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {playlists.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListMusic className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma playlist encontrada
            </h3>
            <p className="text-gray-500 text-center">
              Ajuste os filtros para encontrar playlists
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="text-sm text-gray-600">
              Página {currentPage} de {totalPages} ({totalCount} playlists)
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
