'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Music, 
  Users, 
  Lock, 
  Globe, 
  Crown, 
  UserCheck, 
  Settings, 
  Edit,
  Search,
  SlidersHorizontal,
  MoreVertical,
  ListMusic
} from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import EditPlaylistModal from '../../components/EditPlaylistModal';
import { trackEvent } from '@/lib/umami';

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

interface PlaylistsClientProps {
  initialPlaylists: Playlist[];
}

function PlaylistsContent({ initialPlaylists }: PlaylistsClientProps) {
  const safeInitialPlaylists = Array.isArray(initialPlaylists) ? initialPlaylists : [];
  
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [playlists, setPlaylists] = useState<Playlist[]>(safeInitialPlaylists);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<string>('ALL');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  useEffect(() => {
    trackEvent('playlists_list_view', { initialCount: safeInitialPlaylists.length });
  }, []);

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
    
    if (inviteAccepted || error) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  if (!session?.user) {
    return (
      <main className="min-h-screen bg-white -mt-16 pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Playlists</h1>
            <p className="text-gray-600 mb-6">Faz login para ver as tuas playlists</p>
            <Button asChild>
              <Link href="/login">Fazer Login</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const handleEditPlaylist = (playlist: Playlist) => {
    trackEvent('playlist_edit_opened', { source: 'playlists_list' });
    setSelectedPlaylist(playlist);
    setEditModalOpen(true);
  };

  const handleOpenPlaylist = (playlistId: string) => {
    trackEvent('playlist_opened', { source: 'playlists_list', playlistId });
  };

  // Filter playlists
  const filteredPlaylists = playlists.filter(playlist => {
    const matchesSearch = !searchTerm || 
      playlist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (playlist.description && playlist.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesVisibility = filterVisibility === 'ALL' || 
      (filterVisibility === 'PUBLIC' && playlist.isPublic) ||
      (filterVisibility === 'PRIVATE' && !playlist.isPublic);
    
    return matchesSearch && matchesVisibility;
  });

  const ownedPlaylists = filteredPlaylists.filter(p => p.userRole === 'owner');
  const memberPlaylists = filteredPlaylists.filter(p => p.userRole === 'editor');
  const allPlaylistsForAdmin = filteredPlaylists.filter(p => p.userRole === 'admin');

  const clearFilters = () => {
    trackEvent('playlists_filters_cleared');
    setSearchTerm('');
    setFilterVisibility('ALL');
    setIsMobileFiltersOpen(false);
  };

  const renderFilterContent = () => (
    <div className="space-y-4">
      {/* Visibility */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Visibilidade</Label>
        <Select value={filterVisibility} onValueChange={setFilterVisibility}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="PUBLIC">Públicas</SelectItem>
            <SelectItem value="PRIVATE">Privadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clear filters */}
      {(searchTerm || filterVisibility !== 'ALL') && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearFilters}
          className="w-full"
        >
          Limpar filtros
        </Button>
      )}
    </div>
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getMembersCount = (playlist: Playlist) => {
    if (!playlist.members) return 1;
    return playlist.members.filter(m => m.status === 'accepted').length;
  };

  const PlaylistCard = ({ playlist, showBadge }: { playlist: Playlist; showBadge?: 'owner' | 'editor' | 'admin' }) => (
    <Card className="group hover:shadow-md transition-all duration-200 border border-border bg-card">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Icon */}
          <div className="shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-linear-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center border border-border">
              <ListMusic className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                  <Link 
                    href={`/playlists/${playlist.id}`}
                    className="hover:underline"
                    onClick={() => handleOpenPlaylist(playlist.id)}
                  >
                    {playlist.name}
                  </Link>
                </h3>
                {playlist.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-1">
                    {playlist.description}
                  </p>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2 sm:ml-4">
                {playlist.userRole === 'owner' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditPlaylist(playlist)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button 
                  asChild 
                  variant="outline"
                  size="sm"
                  className="h-7 sm:h-8 text-xs px-2 sm:px-3"
                >
                  <Link href={`/playlists/${playlist.id}`} onClick={() => handleOpenPlaylist(playlist.id)}>
                    <span className="hidden sm:inline">Ver Playlist</span>
                    <span className="sm:hidden">Ver</span>
                  </Link>
                </Button>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-3">
              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                {showBadge === 'owner' && (
                  <Badge variant="outline" className="flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                    <Crown className="w-3 h-3" />
                    Proprietário
                  </Badge>
                )}
                {showBadge === 'editor' && (
                  <Badge variant="outline" className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border-blue-200">
                    <UserCheck className="w-3 h-3" />
                    Editor
                  </Badge>
                )}
                {showBadge === 'admin' && (
                  <Badge variant="outline" className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border-purple-200">
                    <Settings className="w-3 h-3" />
                    Admin
                  </Badge>
                )}
                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                  {playlist.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {playlist.isPublic ? 'Pública' : 'Privada'}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  <Music className="w-3 h-3" />
                  {playlist.songsCount} música{playlist.songsCount !== 1 ? 's' : ''}
                </Badge>
              </div>

              {/* Details */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>{getMembersCount(playlist)} membro{getMembersCount(playlist) !== 1 ? 's' : ''}</span>
                </div>
                <span className="text-muted-foreground/60">
                  Atualizada em {formatDate(playlist.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <main className="min-h-screen bg-white -mt-16">
      {/* Hero Section */}
      <section className="relative bg-white pt-16">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/2 top-0 -translate-x-1/2">
            <div className="h-80 w-80 rounded-full bg-linear-to-br from-rose-50 via-white to-amber-50" />
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16 relative z-10">
          <div className="text-center mb-6 sm:mb-8 md:mb-12">
            {/* Decorative border */}
            <div className="mb-4 border-y border-slate-200">
              <div className="-mx-0.5 flex justify-center -space-x-2 py-2">
                <div className="w-6 h-6 bg-linear-to-r from-rose-500 to-pink-600 rounded-full flex items-center justify-center">
                  <ListMusic className="text-white text-xs w-3 h-3" />
                </div>
                <div className="w-6 h-6 bg-linear-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Music className="text-white text-xs w-3 h-3" />
                </div>
                <div className="w-6 h-6 bg-linear-to-r from-rose-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Users className="text-white text-xs w-3 h-3" />
                </div>
              </div>
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
              As Minhas Playlists
            </h1>
            <p className="text-base sm:text-lg text-gray-700 max-w-2xl mx-auto px-4">
              Gere e organiza as tuas coleções de cânticos
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button asChild variant="outline" size="sm">
                <Link href="/playlists/explore" onClick={() => trackEvent('playlists_explore_clicked', { source: 'playlists_page' })}>
                  <Globe className="h-4 w-4 mr-2" />
                  Explorar
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/playlists/create" onClick={() => trackEvent('playlist_create_cta_clicked', { source: 'playlists_page' })}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Playlist
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Main Content */}
      <section className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
          {/* Mobile Search Bar */}
          <div className="lg:hidden mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar playlist..."
                className="pl-10 h-10 w-full"
              />
            </div>
          </div>

          {/* Mobile Filter Button */}
          <div className="lg:hidden mb-4">
            <Dialog open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filtros
                  {filterVisibility !== 'ALL' && (
                    <Badge variant="secondary" className="ml-auto">1</Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full max-w-sm mx-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filtros
                  </DialogTitle>
                </DialogHeader>
                <div className="mt-6">
                  {renderFilterContent()}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex gap-6 lg:gap-8">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-80 shrink-0">
              <div className="sticky top-24 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Pesquisar playlist..."
                    className="pl-10 h-10 w-full"
                  />
                </div>

                <Card className="border border-border shadow-sm bg-background">
                  <CardHeader className="pb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-md">
                        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-base font-medium text-foreground">Filtros</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    {renderFilterContent()}
                  </CardContent>
                </Card>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Results count */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{filteredPlaylists.length}</span>
                  {' '}playlist{filteredPlaylists.length !== 1 ? 's' : ''}
                </p>
              </div>

              {filteredPlaylists.length === 0 ? (
                <Card className="text-center py-16 border border-border">
                  <CardContent>
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Music className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-lg mb-2 text-foreground font-medium">
                      {playlists.length === 0 ? 'Nenhuma playlist criada' : 'Nenhuma playlist encontrada'}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground max-w-md mx-auto text-sm mb-6">
                      {playlists.length === 0 
                        ? 'Cria a tua primeira playlist para começar a organizar as tuas músicas favoritas.'
                        : 'Tenta ajustar os filtros ou procurar por outros termos.'
                      }
                    </CardDescription>
                    {playlists.length === 0 && (
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
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Owned Playlists */}
                  {ownedPlaylists.length > 0 && (
                    <section>
                      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Crown className="w-5 h-5 text-yellow-600" />
                        Minhas Playlists
                        <Badge variant="secondary">{ownedPlaylists.length}</Badge>
                      </h2>
                      <div className="space-y-3">
                        {ownedPlaylists.map((playlist) => (
                          <PlaylistCard key={playlist.id} playlist={playlist} showBadge="owner" />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Admin: All Playlists */}
                  {session.user.role === 'ADMIN' && allPlaylistsForAdmin.length > 0 && (
                    <section>
                      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-gray-700" />
                        Todas as Playlists (Admin)
                        <Badge variant="secondary">{allPlaylistsForAdmin.length}</Badge>
                      </h2>
                      <div className="space-y-3">
                        {allPlaylistsForAdmin.map((playlist) => (
                          <PlaylistCard key={playlist.id} playlist={playlist} showBadge="admin" />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Member Playlists */}
                  {memberPlaylists.length > 0 && (
                    <section>
                      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-blue-600" />
                        Playlists Colaborativas
                        <Badge variant="secondary">{memberPlaylists.length}</Badge>
                      </h2>
                      <div className="space-y-3">
                        {memberPlaylists.map((playlist) => (
                          <PlaylistCard key={playlist.id} playlist={playlist} showBadge="editor" />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

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
    </main>
  );
}

function PlaylistsPage({ initialPlaylists }: PlaylistsClientProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white -mt-16 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-gray-200 rounded"></div>
            <div className="h-4 w-64 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-1 gap-4 mt-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    }>
      <PlaylistsContent initialPlaylists={initialPlaylists} />
    </Suspense>
  );
}

export default function PlaylistsClient({ initialPlaylists }: PlaylistsClientProps) {
  return <PlaylistsPage initialPlaylists={initialPlaylists} />;
}
