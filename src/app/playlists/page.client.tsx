'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSession } from '@/hooks/useClerkSession';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
      <main className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-stone-900 mb-4">Playlists</h1>
            <p className="text-stone-500 mb-6">Faz login para ver as tuas playlists</p>
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
        <Label className="text-stone-700 text-sm font-medium">Visibilidade</Label>
        <Select value={filterVisibility} onValueChange={setFilterVisibility}>
          <SelectTrigger className="h-9 border-stone-200 bg-white rounded-lg text-stone-900">
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
          className="w-full border-stone-200 text-stone-700 hover:bg-stone-100"
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
    <div className="group rounded-xl border border-stone-200 bg-white hover:shadow-sm transition-all duration-200">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Icon */}
          <div className="shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-stone-50 rounded-lg flex items-center justify-center border border-stone-200">
              <ListMusic className="h-5 w-5 sm:h-6 sm:w-6 text-rose-600" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-stone-900 group-hover:text-rose-700 transition-colors leading-tight">
                  <Link
                    href={`/playlists/${playlist.id}`}
                    className="hover:underline"
                    onClick={() => handleOpenPlaylist(playlist.id)}
                  >
                    {playlist.name}
                  </Link>
                </h3>
                {playlist.description && (
                  <p className="text-xs sm:text-sm text-stone-500 mt-1 line-clamp-1">
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
                  className="h-7 sm:h-8 text-xs px-2 sm:px-3 border-stone-200 text-stone-700 hover:bg-stone-100"
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
                  <Badge variant="outline" className="flex items-center gap-1 text-xs bg-rose-50 text-rose-700 border-rose-200">
                    <Crown className="w-3 h-3" />
                    Proprietário
                  </Badge>
                )}
                {showBadge === 'editor' && (
                  <Badge variant="outline" className="flex items-center gap-1 text-xs bg-stone-50 text-stone-600 border-stone-200">
                    <UserCheck className="w-3 h-3" />
                    Editor
                  </Badge>
                )}
                {showBadge === 'admin' && (
                  <Badge variant="outline" className="flex items-center gap-1 text-xs bg-stone-100 text-stone-700 border-stone-200">
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
              <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>{getMembersCount(playlist)} membro{getMembersCount(playlist) !== 1 ? 's' : ''}</span>
                </div>
                <span className="text-stone-400">
                  Atualizada em {formatDate(playlist.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative w-full min-h-screen bg-white">
      {/* Page Header */}
      <div className="border-b border-stone-100 bg-white pt-20 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-rose-700 text-sm">✝</span>
            <span className="h-px w-6 bg-stone-300" />
            <span className="text-xs font-medium tracking-[0.18em] text-stone-400 uppercase">Coleções de Cânticos</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <h1 className="font-display text-4xl sm:text-5xl text-stone-900 leading-tight">As Minhas Playlists</h1>
            <div className="flex gap-2 pb-1">
              <Button asChild variant="outline" size="sm" className="border-stone-200 text-stone-700 hover:bg-stone-100">
                <Link href="/playlists/explore" onClick={() => trackEvent('playlists_explore_clicked', { source: 'playlists_page' })}>
                  <Globe className="h-4 w-4 mr-2" />Explorar
                </Link>
              </Button>
              <Button asChild size="sm" className="bg-stone-900 hover:bg-rose-700 transition-colors text-white">
                <Link href="/playlists/create" onClick={() => trackEvent('playlist_create_cta_clicked', { source: 'playlists_page' })}>
                  <Plus className="h-4 w-4 mr-2" />Nova Playlist
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">
        {/* Mobile Search Bar */}
        <div className="lg:hidden mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar playlist..."
              className="pl-10 h-10 w-full border-stone-200 bg-white rounded-lg text-stone-900 placeholder:text-stone-400"
            />
          </div>
        </div>

        {/* Mobile Filter Button */}
        <div className="lg:hidden mb-4">
          <Dialog open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-start border-stone-200 text-stone-700 hover:bg-stone-100">
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar playlist..."
                  className="pl-10 h-10 w-full border-stone-200 bg-white rounded-lg text-stone-900 placeholder:text-stone-400"
                />
              </div>

              {/* Sidebar Filter Panel */}
              <div className="rounded-xl border border-stone-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/50">
                  <p className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-stone-400" />Filtros
                  </p>
                </div>
                <div className="px-4 py-4 space-y-4">
                  {renderFilterContent()}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Results count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-stone-500">
                <span className="font-medium text-stone-900">{filteredPlaylists.length}</span>
                {' '}playlist{filteredPlaylists.length !== 1 ? 's' : ''}
              </p>
            </div>

            {filteredPlaylists.length === 0 ? (
              <div className="text-center py-16 rounded-xl border border-stone-200">
                <ListMusic className="h-10 w-10 mx-auto mb-3 text-stone-200" />
                <p className="text-base font-semibold text-stone-900 mb-1">
                  {playlists.length === 0 ? 'Nenhuma playlist criada' : 'Nenhuma playlist encontrada'}
                </p>
                <p className="text-sm text-stone-500 max-w-sm mx-auto mb-6">
                  {playlists.length === 0
                    ? 'Cria a tua primeira playlist para começar a organizar as tuas músicas favoritas.'
                    : 'Tenta ajustar os filtros ou procurar por outros termos.'
                  }
                </p>
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
              </div>
            ) : (
              <div className="space-y-6">
                {/* Owned Playlists */}
                {ownedPlaylists.length > 0 && (
                  <section>
                    <h2 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-rose-700" />
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
                    <h2 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                      <Settings className="w-4 h-4 text-stone-500" />
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
                    <h2 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-stone-500" />
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

function PlaylistsPage({ initialPlaylists }: PlaylistsClientProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-stone-100 rounded"></div>
            <div className="h-4 w-64 bg-stone-100 rounded"></div>
            <div className="grid grid-cols-1 gap-4 mt-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-stone-100 rounded-xl"></div>
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
