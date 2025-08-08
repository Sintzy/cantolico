'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Play,
  ExternalLink,
  MoreVertical,
  Trash2,
  Edit
} from 'lucide-react';
import StarButton from '@/components/StarButton';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

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
        const error = await response.json();
        toast.error(error.error || 'Erro ao remover música');
      }
    } catch (error) {
      console.error('Error removing song:', error);
      toast.error('Erro de conexão ao remover música');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
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
    <div className="container mx-auto px-4 py-8">
      {/* Header da Playlist */}
      <div className="mb-8">
        <div className="flex items-start gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-8 text-white">
            <ListMusic className="h-16 w-16" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">Playlist</Badge>
              {playlist.isPublic ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Globe className="h-3 w-3 mr-1" />
                  Pública
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-600 border-gray-600">
                  <Lock className="h-3 w-3 mr-1" />
                  Privada
                </Badge>
              )}
            </div>
            
            <h1 className="text-4xl font-bold mb-2">{playlist.name}</h1>
            
            {playlist.description && (
              <p className="text-muted-foreground text-lg mb-4">
                {playlist.description}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>Por {playlist.user.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <ListMusic className="h-4 w-4" />
                <span>{playlist.items.length} música{playlist.items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>
                  Criada {formatDistanceToNow(new Date(playlist.createdAt), {
                    addSuffix: true,
                    locale: ptBR
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Músicas */}
      <div className="space-y-4">
        {playlist.items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ListMusic className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Playlist vazia</h3>
              <p className="text-muted-foreground text-center">
                Esta playlist ainda não tem músicas.
                {isOwner && " Adicione algumas músicas para começar!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {playlist.items.map((item: any, index: number) => (
              <Card key={item.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Número da música */}
                    <div className="w-8 text-center text-sm text-muted-foreground font-mono">
                      {index + 1}
                    </div>

                    {/* Info da música */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold truncate">
                          <Link 
                            href={`/musics/${item.song.slug}`}
                            className="hover:underline"
                          >
                            {item.song.title}
                          </Link>
                        </h3>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {item.song.type.toLowerCase()}
                          </Badge>
                          
                          {item.song.moments.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {item.song.moments[0].toLowerCase().replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>
                          Adicionada por {item.addedBy.name} • {formatDistanceToNow(new Date(item.createdAt), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2">
                      <StarButton 
                        songId={item.song.id} 
                        size="sm" 
                        showCount={false}
                      />
                      
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/musics/${item.song.slug}`}>
                          <Play className="h-4 w-4 mr-1" />
                          Ver
                        </Link>
                      </Button>
                      
                      <Button size="sm" variant="ghost" asChild>
                        <Link 
                          href={`/musics/${item.song.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>

                      {/* Dropdown de ações para o dono */}
                      {isOwner && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600"
                              onClick={() => handleRemoveSong(item.song.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover da playlist
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
