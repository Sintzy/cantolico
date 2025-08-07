import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ListMusic, 
  Plus, 
  Clock, 
  Globe, 
  Lock,
  Music
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default async function MyPlaylistsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  const playlists = await prisma.playlist.findMany({
    where: {
      userId: session.user.id
    },
    include: {
      _count: {
        select: {
          items: true
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Minhas Playlists</h1>
          <p className="text-muted-foreground">
            Gerencie suas coleções de músicas
          </p>
        </div>
        
        <Button asChild>
          <Link href="/playlists/create">
            <Plus className="h-4 w-4 mr-2" />
            Nova Playlist
          </Link>
        </Button>
      </div>

      {/* Lista de Playlists */}
      {playlists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListMusic className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma playlist criada</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Crie sua primeira playlist para organizar suas músicas favoritas e compartilhar com outros.
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
                
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" className="flex-1" asChild>
                    <Link href={`/playlists/${playlist.id}`}>
                      Ver Playlist
                    </Link>
                  </Button>
                  
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/playlists/${playlist.id}/edit`}>
                      Editar
                    </Link>
                  </Button>
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
  );
}
