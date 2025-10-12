"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
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
        notFound();
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

  if (!playlist) {
    return notFound();
  }

  const isOwner = session?.user?.id === playlist.userId;

  return (
    <div className="min-h-screen bg-white">
      {/* Modern Hero Section */}
      <div className="relative w-full h-72 md:h-96 flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-white/90" />
        
        {/* Back Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          asChild 
          className="absolute top-6 left-6 z-20 text-gray-600 hover:text-gray-900 hover:bg-white/80 backdrop-blur-sm"
        >
          <Link href="/playlists" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        </Button>

        {/* Owner Actions */}
        {isOwner && (
          <div className="absolute top-6 right-6 z-20">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-600 hover:text-gray-900 hover:bg-white/80 backdrop-blur-sm"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm">
                <DropdownMenuItem asChild>
                  <Link href={`/playlists/${playlist.id}/edit`} className="flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    Editar
                  </Link>
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
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-6 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-gray-800 to-gray-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg">
              <Music className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            
            <h1 className="text-4xl md:text-7xl font-black text-gray-900 tracking-tight mb-4 drop-shadow-sm">
              {playlist.name}
            </h1>
            
            {playlist.description && (
              <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto mb-6 leading-relaxed">
                {playlist.description}
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 justify-center text-sm text-gray-600">
            <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-2 rounded-full border border-gray-200">
              {getVisibilityIcon(playlist.visibility)}
              <span className="font-medium">{getVisibilityLabel(playlist.visibility)}</span>
            </div>
            
            <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-2 rounded-full border border-gray-200">
              <Music className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{playlist.items?.length || 0} músicas</span>
            </div>
            
            {playlist.user && (
              <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-2 rounded-full border border-gray-200">
                <span>por</span>
                <span className="font-medium">{playlist.user.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Songs List */}
      <div className="container mx-auto px-4 py-8">
        {playlist.items && playlist.items.length > 0 ? (
          <div className="space-y-1">
            {playlist.items.map((item: any, index: number) => (
              <div
                key={item.id}
                className="group flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50/80 transition-all duration-200 border border-transparent hover:border-gray-200"
              >
                <div className="flex-shrink-0 w-8 text-center">
                  <span className="text-sm text-gray-500 group-hover:hidden font-medium">
                    {index + 1}
                  </span>
                  <Play className="w-4 h-4 text-gray-600 hidden group-hover:block cursor-pointer hover:text-gray-900 transition-colors" />
                </div>
                
                <div className="flex-1 min-w-0">
                  {item.song ? (
                    <Link
                      href={`/musics/${item.song.slug}`}
                      className="block hover:text-gray-900 transition-colors"
                    >
                      <h4 className="font-semibold text-gray-800 truncate text-base">
                        {item.song.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-2">
                        {item.song.tags && item.song.tags.length > 0 && (
                          <div className="flex gap-1">
                            {item.song.tags.slice(0, 2).map((tag: string) => (
                              <Badge 
                                key={tag} 
                                variant="secondary" 
                                className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
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
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Music className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              Nenhuma música ainda
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
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
    </div>
  );
}