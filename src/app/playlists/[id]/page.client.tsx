'use client';

import { useState } from 'react';
import { useSession } from '@/hooks/useClerkSession';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StarButton from '@/components/StarButton';
import PlaylistEditItems from '@/components/PlaylistEditItems';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  ListMusic,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import PlaylistEditModal from '@/components/PlaylistEditModal';

interface PlaylistItem {
  id: string;
  order: number;
  songId: string;
  note?: string | null;
  song?: {
    id: string;
    title: string;
    slug: string;
    tags?: string[];
  } | null;
}

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean | null;
  visibility: 'PUBLIC' | 'PRIVATE' | 'NOT_LISTED';
  userId: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string;
    image?: string;
  } | null;
  items: PlaylistItem[];
}

interface PlaylistPageClientProps {
  initialPlaylist: Playlist;
}

export default function PlaylistPageClient({ initialPlaylist }: PlaylistPageClientProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [playlist, setPlaylist] = useState<Playlist>(initialPlaylist);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = session?.user?.id === playlist.userId;
  const isAdmin = session?.user?.role === 'ADMIN';
  const canEdit = isOwner || isAdmin;

  const visibilityConfig = {
    PUBLIC:     { icon: <Globe className="w-3 h-3" />,  label: 'Pública',      cls: 'bg-stone-100 text-stone-600 border-stone-200' },
    PRIVATE:    { icon: <Lock className="w-3 h-3" />,   label: 'Privada',      cls: 'bg-stone-100 text-stone-600 border-stone-200' },
    NOT_LISTED: { icon: <EyeOff className="w-3 h-3" />, label: 'Não listada',  cls: 'bg-stone-100 text-stone-600 border-stone-200' },
  };
  const vis = visibilityConfig[playlist.visibility] ?? visibilityConfig.PRIVATE;

  const handleDeletePlaylist = async () => {
    if (!confirm('Tens a certeza que queres eliminar esta playlist? Esta ação não pode ser desfeita.')) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/playlists/${playlist.id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Playlist eliminada');
        router.push('/playlists');
      } else {
        toast.error('Erro ao eliminar playlist');
      }
    } catch {
      toast.error('Erro ao eliminar playlist');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePlaylistUpdate = () => {
    setEditModalOpen(false);
    router.refresh();
  };

  const handleItemsChange = (updatedItems: PlaylistItem[]) => {
    setPlaylist(prev => ({ ...prev, items: updatedItems }));
  };

  const handleSaveEdits = async () => {
    try {
      const response = await fetch(`/api/playlists/${playlist.id}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: playlist.items.map(item => ({ id: item.id, order: item.order })) }),
      });
      if (!response.ok) throw new Error('Falha ao guardar alterações');
      setIsEditMode(false);
      toast.success('Alterações guardadas');
    } catch {
      toast.error('Erro ao guardar alterações');
    }
  };

  const handleDiscardEdits = () => {
    router.refresh();
    setIsEditMode(false);
    toast.info('Edições descartadas');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Page header */}
      <div className="border-b border-stone-100">
        <div className="mx-auto max-w-screen-xl px-5 py-4 flex items-center justify-between">
          <Link
            href="/playlists"
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Playlists
          </Link>

          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-stone-500 hover:text-stone-900">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditModalOpen(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsEditMode(!isEditMode)}>
                  <Music className="w-4 h-4 mr-2" />
                  {isEditMode ? 'Sair do modo edição' : 'Editar músicas'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDeletePlaylist}
                  disabled={isDeleting}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Playlist info */}
      <div className="border-b border-stone-100">
        <div className="mx-auto max-w-screen-xl px-5 py-10 sm:py-14">
          <div className="flex items-start gap-5">
            <div className="hidden sm:flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-stone-100 border border-stone-200">
              <ListMusic className="h-7 w-7 text-rose-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-3xl sm:text-4xl text-stone-900 leading-tight">
                {playlist.name}
              </h1>
              {playlist.description && (
                <p className="mt-2 text-base text-stone-500 max-w-2xl">
                  {playlist.description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`flex items-center gap-1 text-xs ${vis.cls}`}>
                  {vis.icon}
                  {vis.label}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1 text-xs bg-stone-50 text-stone-500 border-stone-200">
                  <Music className="w-3 h-3" />
                  {playlist.items?.length || 0} músicas
                </Badge>
                {playlist.user && (
                  <Badge variant="outline" className="flex items-center gap-1 text-xs bg-stone-50 text-stone-500 border-stone-200">
                    <Users className="w-3 h-3" />
                    por {playlist.user.name}
                  </Badge>
                )}
              </div>

              {canEdit && (
                <div className="mt-5 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-stone-200 text-stone-700 hover:bg-stone-50"
                    onClick={() => setEditModalOpen(true)}
                  >
                    <Edit className="w-3.5 h-3.5 mr-1.5" />
                    Editar playlist
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-stone-200 text-stone-700 hover:bg-stone-50"
                    onClick={() => setIsEditMode(!isEditMode)}
                  >
                    {isEditMode ? 'Sair de edição' : 'Editar músicas'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit mode */}
      {isEditMode && canEdit && (
        <div className="border-b border-stone-100 bg-stone-50/50">
          <div className="mx-auto max-w-screen-xl px-5 py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold text-stone-900">Modo de edição</h2>
                <p className="text-sm text-stone-500">Arrasta para reordenar, adiciona notas ou remove músicas.</p>
              </div>
            </div>
            <PlaylistEditItems
              playlistId={playlist.id}
              items={playlist.items}
              canEdit={true}
              onItemsChange={handleItemsChange}
            />
            <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-stone-200">
              <Button variant="outline" onClick={handleDiscardEdits} className="border-stone-200 text-stone-700">
                Descartar
              </Button>
              <Button onClick={handleSaveEdits} className="bg-stone-900 hover:bg-rose-700 transition-colors text-white">
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Songs list */}
      {!isEditMode && (
        <div className="mx-auto max-w-screen-xl px-5 py-8">
          {playlist.items && playlist.items.length > 0 ? (
            <div className="divide-y divide-stone-100">
              {playlist.items.map((item, index) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-4 py-3 hover:bg-stone-50/60 rounded-lg px-2 transition-colors"
                >
                  <div className="shrink-0 w-7 text-center">
                    <span className="text-sm text-stone-400 group-hover:hidden font-mono">{index + 1}</span>
                    <Play className="w-3.5 h-3.5 text-stone-500 hidden group-hover:block cursor-pointer" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {item.song ? (
                      <>
                        <Link
                          href={`/musics/${item.song.slug}`}
                          className="block"
                        >
                          <h4 className="font-medium text-stone-900 truncate text-sm sm:text-base group-hover:text-rose-700 transition-colors">
                            {item.song.title}
                          </h4>
                          {item.song.tags && item.song.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {item.song.tags.slice(0, 2).map((tag: string) => (
                                <span key={tag} className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </Link>
                        {item.note && (
                          <p className="text-xs text-stone-400 mt-1 italic">{item.note}</p>
                        )}
                      </>
                    ) : (
                      <span className="text-sm italic text-stone-400">Música não encontrada</span>
                    )}
                  </div>

                  {item.song && (
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <StarButton songId={item.song.id} initialStarCount={0} initialIsStarred={false} />
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-7 text-xs text-stone-500 hover:text-stone-900 px-2"
                      >
                        <Link href={`/musics/${item.song.slug}`}>Ver</Link>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ListMusic className="h-8 w-8 mx-auto mb-2 text-stone-200" />
              <p className="text-sm text-stone-500">Nenhuma música nesta playlist</p>
              {canEdit && (
                <Button asChild className="mt-6 bg-stone-900 hover:bg-rose-700 transition-colors text-white">
                  <Link href="/musics">Explorar cânticos</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <PlaylistEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        playlist={playlist}
        onUpdate={handlePlaylistUpdate}
      />
    </div>
  );
}
