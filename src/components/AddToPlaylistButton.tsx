"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, ListMusic, Check, ArrowLeft, Music, Globe, Lock, EyeOff, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getVisibilityLabel, getVisibilityFlags } from '@/types/playlist';

interface AddToPlaylistButtonProps {
  songId: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  isPrivate: boolean;
  isNotListed: boolean;
  _count: {
    items: number;
  };
}

export default function AddToPlaylistButton({ 
  songId, 
  className,
  variant = 'outline',
  size = 'default'
}: AddToPlaylistButtonProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [newPlaylistVisibility, setNewPlaylistVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'NOT_LISTED'>('PRIVATE');
  const [isLoading, setIsLoading] = useState(false);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);

  // Carregar playlists do usuário (próprias e colaborativas)
  useEffect(() => {
    if (!session?.user?.id || !isOpen) return;

    const fetchPlaylists = async () => {
      setPlaylistsLoading(true);
      try {
        const response = await fetch('/api/user/playlists');
        if (response.ok) {
          const data = await response.json();
          // Mapear para o formato esperado pelo componente
          const formattedPlaylists = data.map((playlist: any) => ({
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            isPublic: playlist.isPublic,
            isPrivate: !playlist.isPublic,
            isNotListed: false,
            _count: {
              items: playlist.songsCount || 0
            }
          }));
          setPlaylists(formattedPlaylists);
        }
      } catch (error) {
        console.error('Error fetching playlists:', error);
      } finally {
        setPlaylistsLoading(false);
      }
    };

    fetchPlaylists();
  }, [session?.user?.id, isOpen]);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      toast.error('Nome da playlist é obrigatório');
      return;
    }

    // Verificar se o email está verificado
    try {
      const verificationResponse = await fetch('/api/user/email-verification-status');
      const verificationData = await verificationResponse.json();
      
      if (verificationData.success && !verificationData.emailVerified) {
        toast.error('Precisas de verificar o teu email antes de criar playlists');
        return;
      }
    } catch (error) {
      console.error('Error checking email verification:', error);
      toast.error('Erro ao verificar status da conta');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newPlaylistName.trim(),
          description: newPlaylistDescription.trim() || null,
          visibility: newPlaylistVisibility
        }),
      });

      if (response.ok) {
        const newPlaylist = await response.json();
        setPlaylists(prev => [newPlaylist, ...prev]);
        setSelectedPlaylist(newPlaylist.id);
        setIsCreatingNew(false);
        setNewPlaylistName('');
        setNewPlaylistDescription('');
        setNewPlaylistVisibility('PRIVATE');
        toast.success('Playlist criada com sucesso!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao criar playlist');
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error('Erro ao criar playlist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToPlaylist = async () => {
    if (!selectedPlaylist) {
      toast.error('Selecione uma playlist');
      return;
    }

    // Verificar se o email está verificado
    try {
      const verificationResponse = await fetch('/api/user/email-verification-status');
      const verificationData = await verificationResponse.json();
      
      if (verificationData.success && !verificationData.emailVerified) {
        toast.error('Precisas de verificar o teu email antes de adicionar músicas às playlists');
        return;
      }
    } catch (error) {
      console.error('Error checking email verification:', error);
      toast.error('Erro ao verificar status da conta');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/playlists/${selectedPlaylist}/songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ songId }),
      });

      if (response.ok) {
        const playlist = playlists.find(p => p.id === selectedPlaylist);
        toast.success(`Música adicionada à playlist "${playlist?.name}"!`);
        setIsOpen(false);
        setSelectedPlaylist('');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao adicionar música à playlist');
      }
    } catch (error) {
      console.error('Error adding to playlist:', error);
      toast.error('Erro ao adicionar música à playlist');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setIsCreatingNew(false);
    setNewPlaylistName('');
    setNewPlaylistDescription('');
    setNewPlaylistVisibility('PRIVATE');
    setSelectedPlaylist('');
  };

  if (!session) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => toast.error('Precisas de fazer login para criares playlists')}
      >
        <ListMusic className="h-4 w-4 mr-2" />
        Playlist
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          onClick={resetForm}
        >
          <ListMusic className="h-4 w-4 mr-2" />
          Playlist
        </Button>
      </DialogTrigger>

  <DialogContent className="sm:max-w-[450px] playlist-dialog-blur">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListMusic className="h-5 w-5" />
            {isCreatingNew ? 'Criar Nova Playlist' : 'Adicionar à Playlist'}
          </DialogTitle>
          <DialogDescription>
            {isCreatingNew
              ? 'Crie uma nova playlist para organizar suas músicas'
              : 'Escolha uma playlist existente ou crie uma nova'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isCreatingNew ? (
            <>
              {/* Loading Spinner */}
              {playlistsLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-muted-foreground/20 border-t-muted-foreground"></div>
                    <span className="text-muted-foreground text-sm">A carregar...</span>
                  </div>
                </div>
              )}

              {/* Lista de Playlists Existentes */}
              {!playlistsLoading && playlists.length > 0 ? (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Suas Playlists ({playlists.length})</Label>
                  
                  <div className="space-y-2">
                    {playlists.map((playlist) => (
                      <button
                        key={playlist.id}
                        type="button"
                        onClick={() => setSelectedPlaylist(playlist.id)}
                        className={`w-full flex items-center space-x-3 p-3 border rounded-lg text-left transition-colors hover:bg-accent ${
                          selectedPlaylist === playlist.id
                            ? 'border-primary bg-accent'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selectedPlaylist === playlist.id
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground'
                        }`}>
                          {selectedPlaylist === playlist.id && (
                            <Check className="h-2.5 w-2.5 text-primary-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">
                            {playlist.name}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Music className="h-3 w-3" />
                            <span>{playlist._count.items} músicas</span>
                            <span>•</span>
{(() => {
                              const visibility = playlist.isPublic ? 'PUBLIC' : playlist.isNotListed ? 'NOT_LISTED' : 'PRIVATE';
                              if (visibility === 'PUBLIC') {
                                return (
                                  <span className="flex items-center gap-1">
                                    <Globe className="h-3 w-3" />
                                    Pública
                                  </span>
                                );
                              } else if (visibility === 'NOT_LISTED') {
                                return (
                                  <span className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    Não listada
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="flex items-center gap-1">
                                    <Lock className="h-3 w-3" />
                                    Privada
                                  </span>
                                );
                              }
                            })()}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : !playlistsLoading && (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <ListMusic className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <h3 className="font-medium mb-2">Nenhuma playlist encontrada</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Crie sua primeira playlist para começar
                  </p>
                  <Button variant="outline" onClick={() => setIsCreatingNew(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Playlist
                  </Button>
                </div>
              )}

              {!playlistsLoading && playlists.length > 0 && (
                <>
                  <Separator />
                  
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={handleAddToPlaylist}
                      disabled={!selectedPlaylist || isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Adicionando...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Adicionar
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setIsCreatingNew(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nova
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {/* Formulário de Nova Playlist */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Playlist *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Minhas Favoritas, Adoração..."
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreve a tua playlist..."
                    value={newPlaylistDescription}
                    onChange={(e) => setNewPlaylistDescription(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Quem pode ver esta playlist?
                  </Label>
                  
                  <div className="space-y-2">
                    {['PRIVATE', 'NOT_LISTED', 'PUBLIC'].map((visibility) => {
                      const getIcon = (vis: string) => {
                        switch (vis) {
                          case 'PUBLIC': return Globe;
                          case 'PRIVATE': return Lock;
                          case 'NOT_LISTED': return EyeOff;
                          default: return Lock;
                        }
                      };
                      
                      const Icon = getIcon(visibility);
                      const isSelected = newPlaylistVisibility === visibility;
                      
                      return (
                        <div
                          key={visibility}
                          onClick={() => setNewPlaylistVisibility(visibility as any)}
                          className={cn(
                            "p-3 border-2 rounded-lg cursor-pointer transition-all",
                            isSelected
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-6 h-6 rounded-md flex items-center justify-center",
                              isSelected ? "bg-blue-100" : "bg-gray-100"
                            )}>
                              <Icon className={cn(
                                "h-3 w-3",
                                isSelected ? "text-blue-600" : "text-gray-600"
                              )} />
                            </div>
                            <div className="flex-1">
                              <h4 className={cn(
                                "font-medium text-sm",
                                isSelected ? "text-blue-900" : "text-gray-900"
                              )}>
                                {getVisibilityLabel(visibility as any)}
                              </h4>
                              <p className="text-xs text-gray-600">
                                {visibility === 'PUBLIC' && 'Visível para todos'}
                                {visibility === 'NOT_LISTED' && 'Apenas com link'}
                                {visibility === 'PRIVATE' && 'Apenas para ti'}
                              </p>
                            </div>
                            <div className={cn(
                              "w-3 h-3 rounded-full border-2",
                              isSelected
                                ? "border-blue-500 bg-blue-500"
                                : "border-gray-300"
                            )}>
                              {isSelected && (
                                <div className="w-full h-full rounded-full bg-white scale-50"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>

                <Button
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylistName.trim() || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      A criar...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar e Adicionar
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
