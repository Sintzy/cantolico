'use client';

import React, { useState, useCallback } from 'react';
import { useSession } from '@/hooks/useClerkSession';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        toast.success('Missa apagada com sucesso');
        router.push('/missas');
      } else {
        toast.error('Erro ao apagar missa');
      }
    } catch (error) {
      console.error('Error deleting mass:', error);
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
        toast.success('Missa duplicada com sucesso');
        router.push(`/missas/${newMass.id}`);
      } else {
        toast.error('Erro ao duplicar missa');
      }
    } catch (error) {
      console.error('Error duplicating mass:', error);
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
        toast.error(error.error || 'Erro ao adicionar música');
      }
    } catch (error) {
      console.error('Error adding song:', error);
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
        setMass(prev => ({
          ...prev,
          items: (prev.items || []).filter(item => item.id !== itemId)
        }));
        toast.success('Música removida');
      } else {
        toast.error('Erro ao remover música');
      }
    } catch (error) {
      console.error('Error removing item:', error);
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
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 w-full flex items-center justify-center overflow-hidden -mt-16">
        <div className="absolute inset-0">
          <div 
            className="w-full h-full"
            style={{ 
              background: mass.liturgicalColor 
                ? `linear-gradient(135deg, ${getColorHex(mass.liturgicalColor as LiturgicalColor)}40, ${getColorHex(mass.liturgicalColor as LiturgicalColor)}20)`
                : 'linear-gradient(135deg, #1e40af40, #1e40af20)'
            }}
          />
          <div className="absolute inset-0 bg-linear-to-b from-black/40 to-transparent" />
        </div>

        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="absolute top-20 left-4 sm:top-24 sm:left-6 z-20 text-white hover:bg-white/20 backdrop-blur-sm"
        >
          <Link href="/missas" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Voltar</span>
          </Link>
        </Button>

        {/* Actions Menu */}
        <div className="absolute top-20 right-4 sm:top-24 sm:right-6 z-20 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowExportModal(true)}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 backdrop-blur-sm">
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

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 pt-16">
          <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg mb-2">
            {mass.name}
          </h1>
          {mass.celebration && (
            <p className="text-white/90 text-lg">{mass.celebration}</p>
          )}
          
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <Badge variant="secondary" className="flex items-center gap-1 bg-white/90">
              {getVisibilityIcon(mass.visibility)}
              {getMassVisibilityLabel(mass.visibility)}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1 bg-white/90">
              <Music className="w-3 h-3" />
              {mass._count?.items || 0} músicas
            </Badge>
            {mass.user && (
              <Badge variant="secondary" className="bg-white/90">
                por {mass.user.name || 'Utilizador'}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Mass Info */}
      <div className="bg-gray-50 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {mass.date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatMassDate(mass.date)}
                {formatMassTime(mass.date) && (
                  <span className="text-gray-400">• {formatMassTime(mass.date)}</span>
                )}
              </div>
            )}
            {mass.parish && (
              <div className="flex items-center gap-2">
                <Church className="w-4 h-4" />
                {mass.parish}
              </div>
            )}
            {mass.celebrant && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {mass.celebrant}
              </div>
            )}
          </div>
          {mass.description && (
            <p className="text-gray-600 mt-2">{mass.description}</p>
          )}
        </div>
      </div>

      {/* Export Buttons */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 border-b">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/missas/${mass.id}/export?format=lyrics`}>
              <FileText className="w-4 h-4 mr-2" />
              PDF Letras
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowExportModal(true)}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Moments and Songs */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          {LITURGICAL_MOMENTS.map((moment) => {
            const items = itemsByMoment[moment] || [];
            const isExpanded = expandedMoments.has(moment);
            const hasItems = items.length > 0;

            // Só mostra o card se houver músicas OU se pode editar
            if (!hasItems && !canEdit) return null;

            return (
              <Card key={moment} className={!hasItems && canEdit ? 'opacity-60' : ''}>
                <CardHeader 
                  className="py-3 cursor-pointer"
                  onClick={() => toggleMoment(moment)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                      {LITURGICAL_MOMENT_LABELS[moment]}
                      {hasItems && (
                        <Badge variant="secondary" className="text-xs">
                          {items.length}
                        </Badge>
                      )}
                    </CardTitle>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddSongModal(moment);
                        }}
                        className="h-8"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar
                      </Button>
                    )}
                  </div>
                </CardHeader>
                {isExpanded && hasItems && (
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {items.map((item, index) => {
                        // Lógica para próxima música do próximo momento
                        let nextLink = null;
                        const momentIdx = sortedMoments.indexOf(moment);
                        let found = false;
                        for (let m = momentIdx; m < sortedMoments.length; m++) {
                          const nextMoment = sortedMoments[m];
                          const nextItems = itemsByMoment[nextMoment] || [];
                          for (let i = 0; i < nextItems.length; i++) {
                            if (found) {
                              nextLink = `/musics/${nextItems[i].song?.slug || nextItems[i].songId}`;
                              break;
                            }
                            if (nextMoment === moment && nextItems[i].id === item.id) {
                              found = true;
                            }
                          }
                          if (nextLink) break;
                        }
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group relative"
                          >
                            <span className="text-sm text-gray-400 w-6 text-center">
                              {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/musics/${item.song?.slug || item.songId}?massId=${mass.id}`}
                                className="font-medium text-gray-900 hover:text-blue-600 truncate block"
                              >
                                {item.song?.title || 'Música desconhecida'}
                              </Link>
                              {item.song?.author && (
                                <p className="text-sm text-gray-500 truncate">
                                  {item.song.author}
                                </p>
                              )}
                              {item.note && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {item.note}
                                </p>
                              )}
                            </div>
                            {item.transpose !== 0 && (
                              <Badge variant="outline" className="text-xs">
                                {item.transpose > 0 ? '+' : ''}{item.transpose}
                              </Badge>
                            )}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="h-8 w-8 p-0"
                              >
                                <Link href={`/musics/${item.song?.slug || item.songId}?massId=${mass.id}`}>
                                  <ExternalLink className="w-4 h-4" />
                                </Link>
                              </Button>
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                            {/* Botão de próxima música */}
                            {nextLink && (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="absolute right-2 bottom-2 text-xs px-2 py-1"
                                title="Próxima música"
                              >
                                <Link href={nextLink}>
                                  Próxima música →
                                </Link>
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Add Song Modal - Simples, sem cruz extra */}
      <Dialog open={showAddSongModal} onOpenChange={setShowAddSongModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Adicionar música - {selectedMoment && LITURGICAL_MOMENT_LABELS[selectedMoment]}
            </DialogTitle>
            <DialogDescription>
              Pesquisa e seleciona uma música para adicionar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Pesquisar músicas..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchSongs(e.target.value);
                }}
                className="pl-10"
                autoFocus
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1">
              {isSearching ? (
                <p className="text-center text-gray-500 py-4">A pesquisar...</p>
              ) : (searchQuery ? searchResults : defaultSongList).length > 0 ? (
                (searchQuery ? searchResults : defaultSongList).map((song) => (
                  <button
                    key={song.id}
                    onClick={() => handleAddSong(song.id)}
                    disabled={addingItemId === song.id}
                    className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    <p className="font-medium text-gray-900">{song.title}</p>
                    {song.tags && song.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {song.tags.slice(0, 3).map((tag: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </button>
                ))
              ) : searchQuery ? (
                <p className="text-center text-gray-500 py-4">
                  Nenhuma música encontrada
                </p>
              ) : (
                <p className="text-center text-gray-500 py-4">
                  Escreve para pesquisar músicas
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSongModal(false)}>
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
