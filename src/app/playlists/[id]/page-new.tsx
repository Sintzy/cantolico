'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ListMusic, 
  Clock, 
  User, 
  Globe, 
  Lock,
  Eye,
  Play,
  ExternalLink,
  MoreVertical,
  Trash2,
  Edit,
  Music,
  Calendar,
  Users
} from 'lucide-react';
import StarButton from '@/components/StarButton';
import PlaylistMembers from '@/components/PlaylistMembers';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface PlaylistPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Helper component for section titles
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-semibold text-gray-900 mb-4">{children}</h2>
);

// Helper component for sidebar titles
const SidebarTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-medium text-gray-700 mb-2">{children}</h3>
);

export default function PlaylistPage({ params }: PlaylistPageProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { id } = await params;
      await fetchPlaylist(id);
    };
    loadData();
  }, [params]);

  const fetchPlaylist = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/playlists/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          notFound();
        }
        if (response.status === 403) {
          toast.error('Não tens permissão para ver esta playlist');
          router.push('/playlists');
          return;
        }
        throw new Error('Erro ao carregar playlist');
      }
      
      const data = await response.json();
      setPlaylist(data);
    } catch (error) {
      console.error('Error fetching playlist:', error);
      toast.error('Erro ao carregar playlist');
      router.push('/playlists');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSong = async (songId: number) => {
    if (!playlist) return;
    
    const confirmed = confirm('Tens a certeza que queres remover esta música da playlist?');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/playlists/${playlist.id}/songs/${songId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Música removida da playlist com sucesso');
        setPlaylist({
          ...playlist,
          items: playlist.items.filter((item: any) => item.song.id !== songId)
        });
      } else {
        throw new Error('Erro ao remover música');
      }
    } catch (error) {
      console.error('Error removing song:', error);
      toast.error('Erro ao remover música da playlist');
    }
  };

  const handleDeletePlaylist = async () => {
    if (!playlist) return;
    
    const confirmed = confirm('Tens a certeza que queres eliminar esta playlist? Esta ação não pode ser desfeita.');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/playlists/${playlist.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Playlist eliminada com sucesso');
        router.push('/playlists');
      } else {
        throw new Error('Erro ao eliminar playlist');
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error('Erro ao eliminar playlist');
    }
  };

  const getVisibilityInfo = (visibility: string) => {
    switch (visibility) {
      case 'PUBLIC':
        return {
          icon: Globe,
          label: 'Pública',
          description: 'Visível para todos',
          color: 'text-green-600 bg-green-50 border-green-200'
        };
      case 'NOT_LISTED':
        return {
          icon: Eye,
          label: 'Não listada',
          description: 'Acessível apenas por link',
          color: 'text-blue-600 bg-blue-50 border-blue-200'
        };
      case 'PRIVATE':
      default:
        return {
          icon: Lock,
          label: 'Privada',
          description: 'Apenas tu podes ver',
          color: 'text-gray-600 bg-gray-50 border-gray-200'
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-32 bg-gray-200 rounded-2xl"></div>
            <div className="flex gap-8">
              <div className="w-80 space-y-4">
                <div className="h-40 bg-gray-200 rounded-xl"></div>
                <div className="h-32 bg-gray-200 rounded-xl"></div>
              </div>
              <div className="flex-1 space-y-4">
                <div className="h-64 bg-gray-200 rounded-2xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return notFound();
  }

  const isOwner = session?.user?.id === playlist.userId;
  const visibility = playlist.visibility || (playlist.isPublic ? 'PUBLIC' : 'PRIVATE');
  const visibilityInfo = getVisibilityInfo(visibility);
  const VisibilityIcon = visibilityInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-4">
          <div className="text-center max-w-4xl">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="bg-white/20 rounded-lg p-3">
                <ListMusic className="h-8 w-8 text-white" />
              </div>
              <Badge className={`${visibilityInfo.color} border`}>
                <VisibilityIcon className="h-3 w-3 mr-1" />
                {visibilityInfo.label}
              </Badge>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg tracking-tight mb-2">
              {playlist.name}
            </h1>
            
            {playlist.description && (
              <p className="text-lg md:text-xl text-white/90 drop-shadow mb-4 max-w-2xl mx-auto">
                {playlist.description}
              </p>
            )}
            
            <div className="flex flex-wrap items-center justify-center gap-4 text-white/80 text-sm">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>Por {playlist.user?.name || 'Utilizador'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Music className="h-4 w-4" />
                <span>{playlist.items?.length || 0} músicas</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {formatDistanceToNow(new Date(playlist.createdAt), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            {isOwner && (
              <div className="flex gap-3 justify-center mt-6">
                <Button 
                  asChild 
                  variant="ghost" 
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <Link href={`/playlists/${playlist.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem 
                      onClick={handleDeletePlaylist}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar Playlist
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-14 flex flex-col md:flex-row gap-10 md:gap-16">
        {/* Sidebar */}
        <aside className="w-full md:w-80 flex-shrink-0 space-y-6 md:sticky md:top-24">
          {/* Playlist Info */}
          <div className="bg-white/80 rounded-xl shadow-sm p-5 border border-gray-100">
            <SidebarTitle>Informações</SidebarTitle>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Músicas</span>
                <span className="font-medium">{playlist.items?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Criada</span>
                <span className="font-medium">
                  {formatDistanceToNow(new Date(playlist.createdAt), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Visibilidade</span>
                <Badge className={`${visibilityInfo.color} text-xs`}>
                  <VisibilityIcon className="h-3 w-3 mr-1" />
                  {visibilityInfo.label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Members section for owners */}
          {isOwner && playlist.members && (
            <div className="bg-white/80 rounded-xl shadow-sm p-5 border border-gray-100">
              <SidebarTitle>Membros</SidebarTitle>
              <div className="space-y-2 text-sm">
                {playlist.members.length === 0 ? (
                  <p className="text-gray-500">Nenhum membro convidado</p>
                ) : (
                  playlist.members.slice(0, 3).map((member: any) => (
                    <div key={member.id} className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700">
                        {member.userEmail.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-gray-700 text-xs">{member.userEmail}</span>
                      <Badge variant="secondary" className="text-xs">
                        {member.status}
                      </Badge>
                    </div>
                  ))
                )}
                {playlist.members.length > 3 && (
                  <p className="text-xs text-gray-500">
                    +{playlist.members.length - 3} mais
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {isOwner && (
            <div className="bg-white/80 rounded-xl shadow-sm p-5 border border-gray-100">
              <SidebarTitle>Ações</SidebarTitle>
              <div className="space-y-2">
                <Button 
                  asChild 
                  variant="outline" 
                  className="w-full justify-start"
                  size="sm"
                >
                  <Link href={`/playlists/${playlist.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Playlist
                  </Link>
                </Button>
                <Button 
                  onClick={handleDeletePlaylist}
                  variant="outline" 
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 space-y-8">
          {/* Songs Section */}
          <section className="bg-white/90 rounded-2xl shadow-sm p-6 md:p-8 border border-gray-100">
            <SectionTitle>
              Músicas ({playlist.items?.length || 0})
            </SectionTitle>
            
            {!playlist.items || playlist.items.length === 0 ? (
              <div className="text-center py-12">
                <Music className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">Esta playlist está vazia</p>
                <p className="text-gray-400 text-sm">
                  {isOwner ? 'Adiciona algumas músicas para começar!' : 'O criador ainda não adicionou músicas.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {playlist.items.map((item: any, index: number) => (
                  <div 
                    key={item.id} 
                    className="group flex items-center gap-4 p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all"
                  >
                    <div className="flex-shrink-0 w-8 text-center">
                      <span className="text-sm font-medium text-gray-400">
                        {index + 1}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <Link 
                        href={`/musics/${item.song?.slug || item.song?.id}`}
                        className="group-hover:text-blue-600 transition-colors"
                      >
                        <h3 className="font-medium text-gray-900 group-hover:underline">
                          {item.song?.title || 'Música removida'}
                        </h3>
                      </Link>
                      {item.addedBy && (
                        <p className="text-xs text-gray-500 mt-1">
                          Adicionada por {item.addedBy.name}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {item.song && (
                        <StarButton 
                          songId={item.song.id} 
                          className="opacity-0 group-hover:opacity-100 transition-opacity" 
                        />
                      )}
                      
                      {item.song && (
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Link href={`/musics/${item.song.slug || item.song.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}

                      {isOwner && item.song && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem 
                              onClick={() => handleRemoveSong(item.song.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover da playlist
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Members Management Section (for owners) */}
          {isOwner && (
            <PlaylistMembers
              playlistId={playlist.id}
              members={playlist.members || []}
              isOwner={isOwner}
              onMembersUpdate={() => fetchPlaylist(playlist.id)}
            />
          )}
        </main>
      </div>
    </div>
  );
}