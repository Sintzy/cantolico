'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  Plus, 
  Clock, 
  Globe, 
  Lock,
  Music,
  Edit,
  Trash2,
  MoreHorizontal,
  Eye
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Playlist {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  userId: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string;
  };
  _count: {
    items: number;
  };
}

export default function MyPlaylistsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user?.id) {
      router.push('/login');
      return;
    }

    fetchPlaylists();
  }, [session, status, router]);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/playlists');
      
      if (response.ok) {
        const data = await response.json();
        setPlaylists(data);
      } else {
        toast.error('Erro ao carregar playlists');
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: string, playlistName: string) => {
    const confirmed = confirm(`Tens a certeza que queres eliminar a playlist "${playlistName}"? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Playlist eliminada com sucesso');
        // Atualizar a lista removendo a playlist eliminada
        setPlaylists(playlists.filter(p => p.id !== playlistId));
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao eliminar playlist');
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error('Erro de conexão ao eliminar playlist');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user?.id) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section com estilo da landing page */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-10">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/2 top-0 -translate-x-1/2">
            <div className="h-60 w-60 rounded-full bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-[80px]" />
          </div>
        </div>
        
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="pb-8 pt-12 md:pb-12 md:pt-16 relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="text-center lg:text-left">
                <div className="mb-4 border-y [border-image:linear-gradient(to_right,transparent,theme(colors.slate.300/.8),transparent)1]">
                  <div className="-mx-0.5 flex justify-center lg:justify-start -space-x-2 py-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                      <ListMusic className="text-white text-xs w-3 h-3" />
                    </div>
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Music className="text-white text-xs w-3 h-3" />
                    </div>
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Plus className="text-white text-xs w-3 h-3" />
                    </div>
                  </div>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 border-y [border-image:linear-gradient(to_right,transparent,theme(colors.slate.300/.8),transparent)1] leading-tight">
                  Minhas Playlists
                </h1>
                <p className="text-lg text-gray-700 max-w-2xl">
                  Gere as tuas coleções de música litúrgica
                </p>
              </div>
              
              <Button 
                asChild 
                size="lg" 
                className="bg-gradient-to-t from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600"
              >
                <Link href="/playlists/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Playlist
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Main Content */}
      <section className="bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Lista de Playlists */}
          {playlists.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ListMusic className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhuma playlist criada</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Cria a tua primeira playlist para organizares as tuas músicas favoritas e partilhares com outros.
                </p>
                <Button asChild>
                  <Link href="/playlists/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeira playlist
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map((playlist) => (
            <Card key={playlist.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-3 text-white">
                    <ListMusic className="h-6 w-6" />
                  </div>
                  
                  <div className="flex items-center gap-1">
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
                </div>
                
                <CardTitle className="line-clamp-2 mt-3">
                  <Link 
                    href={`/playlists/${playlist.id}`}
                    className="hover:underline"
                  >
                    {playlist.name}
                  </Link>
                </CardTitle>
                
                {playlist.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {playlist.description}
                  </p>
                )}
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Music className="h-4 w-4" />
                    <span>{playlist._count.items} música{playlist._count.items !== 1 ? 's' : ''}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>
                      {formatDistanceToNow(new Date(playlist.updatedAt), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-start mt-4">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/playlists/${playlist.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Playlist
                    </Link>
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem asChild>
                        <Link href={`/playlists/${playlist.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600 focus:text-red-600"
                        onClick={() => handleDeletePlaylist(playlist.id, playlist.name)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Playlists Públicas */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Playlists Públicas</h2>
          <Button variant="outline" asChild>
            <Link href="/playlists/explore">
              Ver todas
            </Link>
          </Button>
        </div>
        
        <p className="text-muted-foreground mb-4">
          Descubra playlists criadas por outros usuários da comunidade
        </p>
        
        <Button variant="outline" asChild>
          <Link href="/playlists/explore">
            <Globe className="h-4 w-4 mr-2" />
            Explorar playlists públicas
          </Link>
        </Button>
      </div>
        </div>
      </section>
    </div>
  );
}
