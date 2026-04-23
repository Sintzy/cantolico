'use client';

import React, { useState, useCallback } from 'react';
import { useSession } from '@/hooks/useClerkSession';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Globe,
  Lock,
  Eye,
  MoreVertical,
  Trash2,
  Edit,
  Music,
  Plus,
  ArrowLeft,
  Calendar,
  Church,
  User,
  FileText,
  Presentation,
  Copy,
  Search,
  X,
  GripVertical,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download
} from 'lucide-react';
import {
  Mass,
  MassItem,
  MassVisibility,
  LiturgicalMoment,
  LITURGICAL_MOMENTS,
  LITURGICAL_MOMENT_LABELS,
  LITURGICAL_MOMENT_ORDER,
  getMassVisibilityLabel,
  formatMassDate,
  formatMassTime,
  getColorHex,
  LiturgicalColor,
} from '@/types/mass';
import EditMassModal from '@/components/EditMassModal';
import ExportMassModal from '@/components/ExportMassModal';
import ExportOptionsModal from '@/components/ExportOptionsModal';
import { trackEvent } from '@/lib/umami';

interface MassPageClientProps {
  initialMass: Mass & { isOwner: boolean; canEdit?: boolean };
}

export default function MassPageClient({ initialMass }: MassPageClientProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [mass, setMass] = useState(initialMass);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddSongModal, setShowAddSongModal] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<LiturgicalMoment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [defaultSongList, setDefaultSongList] = useState<any[]>([]);

  // Carregar lista de músicas por default ao abrir modal
  React.useEffect(() => {
    if (showAddSongModal && defaultSongList.length === 0) {
      fetch('/api/musics?limit=30')
        .then(res => res.ok ? res.json() : Promise.reject('Erro ao carregar músicas'))
        .then(data => setDefaultSongList(data.songs || []))
        .catch(() => setDefaultSongList([]));
    }
  }, [showAddSongModal, defaultSongList.length]);
  const [expandedMoments, setExpandedMoments] = useState<Set<string>>(new Set(LITURGICAL_MOMENTS));
  const [addingItemId, setAddingItemId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const isOwner = session?.user?.id === mass.userId;
  const isAdmin = session?.user?.role === 'ADMIN';
  const canEdit = isOwner || isAdmin || mass.canEdit;

  React.useEffect(() => {
    trackEvent('mass_page_view', { massId: initialMass.id });
  }, [initialMass.id]);

  const getVisibilityIcon = (visibility: MassVisibility) => {
    switch (visibility) {
      case 'PUBLIC': return <Globe className="w-4 h-4" />;
      case 'PRIVATE': return <Lock className="w-4 h-4" />;
      case 'NOT_LISTED': return <Eye className="w-4 h-4" />;
      default: return <Lock className="w-4 h-4" />;
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tens a certeza que queres apagar esta missa? Esta ação não pode ser desfeita.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/masses/${mass.id}`, { method: 'DELETE' });
      if (response.ok) {
        trackEvent('mass_deleted_success', { source: 'mass_page' });
        toast.success('Missa apagada com sucesso');
        router.push('/missas');
      } else {
        trackEvent('mass_deleted_failed', { source: 'mass_page' });
        toast.error('Erro ao apagar missa');
      }
    } catch (error) {
      console.error('Error deleting mass:', error);
      trackEvent('mass_deleted_failed', { source: 'mass_page', reason: 'network_error' });
      toast.error('Erro ao apagar missa');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const response = await fetch(`/api/masses/${mass.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (response.ok) {
        const newMass = await response.json();
        trackEvent('mass_duplicated_success', { source: 'mass_page' });
        toast.success('Missa duplicada com sucesso');
        router.push(`/missas/${newMass.id}`);
      } else {
        trackEvent('mass_duplicated_failed', { source: 'mass_page' });
        toast.error('Erro ao duplicar missa');
      }
    } catch (error) {
      console.error('Error duplicating mass:', error);
      trackEvent('mass_duplicated_failed', { source: 'mass_page', reason: 'network_error' });
      toast.error('Erro ao duplicar missa');
    }
  };

  const handleMassUpdate = (updatedMass: Partial<Mass>) => {
    setMass(prev => ({
      ...prev,
      ...updatedMass
    }));
  };

  const handleMassDelete = () => {
    router.push('/missas');
  };

  const searchSongs = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    trackEvent('mass_song_search', { source: 'mass_page' });
    try {
      const response = await fetch(`/api/musics/search?q=${encodeURIComponent(query)}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.songs || []);
      }
    } catch (error) {
      console.error('Error searching songs:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleAddSong = async (songId: string) => {
    if (!selectedMoment) return;

    setAddingItemId(songId);
    try {
      const response = await fetch(`/api/masses/${mass.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, moment: selectedMoment })
      });

      if (response.ok) {
        const newItem = await response.json();
        trackEvent('mass_song_added', { source: 'mass_page' });
        setMass(prev => ({
          ...prev,
          items: [...(prev.items || []), newItem]
        }));
        toast.success('Música adicionada');
        setShowAddSongModal(false);
        setSearchQuery('');
        setSearchResults([]);
      } else {
        const error = await response.json();
        trackEvent('mass_song_add_failed', { source: 'mass_page', reason: error.error || 'request_failed' });
        toast.error(error.error || 'Erro ao adicionar música');
      }
    } catch (error) {
      console.error('Error adding song:', error);
      trackEvent('mass_song_add_failed', { source: 'mass_page', reason: 'network_error' });
      toast.error('Erro ao adicionar música');
    } finally {
      setAddingItemId(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/masses/${mass.id}/items/${itemId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        trackEvent('mass_song_removed', { source: 'mass_page' });
        setMass(prev => ({
          ...prev,
          items: (prev.items || []).filter(item => item.id !== itemId)
        }));
        toast.success('Música removida');
      } else {
        trackEvent('mass_song_remove_failed', { source: 'mass_page' });
        toast.error('Erro ao remover música');
      }
    } catch (error) {
      console.error('Error removing item:', error);
      trackEvent('mass_song_remove_failed', { source: 'mass_page', reason: 'network_error' });
      toast.error('Erro ao remover música');
    }
  };

  const toggleMoment = (moment: string) => {
    setExpandedMoments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moment)) {
        newSet.delete(moment);
      } else {
        newSet.add(moment);
      }
      return newSet;
    });
  };

  const openAddSongModal = (moment: LiturgicalMoment) => {
    setSelectedMoment(moment);
    setShowAddSongModal(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Group items by moment
  const itemsByMoment: Record<string, MassItem[]> = {};
  for (const item of mass.items || []) {
    if (!itemsByMoment[item.moment]) {
      itemsByMoment[item.moment] = [];
    }
    itemsByMoment[item.moment].push(item);
  }

  // Sort moments
  const sortedMoments = Object.keys(itemsByMoment).sort((a, b) => {
    const orderA = LITURGICAL_MOMENT_ORDER[a as LiturgicalMoment] || 99;
    const orderB = LITURGICAL_MOMENT_ORDER[b as LiturgicalMoment] || 99;
    return orderA - orderB;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Page header */}
      <div className="border-b border-stone-100">
        <div className="mx-auto max-w-screen-xl px-5 py-4 flex items-center justify-between">
          <Link
            href="/missas"
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Missas
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-stone-200 text-stone-600 hover:bg-stone-50 gap-1.5"
              onClick={() => setShowExportModal(true)}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-stone-500 hover:text-stone-900">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <>
                    <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar detalhes
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
                {canEdit && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Apagar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mass info */}
      <div className="border-b border-stone-100">
        <div className="mx-auto max-w-screen-xl px-5 py-10 sm:py-14">
          {/* liturgical colour accent bar */}
          {mass.liturgicalColor && (
            <div
              className="mb-6 h-1 w-12 rounded-full"
              style={{ backgroundColor: getColorHex(mass.liturgicalColor as LiturgicalColor) }}
            />
          )}

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-rose-700 text-sm">✝</span>
                <span className="h-px w-6 bg-stone-300" />
                <span className="text-xs font-medium tracking-[0.18em] text-stone-500 uppercase">
                  Planificação Litúrgica
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl text-stone-900 leading-tight">
                {mass.name}
              </h1>
              {mass.celebration && (
                <p className="mt-1 text-base text-stone-500">{mass.celebration}</p>
              )}
              {mass.description && (
                <p className="mt-3 text-sm text-stone-500 max-w-2xl">{mass.description}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className="bg-stone-100 text-stone-600 border border-stone-200 text-xs font-sans">BETA</Badge>
                <Badge variant="outline" className="flex items-center gap-1 text-xs bg-stone-50 text-stone-500 border-stone-200">
                  {getVisibilityIcon(mass.visibility)}
                  {getMassVisibilityLabel(mass.visibility)}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1 text-xs bg-stone-50 text-stone-500 border-stone-200">
                  <Music className="w-3 h-3" />
                  {mass._count?.items || 0} músicas
                </Badge>
                {mass.user && (
                  <Badge variant="outline" className="text-xs bg-stone-50 text-stone-500 border-stone-200">
                    por {mass.user.name || 'Utilizador'}
                  </Badge>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-xs text-stone-400">
                {mass.date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatMassDate(mass.date)}
                    {formatMassTime(mass.date) && <span>· {formatMassTime(mass.date)}</span>}
                  </div>
                )}
                {mass.parish && (
                  <div className="flex items-center gap-1.5">
                    <Church className="w-3.5 h-3.5" />
                    {mass.parish}
                  </div>
                )}
                {mass.celebrant && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {mass.celebrant}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Moments and Songs */}
      <div className="mx-auto max-w-screen-xl px-5 py-8">
        <div className="space-y-2">
          {LITURGICAL_MOMENTS.map((moment) => {
            const items = itemsByMoment[moment] || [];
            const isExpanded = expandedMoments.has(moment);
            const hasItems = items.length > 0;

            if (!hasItems && !canEdit) return null;

            return (
              <div
                key={moment}
                className={`rounded-xl border border-stone-200 overflow-hidden transition-opacity ${!hasItems && canEdit ? 'opacity-50' : ''}`}
              >
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors"
                  onClick={() => toggleMoment(moment)}
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-stone-900">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-stone-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-stone-400" />
                    )}
                    {LITURGICAL_MOMENT_LABELS[moment]}
                    {hasItems && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-stone-100 px-1.5 text-xs text-stone-500">
                        {items.length}
                      </span>
                    )}
                  </span>
                  {canEdit && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openAddSongModal(moment); }}
                      className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 rounded-md border border-stone-200 px-2 py-1 hover:bg-stone-100 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Adicionar
                    </button>
                  )}
                </button>

                {isExpanded && hasItems && (
                  <div className="border-t border-stone-100 divide-y divide-stone-100">
                    {items.map((item, index) => {
                      return (
                        <div key={item.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors">
                          <span className="text-xs text-stone-400 w-5 text-center font-mono shrink-0">{index + 1}</span>
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/musics/${item.song?.slug || item.songId}?massId=${mass.id}`}
                              className="font-medium text-stone-900 hover:text-rose-700 truncate block text-sm transition-colors"
                            >
                              {item.song?.title || 'Música desconhecida'}
                            </Link>
                            {item.song?.author && (
                              <p className="text-xs text-stone-400 truncate">{item.song.author}</p>
                            )}
                            {item.note && (
                              <p className="text-xs text-stone-400 mt-0.5 italic">{item.note}</p>
                            )}
                          </div>
                          {item.transpose !== 0 && (
                            <Badge variant="outline" className="text-xs shrink-0 bg-stone-50 text-stone-500 border-stone-200">
                              {item.transpose > 0 ? '+' : ''}{item.transpose}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Button variant="ghost" size="sm" asChild className="h-7 w-7 p-0 text-stone-400 hover:text-stone-700">
                              <Link href={`/musics/${item.song?.slug || item.songId}?massId=${mass.id}`}>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </Button>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(item.id)}
                                className="h-7 w-7 p-0 text-stone-400 hover:text-red-500 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Song Modal */}
      <Dialog open={showAddSongModal} onOpenChange={setShowAddSongModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Adicionar música — {selectedMoment && LITURGICAL_MOMENT_LABELS[selectedMoment]}
            </DialogTitle>
            <DialogDescription>
              Pesquisa e seleciona uma música para adicionar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input
                placeholder="Pesquisar músicas..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); searchSongs(e.target.value); }}
                className="pl-10 border-stone-200"
                autoFocus
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1">
              {isSearching ? (
                <p className="text-center text-stone-500 text-sm py-4">A pesquisar...</p>
              ) : (searchQuery ? searchResults : defaultSongList).length > 0 ? (
                (searchQuery ? searchResults : defaultSongList).map((song) => (
                  <button
                    key={song.id}
                    onClick={() => handleAddSong(song.id)}
                    disabled={addingItemId === song.id}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-stone-50 border border-transparent hover:border-stone-200 transition-colors disabled:opacity-50"
                  >
                    <p className="font-medium text-stone-900 text-sm">{song.title}</p>
                    {song.tags && song.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {song.tags.slice(0, 3).map((tag: string, i: number) => (
                          <span key={i} className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <p className="text-center text-stone-500 text-sm py-4">
                  {searchQuery ? 'Nenhuma música encontrada' : 'Escreve para pesquisar músicas'}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSongModal(false)} className="border-stone-200 text-stone-700">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Options Modal */}
      <ExportOptionsModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        massId={mass.id}
      />

      {/* Edit Mass Modal */}
      <EditMassModal
        mass={mass}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdate={handleMassUpdate}
        onDelete={handleMassDelete}
      />
    </div>
  );
}
