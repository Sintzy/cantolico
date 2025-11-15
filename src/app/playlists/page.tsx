'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Music, Users, Lock, Globe, Crown, UserCheck, Settings, Edit } from 'lucide-react';
import Link from 'next/link';
import EditPlaylistModal from '../../components/EditPlaylistModal';

interface PlaylistMember {
  id: string;
  email: string;
  name: string | null;
  role: 'owner' | 'editor';
  status: 'accepted' | 'pending';
  joinedAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  visibility: 'PUBLIC' | 'PRIVATE' | 'NOT_LISTED';
  isPublic: boolean;
  userId: number;
  createdAt: string;
  updatedAt: string;
  songsCount: number;
  members?: PlaylistMember[];
  userRole?: 'owner' | 'editor' | 'admin';
}

function PlaylistsContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  // Check for invitation messages
  useEffect(() => {
    const inviteAccepted = searchParams.get('invite_accepted');
    const playlistName = searchParams.get('playlist_name');
    const error = searchParams.get('error');
    
    if (inviteAccepted === 'true' && playlistName) {
      toast.success(`Convite aceito! Agora és editor da playlist "${decodeURIComponent(playlistName)}"`);
    } else if (error) {
      const errorMessages: { [key: string]: string } = {
        'invalid_token': 'Link de convite inválido.',
        'expired_token': 'Este convite expirou. Contacta o proprietário da playlist para um novo convite.',
        'invite_cancelled': 'Este convite foi cancelado pelo proprietário da playlist.',
        'invite_not_found': 'Convite não encontrado.',
        'already_accepted': 'Este convite já foi aceito anteriormente.',
        'email_mismatch': 'O teu email não corresponde ao email convidado.',
        'accept_failed': 'Erro ao aceitar o convite. Tenta novamente.',
        'server_error': 'Erro interno do servidor. Tenta novamente mais tarde.'
      };
      
      const message = errorMessages[error] || 'Erro desconhecido com o convite.';
      toast.error(message);
    }
    
    // Clean up URL parameters
    if (inviteAccepted || error) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    const fetchPlaylists = async () => {
      try {
        const response = await fetch('/api/user/playlists');
        if (response.ok) {
          const data = await response.json();
          setPlaylists(data);
        } else {
          console.error('Failed to fetch playlists');
          toast.error('Erro ao carregar playlists');
        }
      } catch (error) {
        console.error('Error fetching playlists:', error);
        toast.error('Erro de conexão');
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, [session]);

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Playlists</h1>
            <p className="text-gray-600 mb-6">Faz login para ver as tuas playlists</p>
            <Button asChild>
              <Link href="/login">Fazer Login</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header Skeleton */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <Skeleton className="h-7 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-28" />
              </div>
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-8">
            {/* Owned Playlists Skeleton */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-8" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="bg-white border">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <Skeleton className="h-5 w-3/4 mb-2" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                        <div className="flex flex-col items-end gap-1 ml-2">
                          <Skeleton className="h-4 w-4" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Skeleton className="h-3 w-3" />
                            <Skeleton className="h-3 w-12" />
                          </div>
                          <div className="flex items-center gap-1">
                            <Skeleton className="h-3 w-3" />
                            <Skeleton className="h-3 w-4" />
                          </div>
                        </div>
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Member Playlists Skeleton */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-5 w-8" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {[...Array(2)].map((_, i) => (
                  <Card key={i} className="bg-white border">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <Skeleton className="h-5 w-3/4 mb-2" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                        <div className="flex flex-col items-end gap-1 ml-2">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-4" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Skeleton className="h-3 w-3" />
                            <Skeleton className="h-3 w-12" />
                          </div>
                          <div className="flex items-center gap-1">
                            <Skeleton className="h-3 w-3" />
                            <Skeleton className="h-3 w-4" />
                          </div>
                        </div>
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  const handleEditPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setEditModalOpen(true);
  };

  const handlePlaylistUpdated = (updatedPlaylist: any) => {
    setPlaylists(prev => 
      prev.map(p => p.id === updatedPlaylist.id ? { ...p, ...updatedPlaylist } : p)
    );
    setEditModalOpen(false);
  };

  const handlePlaylistDeleted = (playlistId: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    setEditModalOpen(false);
    toast.success('Playlist apagada com sucesso!');
  };

  const ownedPlaylists = playlists.filter(p => p.userRole === 'owner');
  const memberPlaylists = playlists.filter(p => p.userRole === 'editor');
  const allPlaylistsForAdmin = playlists.filter(p => p.userRole === 'admin');

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">As Minhas Playlists</h1>
              <p className="text-gray-600 mt-1">
                Gere e organiza as tuas coleções de música
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild variant="outline">
                <Link href="/playlists/explore">
                  <Globe className="w-4 h-4 mr-2" />
                  Explorar
                </Link>
              </Button>
              <Button asChild>
                <Link href="/playlists/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Playlist
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top Banner Ad removed */}

        {playlists.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma playlist encontrada</h2>
            <p className="text-gray-600 mb-6">Cria a tua primeira playlist para começar a organizar as tuas músicas favoritas</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link href="/playlists/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Playlist
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/playlists/explore">
                  <Globe className="w-4 h-4 mr-2" />
                  Explorar Playlists
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Owned Playlists */}
            {ownedPlaylists.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-5 h-5 text-yellow-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Minhas Playlists</h2>
                  <Badge variant="secondary">{ownedPlaylists.length}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {ownedPlaylists.map((playlist) => (
                    <div key={playlist.id} className="relative group">
                      <PlaylistCard playlist={playlist} onEdit={handleEditPlaylist} />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditPlaylist(playlist)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm border shadow-sm"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Admin: All Playlists */}
            {session.user.role === 'ADMIN' && allPlaylistsForAdmin.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-gray-700" />
                  <h2 className="text-xl font-semibold text-gray-900">Todas as Playlists (Admin)</h2>
                  <Badge variant="secondary">{allPlaylistsForAdmin.length}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {allPlaylistsForAdmin.map((playlist) => (
                    <div key={playlist.id} className="relative group">
                      <PlaylistCard playlist={playlist} onEdit={handleEditPlaylist} />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditPlaylist(playlist)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm border shadow-sm"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Member Playlists - Where user is invited as editor */}
            {memberPlaylists.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Playlists Colaborativas</h2>
                  <Badge variant="secondary">{memberPlaylists.length}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {memberPlaylists.map((playlist) => (
                    <div key={playlist.id} className="relative group">
                      <PlaylistCard playlist={playlist} showInvitedBadge onEdit={handleEditPlaylist} />
                      {playlist.userRole === 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPlaylist(playlist)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm border shadow-sm"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Edit Playlist Modal */}
      {selectedPlaylist && (
        <EditPlaylistModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          playlist={selectedPlaylist}
          onUpdate={() => {
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

interface PlaylistCardProps {
  playlist: Playlist;
  showInvitedBadge?: boolean;
  onEdit: (playlist: Playlist) => void;
}

function PlaylistCard({ playlist, showInvitedBadge = false, onEdit }: PlaylistCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getMembersCount = () => {
    if (!playlist.members) return 1;
    return playlist.members.filter(m => m.status === 'accepted').length;
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 relative">
      <Link href={`/playlists/${playlist.id}`} className="block">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {playlist.name}
              </CardTitle>
              {playlist.description && (
                <CardDescription className="mt-1 text-sm text-gray-600 line-clamp-2">
                  {playlist.description}
                </CardDescription>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 ml-2">
              {showInvitedBadge && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                  Convidado
                </Badge>
              )}
              <div title={playlist.isPublic ? "Playlist pública" : "Playlist privada"}>
                {playlist.isPublic ? (
                  <Globe className="w-4 h-4 text-green-600" />
                ) : (
                  <Lock className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Music className="w-4 h-4" />
                <span>{playlist.songsCount} música{playlist.songsCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{getMembersCount()}</span>
              </div>
            </div>
            <span className="text-xs text-gray-500">
              {formatDate(playlist.updatedAt)}
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

export default function PlaylistsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white">
        {/* Header Skeleton */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="h-7 w-48 bg-gray-200 rounded mb-2 animate-pulse"></div>
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="h-9 w-20 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-9 w-28 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-8">
            {/* Section Header */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-5 w-8 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white border rounded-lg p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-3 w-full bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse ml-2"></div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-3 w-4 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    }>
      <PlaylistsContent />
    </Suspense>
  );
}
