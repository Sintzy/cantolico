
import Link from 'next/link';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ListMusic, 
  Clock, 
  Globe, 
  Music,
  User
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default async function ExplorePlaylistsPage() {
  const { data: publicPlaylists = [] } = await supabase
    .from('Playlist')
    .select(`
      *,
      User!Playlist_userId_fkey (
        id,
        name,
        image
      )
    `)
    .eq('isPublic', true)
    .order('updatedAt', { ascending: false })
    .limit(50);

  // Buscar contagem de itens para cada playlist
  const playlistsWithCounts = await Promise.all(
    (publicPlaylists || []).map(async (playlist) => {
      const { count } = await supabase
        .from('PlaylistItem')
        .select('*', { count: 'exact', head: true })
        .eq('playlistId', playlist.id);
      
      return {
        ...playlist,
        _count: { items: count || 0 }
      };
    })
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-gradient-to-br from-green-500 to-blue-600 rounded-lg p-3 text-white">
            <Globe className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Playlists Públicas</h1>
            <p className="text-muted-foreground">
              Descubra coleções de músicas criadas pela comunidade
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Playlists */}
      {playlistsWithCounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma playlist pública</h3>
            <p className="text-muted-foreground text-center">
              Ainda não há playlists públicas disponíveis. Seja o primeiro a compartilhar uma!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlistsWithCounts.map((playlist: any) => (
            <Card key={playlist.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="bg-gradient-to-br from-green-500 to-blue-600 rounded-lg p-3 text-white">
                    <ListMusic className="h-6 w-6" />
                  </div>
                  
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <Globe className="h-3 w-3 mr-1" />
                    Pública
                  </Badge>
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
              
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Por {playlist.User.name}</span>
                </div>
                
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
                
                <Button className="w-full" asChild>
                  <Link href={`/playlists/${playlist.id}`}>
                    <ListMusic className="h-4 w-4 mr-2" />
                    Ver Playlist
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Call to Action */}
      <div className="mt-12 text-center">
        <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
          <CardContent className="py-8">
            <h2 className="text-2xl font-bold mb-4">Cria a tua própria playlist</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Organiza as tuas músicas favoritas e partilha com a comunidade. 
              As tuas playlists podem ser privadas (só tu vês) ou públicas (qualquer pessoa com o link pode ver).
            </p>
            <Button size="lg" asChild>
              <Link href="/playlists">
                <ListMusic className="h-4 w-4 mr-2" />
                Ir para Minhas Playlists
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
