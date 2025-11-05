'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRef } from 'react';
import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner, type SpinnerProps } from '@/components/ui/shadcn-io/spinner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { TableSkeleton } from '@/components/ui/skeleton';
import { 
  Music, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Trash2, 
  AlertCircle,
  User,
  Calendar,
  FileText,
  ExternalLink,
  ChevronUp,
  UserX,
  Mail,
  Shield,
  Crown,
  UserCheck,
  Edit3,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import UserAvatar from '@/components/ui/user-avatar';
import UserHoverCard from '@/components/UserHoverCard';
import { useDebounce } from '@/hooks/useOptimization';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

interface Song {
  id: string;
  title: string;
  artist: string;
  type: string;
  lyrics: string;
  createdAt: string;
  currentVersion?: {
    id: string;
    versionNumber: number;
    lyricsPlain: string;
    author?: {
      id: string;
      name: string;
      email: string;
    };
  };
  author?: {
    id: string;
    name: string;
    profileImage?: string;
    role?: string;
    banned?: boolean;
    email?: string;
  };
}

interface SongsResponse {
  songs: Song[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

const TYPE_COLORS = {
  'Adoração': 'bg-purple-100 text-purple-800 border-purple-200',
  'Louvor': 'bg-blue-100 text-blue-800 border-blue-200',
  'Contemplação': 'bg-green-100 text-green-800 border-green-200',
  'Entrada': 'bg-orange-100 text-orange-800 border-orange-200',
  'Ofertório': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Comunhão': 'bg-pink-100 text-pink-800 border-pink-200',
  'Saída': 'bg-gray-100 text-gray-800 border-gray-200'
};

const ROLE_COLORS = {
  USER: 'bg-blue-100 text-blue-800 border-blue-200',
  REVIEWER: 'bg-orange-100 text-orange-800 border-orange-200',
  ADMIN: 'bg-purple-100 text-purple-800 border-purple-200'
};

const ROLE_ICONS = {
  USER: <UserCheck className="h-3 w-3" />,
  REVIEWER: <Shield className="h-3 w-3" />,
  ADMIN: <Crown className="h-3 w-3" />
};

export default function MusicsManagement() {
  const loadingRef = React.useRef(null);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deletingSong, setDeletingSong] = useState<string | null>(null);
  const [banningUser, setBanningUser] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [expandedSongs, setExpandedSongs] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [userToBan, setUserToBan] = useState<{id: string, name: string} | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Infinite scroll hook
  const fetchSongsApi = async (page: number, limit: number) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search: debouncedSearchTerm,
      type: typeFilter === 'all' ? '' : typeFilter
    });
    const response = await fetch(`/api/admin/music?${params}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao carregar músicas');
    }
    const data: SongsResponse = await response.json();
    return {
      data: data.songs,
      totalCount: data.totalCount,
      totalPages: data.totalPages,
      currentPage: data.currentPage
    };
  };

  const {
    data: songs,
    totalCount,
    hasMore,
    loading: infiniteLoading,
    error: infiniteError,
    loadMore,
    refresh
  } = useInfiniteScroll<Song>(fetchSongsApi, [debouncedSearchTerm, typeFilter], { limit: 10 });

  const loading = infiniteLoading;
  const error = infiniteError;

  // Use optimization hooks
  

  // Authentication
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/');
      return;
    }
  }, [session, status, router]);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  const handleDeleteSong = async () => {
    if (!songToDelete) return;
    try {
      setDeletingSong(songToDelete.id);
      const response = await fetch(`/api/admin/music`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ songId: songToDelete.id }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao eliminar música');
      }
      const result = await response.json();
      await refresh();
      // Show detailed success message
      const details = result.details;
      const detailsText = details ? 
        ` (${details.versionsDeleted} versões e ${details.favoritesDeleted} favoritos eliminados)` : '';
      toast.success(`Música "${songToDelete.title}" eliminada com sucesso${detailsText}!`);
    } catch (error) {
      console.error('Erro ao eliminar música:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao eliminar música';
      toast.error(errorMessage);
      throw error; // Para que o dialog possa lidar com o erro
    } finally {
      setDeletingSong(null);
      setSongToDelete(null);
    }
  };

  const handleBanUser = async () => {
    if (!userToBan) return;
    try {
      setBanningUser(userToBan.id);
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userToBan.id, banned: true }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao banir utilizador');
      }
      await refresh();
      toast.success(`Utilizador "${userToBan.name}" foi banido com sucesso!`);
    } catch (error) {
      console.error('Erro ao banir utilizador:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao banir utilizador';
      toast.error(errorMessage);
      throw error; // Para que o dialog possa lidar com o erro
    } finally {
      setBanningUser(null);
      setUserToBan(null);
    }
  };

  const handleSendEmail = useCallback((userEmail: string, userName: string) => {
    const subject = encodeURIComponent(`Cancioneiro - Contacto da Administração`);
    const body = encodeURIComponent(`Olá ${userName},\n\nEsta mensagem é da administração do Cancioneiro.\n\n\n\nCumprimentos,\nEquipa Cancioneiro`);
    const mailtoLink = `mailto:${userEmail}?subject=${subject}&body=${body}`;
    window.open(mailtoLink, '_blank');
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleTypeFilter = useCallback((value: string) => {
    setTypeFilter(value);
  }, []);

  const toggleSongExpansion = useCallback((songId: string) => {
    const newExpanded = new Set(expandedSongs);
    if (newExpanded.has(songId)) {
      newExpanded.delete(songId);
    } else {
      newExpanded.add(songId);
    }
    setExpandedSongs(newExpanded);
  }, [expandedSongs]);

  const formatLyrics = (lyrics: string | null | undefined) => {
    if (!lyrics) {
      return <div className="text-gray-500 italic">Sem letra disponível</div>;
    }
    
    const lines = lyrics.split('\n');
    return lines.map((line, index) => {
      const chordRegex = /\[([A-G][#b]?[^[\]]*)\]/g;
      
      if (chordRegex.test(line)) {
        const parts = line.split(chordRegex);
        return (
          <div key={index} className="mb-1">
            {parts.map((part, i) => 
              i % 2 === 0 ? (
                <span key={i}>{part}</span>
              ) : (
                <span key={i} className="text-blue-600 font-semibold text-sm bg-blue-50 px-1 rounded">
                  {part}
                </span>
              )
            )}
          </div>
        );
      } else {
        return (
          <div key={index} className={`${line.trim() === '' ? 'mb-2' : 'mb-1'}`}>
            {line || '\u00A0'}
          </div>
        );
      }
    });
  };

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestão de Músicas</h1>
            <p className="text-gray-600"><span className="sr-only">A carregar...</span><span aria-hidden data-nosnippet>A carregar...</span></p>
          </div>
        </div>
        <TableSkeleton rows={8} />
      </div>
    );
  }


  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestão de Músicas</h1>
            <p className="text-gray-600"><span className="sr-only">A carregar músicas...</span><span aria-hidden data-nosnippet>A carregar músicas...</span></p>
          </div>
        </div>
        <TableSkeleton rows={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold">Erro ao carregar músicas</h2>
        <p className="text-gray-600">{error}</p>
        <Button onClick={refresh} variant="outline">
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Músicas</h1>
          <p className="text-gray-600">
            Gerir o conteúdo musical do sistema ({totalCount} total)
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleManualRefresh} 
            variant="outline" 
            size="sm"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Spinner variant="circle" size={16} className="text-black mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Atualizar
          </Button>
          <Button asChild size="sm">
            <a href="/musics/create" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Adicionar Música
            </a>
          </Button>
        </div>
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
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar por título ou artista..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={typeFilter} onValueChange={handleTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="Adoração">Adoração</SelectItem>
                  <SelectItem value="Louvor">Louvor</SelectItem>
                  <SelectItem value="Contemplação">Contemplação</SelectItem>
                  <SelectItem value="Entrada">Entrada</SelectItem>
                  <SelectItem value="Ofertório">Ofertório</SelectItem>
                  <SelectItem value="Comunhão">Comunhão</SelectItem>
                  <SelectItem value="Saída">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Songs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Músicas
            {isRefreshing && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Spinner variant="circle" size={16} className="text-black" />
                A atualizar...
              </div>
            )}
          </CardTitle>
          <CardDescription>
            Lista de todas as músicas publicadas
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          {/* Loading overlay */}
          {isRefreshing && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
              <div className="bg-white p-4 rounded-lg shadow-lg flex items-center gap-2">
                <Spinner variant="circle" size={20} className="text-black" />
                <span>A atualizar dados...</span>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {songs.map((song: Song, idx: number) => (
              <div
                key={song.id}
                className="border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-4 flex-1">
                    <UserAvatar 
                      user={{
                        name: song.author?.name || 'Utilizador',
                        image: song.author?.profileImage
                      }} 
                      size={48} 
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{song.title}</h3>
                        <Badge className={`text-xs ${TYPE_COLORS[song.type as keyof typeof TYPE_COLORS] || TYPE_COLORS['Adoração']}`}>
                          {song.type}
                        </Badge>
                        {song.author?.banned && (
                          <Badge variant="destructive" className="text-xs">
                            Utilizador Banido
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1 flex-shrink-0">
                          <User className="h-3 w-3" />
                          {song.author ? (
                            <UserHoverCard 
                              user={{
                                name: song.author.name,
                                email: song.author.email || '',
                                createdAt: song.createdAt,
                                image: song.author.profileImage || ''
                              }}
                            />
                          ) : (
                            'Utilizador desconhecido'
                          )}
                        </span>
                        {song.author?.role && (
                          <Badge className={`text-xs ${ROLE_COLORS[song.author.role as keyof typeof ROLE_COLORS] || ROLE_COLORS['USER']}`}>
                            <span className="flex items-center gap-1">
                              {ROLE_ICONS[song.author.role as keyof typeof ROLE_ICONS] || ROLE_ICONS['USER']}
                              {song.author.role}
                            </span>
                          </Badge>
                        )}
                        <span className="flex items-center gap-1 flex-shrink-0">
                          <Calendar className="h-3 w-3" />
                          {new Date(song.createdAt).toLocaleDateString('pt-PT')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSongExpansion(song.id)}
                    >
                      {expandedSongs.has(song.id) ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          Ocultar
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          Ver
                        </>
                      )}
                    </Button>

                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/dashboard/musics/${song.id}/edit`}>
                        <Edit3 className="h-4 w-4" />
                        Editar
                      </Link>
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedSong(song)}>
                          <FileText className="h-4 w-4" />
                          Detalhes
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-full max-w-5xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Music className="h-5 w-5" />
                            {song.title}
                          </DialogTitle>
                          <DialogDescription className="flex items-center gap-1">
                            <span>Publicado por</span>
                            {song.author ? (
                              <UserHoverCard 
                                user={{
                                  name: song.author.name,
                                  email: song.author.email || '',
                                  createdAt: song.createdAt,
                                  image: song.author.profileImage || ''
                                }}
                              />
                            ) : (
                              <span>Utilizador desconhecido</span>
                            )}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4 space-y-4">
                          {/* Song Info */}
                          <div className="flex items-center gap-4 mb-4">
                            <Badge className={`${TYPE_COLORS[song.type as keyof typeof TYPE_COLORS] || TYPE_COLORS['Adoração']}`}>
                              {song.type}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {new Date(song.createdAt).toLocaleDateString('pt-PT')}
                            </span>
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/musics/${song.id}`} target="_blank">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Ver Página
                              </Link>
                            </Button>
                          </div>

                          {/* Author Info */}
                          {song.author && (
                            <div className="border rounded-lg p-4 bg-gray-50">
                              <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Informações do Autor
                              </h4>
                              <div className="flex items-center space-x-4">
                                <UserAvatar 
                                  user={{
                                    name: song.author.name,
                                    image: song.author.profileImage
                                  }} 
                                  size={40} 
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{song.author.name}</span>
                                    {song.author.role && (
                                      <Badge className={`text-xs ${ROLE_COLORS[song.author.role as keyof typeof ROLE_COLORS] || ROLE_COLORS['USER']}`}>
                                        <span className="flex items-center gap-1">
                                          {ROLE_ICONS[song.author.role as keyof typeof ROLE_ICONS] || ROLE_ICONS['USER']}
                                          {song.author.role}
                                        </span>
                                      </Badge>
                                    )}
                                    {song.author.banned && (
                                      <Badge variant="destructive" className="text-xs">
                                        Banido
                                      </Badge>
                                    )}
                                  </div>
                                  {song.author.email && (
                                    <span className="text-sm text-gray-600">{song.author.email}</span>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button asChild variant="outline" size="sm">
                                    <Link href={`/users/${song.author.id}`} target="_blank">
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      Ver Perfil
                                    </Link>
                                  </Button>
                                  {song.author.email && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleSendEmail(song.author!.email!, song.author!.name)}
                                    >
                                      <Mail className="h-4 w-4 mr-2" />
                                      Enviar Email
                                    </Button>
                                  )}
                                  {!song.author.banned && (
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      onClick={() => {
                                        setUserToBan({id: song.author!.id, name: song.author!.name});
                                        setShowBanDialog(true);
                                      }}
                                      disabled={banningUser === song.author.id}
                                    >
                                      {banningUser === song.author.id ? (
                                        <Spinner variant="circle" size={16} className="text-black mr-2" />
                                      ) : (
                                        <UserX className="h-4 w-4 mr-2" />
                                      )}
                                      Banir Utilizador
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Lyrics */}
                          <div>
                            <h4 className="font-semibold mb-2">Letra:</h4>
                            <div className="border rounded-lg p-4 bg-white font-mono text-sm max-h-96 overflow-y-auto">
                              {formatLyrics(song.currentVersion?.lyricsPlain)}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => {
                        setSongToDelete(song);
                        setShowDeleteDialog(true);
                      }}
                      disabled={deletingSong === song.id}
                    >
                      {deletingSong === song.id ? (
                        <Spinner variant="circle" size={16} className="text-black" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Eliminar
                    </Button>
                  </div>
                </div>

                {expandedSongs.has(song.id) && (
                  <div className="px-4 pb-4 border-t bg-gray-50">
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Letra:</h4>
                        <div className="flex gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/musics/${song.id}`} target="_blank">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Ver Página
                            </Link>
                          </Button>
                          {song.author && (
                            <>
                              <Button asChild variant="outline" size="sm">
                                <Link href={`/users/${song.author.id}`} target="_blank">
                                  <User className="h-4 w-4 mr-2" />
                                  Ver Autor
                                </Link>
                              </Button>
                              {song.author.email && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleSendEmail(song.author!.email!, song.author!.name)}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Email
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="bg-white border rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto">
                        {formatLyrics(song.currentVersion?.lyricsPlain)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}



            {/* Infinite scroll loader e elemento de referência */}
            {hasMore && (
              <div ref={loadingRef} className="flex justify-center py-6">
                <Spinner variant="circle" size={32} className="text-black" />
                <span className="sr-only">A carregar mais músicas...</span><span aria-hidden data-nosnippet className="ml-2 text-gray-500">A carregar mais músicas...</span>
              </div>
            )}

            {/* No songs found */}
            {songs.length === 0 && (
              <div className="text-center py-8">
                <Music className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600">
                  Nenhuma música encontrada
                </h3>
                <p className="text-gray-500">
                  Tente ajustar os filtros de pesquisa
                </p>
              </div>
            )}

          </div>

          {/* Remover paginação, infinite scroll faz o trabalho */}
        </CardContent>
      </Card>

      {/* Dialog de confirmação para eliminar música */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSongToDelete(null);
        }}
        onConfirm={handleDeleteSong}
        title="Eliminar Música"
        description={`Tem a certeza que pretende eliminar a música "${songToDelete?.title}"? Esta ação não pode ser desfeita.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />

      {/* Dialog de confirmação para banir utilizador */}
      <ConfirmationDialog
        isOpen={showBanDialog}
        onClose={() => {
          setShowBanDialog(false);
          setUserToBan(null);
        }}
        onConfirm={handleBanUser}
        title="Banir Utilizador"
        description={`Tem a certeza que pretende banir o utilizador "${userToBan?.name}"? Esta ação irá impedir o utilizador de aceder ao sistema.`}
        confirmText="Banir"
        cancelText="Cancelar"
        requireReason={true}
        reasonPlaceholder="Motivo do banimento..."
        reasonLabel="Motivo do Banimento"
      />
    </div>
  );
}
