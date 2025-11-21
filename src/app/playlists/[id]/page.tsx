"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StarButton from "@/components/StarButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Globe,
  Lock,
  EyeOff,
  MoreVertical,
  Trash2,
  Edit,
  Music,
  Play,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import PlaylistEditModal from "@/components/PlaylistEditModal";

interface PlaylistPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function PlaylistPage({ params }: PlaylistPageProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const { id } = await params;
      await fetchPlaylist(id);
    };
    
    loadData();
  }, [params]);

  const fetchPlaylist = async (id: string) => {
    try {
      const response = await fetch(`/api/playlists/${id}`);
      if (response.status === 404) {
        // mark as not found and stop — avoid calling next/navigation.notFound() from a client component
        setNotFoundState(true);
        return;
      }
      if (response.status === 403) {
        toast.error('Esta playlist é privada');
        setNotFoundState(true);
        return;
      }
      if (!response.ok) {
        throw new Error('Erro ao carregar playlist');
      }
      const data = await response.json();
      setPlaylist(data);
    } catch (error) {
      console.error('Erro ao buscar playlist:', error);
      toast.error('Erro ao carregar playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!playlist?.id) return;
    
    const confirmDelete = confirm('Tem certeza que deseja excluir esta playlist? Esta ação não pode ser desfeita.');
    
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/playlists/${playlist.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Playlist excluída com sucesso');
        router.push('/playlists');
      } else {
        toast.error('Erro ao excluir playlist');
      }
    } catch (error) {
      console.error('Erro ao excluir playlist:', error);
      toast.error('Erro ao excluir playlist');
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'PUBLIC':
        return <Globe className="w-4 h-4" />;
      case 'PRIVATE':
        return <Lock className="w-4 h-4" />;
      case 'NOT_LISTED':
        return <EyeOff className="w-4 h-4" />;
      default:
        return <Lock className="w-4 h-4" />;
    }
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case 'PUBLIC':
        return 'Pública';
      case 'PRIVATE':
        return 'Privada';
      case 'NOT_LISTED':
        return 'Não listada';
      default:
        return 'Privada';
    }
  };

  const handlePlaylistUpdate = () => {
    setEditModalOpen(false);
    // Refresh the playlist data to get the latest version
    if (playlist?.id) {
      fetchPlaylist(playlist.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFoundState) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center p-6">
          <h1 className="text-2xl font-bold mb-2">Playlist não encontrada</h1>
          <p className="text-sm text-gray-600 mb-4">A playlist que você tentou abrir não existe ou não está acessível.</p>
          <div className="flex justify-center gap-2">
            <Link href="/playlists"><Button variant="ghost">Voltar às playlists</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = session?.user?.id === playlist.userId;
  const isAdmin = session?.user?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with blurred background and overlay */}
      <div className="relative h-64 md:h-80 w-full flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src="/banner.jpg" alt="Banner" className="w-full h-full object-cover object-center scale-110 blur-sm brightness-75" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent" />
        </div>
        
        {/* Back Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          asChild 
          className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 text-white hover:bg-white/20 border-white/30 shadow backdrop-blur-sm"
        >
          <Link href="/playlists" className="flex items-center gap-1 sm:gap-2">
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Voltar</span>
          </Link>
        </Button>

        {/* Owner/Admin Actions */}
        {(isOwner || isAdmin) && (
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-white/20 border-white/30 shadow backdrop-blur-sm p-1.5 sm:p-2"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm">
                <DropdownMenuItem onClick={() => setEditModalOpen(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDeletePlaylist}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-4 sm:px-6 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white drop-shadow-lg tracking-tight text-center mb-2 md:mb-4">
            {playlist.name}
          </h1>
          
          {playlist.description && (
            <div className="mx-auto mb-4">
              <div className="inline-block bg-white text-gray-900 font-medium px-3 py-1 rounded-md shadow-sm max-w-full">
                <p className="text-sm sm:text-base leading-relaxed truncate max-w-[40ch]">{playlist.description}</p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 justify-center mb-2">
            <div className="bg-white/80 text-gray-900 font-semibold px-3 py-1 text-xs shadow-sm rounded-full flex items-center gap-1">
              {getVisibilityIcon(playlist.visibility)}
              <span>{getVisibilityLabel(playlist.visibility)}</span>
            </div>
            
            <div className="bg-white/80 text-gray-900 font-semibold px-3 py-1 text-xs shadow-sm rounded-full flex items-center gap-1">
              <Music className="w-3 h-3" />
              <span>{playlist.items?.length || 0} músicas</span>
            </div>
            
            {playlist.user && (
              <div className="bg-white/80 text-gray-900 font-semibold px-3 py-1 text-xs shadow-sm rounded-full">
                por {playlist.user.name}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {(isOwner || isAdmin) && (
            <div className="flex gap-3 justify-center mt-2">
              <Button 
                variant="ghost" 
                className="bg-white/20 hover:bg-white/40 text-white border-white/30 shadow"
                onClick={() => setEditModalOpen(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Songs List */}
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {playlist.items && playlist.items.length > 0 ? (
          <div className="space-y-1">
            {playlist.items.map((item: any, index: number) => (
              <div
                key={item.id}
                className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg hover:bg-gray-50/80 transition-all duration-200 border border-transparent hover:border-gray-200"
              >
                <div className="flex-shrink-0 w-6 sm:w-8 text-center">
                  <span className="text-xs sm:text-sm text-gray-500 group-hover:hidden font-medium">
                    {index + 1}
                  </span>
                  <Play className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 hidden group-hover:block cursor-pointer hover:text-gray-900 transition-colors" />
                </div>
                
                <div className="flex-1 min-w-0">
                  {item.song ? (
                    <Link
                      href={`/musics/${item.song.slug}`}
                      className="block hover:text-gray-900 transition-colors"
                    >
                      <h4 className="font-semibold text-gray-800 truncate text-sm sm:text-base">
                        {item.song.title}
                      </h4>
                      <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
                        {item.song.tags && item.song.tags.length > 0 && (
                          <div className="flex gap-1">
                            {item.song.tags.slice(0, 2).map((tag: string) => (
                              <Badge 
                                key={tag} 
                                variant="secondary" 
                                className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors px-1.5 py-0.5"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  ) : (
                    <div className="text-gray-500">
                      <span className="text-sm italic">Música não encontrada</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {item.song && (
                    <>
                      <StarButton songId={item.song.id} />
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="opacity-0 group-hover:opacity-100 transition-all duration-200 text-gray-600 hover:text-gray-900"
                      >
                        <Link href={`/musics/${item.song.slug}`}>
                          Ver
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Music className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-gray-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2 sm:mb-3">
              Nenhuma música ainda
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 max-w-xs sm:max-w-md mx-auto">
              Esta playlist ainda não possui músicas. {isOwner ? 'Adicione algumas para começar!' : ''}
            </p>
            {isOwner && (
              <Button asChild className="bg-gray-900 hover:bg-gray-800 text-white">
                <Link href={`/playlists/${playlist.id}/edit`}>
                  Adicionar Músicas
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Edit Playlist Modal */}
      {playlist && (
        <PlaylistEditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          playlist={playlist}
          onUpdate={handlePlaylistUpdate}
        />
      )}
    </div>
  );
}