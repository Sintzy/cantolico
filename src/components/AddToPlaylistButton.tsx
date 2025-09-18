"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, ListMusic, Check, ArrowLeft, Music, Globe, Lock } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

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
  const [newPlaylistIsPublic, setNewPlaylistIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar playlists do usuário
  useEffect(() => {
    if (!session?.user?.id || !isOpen) return;

    const fetchPlaylists = async () => {
      try {
        const response = await fetch(`/api/playlists?userId=${session.user.id}`);
        if (response.ok) {
          const data = await response.json();
          setPlaylists(data);
        }
      } catch (error) {
        console.error('Error fetching playlists:', error);
      }
    };

    fetchPlaylists();
  }, [session?.user?.id, isOpen]);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      toast.error('Nome da playlist é obrigatório');
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
          isPublic: newPlaylistIsPublic
        }),
      });

      if (response.ok) {
        const newPlaylist = await response.json();
        setPlaylists(prev => [newPlaylist, ...prev]);
        setSelectedPlaylist(newPlaylist.id);
        setIsCreatingNew(false);
        setNewPlaylistName('');
        setNewPlaylistDescription('');
        setNewPlaylistIsPublic(false);
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
    setNewPlaylistIsPublic(false);
    setSelectedPlaylist('');
  };

  if (!session) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => toast.error('Precisa fazer login para criar playlists')}
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

      <DialogContent className="sm:max-w-[450px]">
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
              {/* Lista de Playlists Existentes */}
              {playlists.length > 0 ? (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Suas Playlists</Label>
                  
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
                            {playlist.isPublic ? (
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                Pública
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Privada
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
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

              {playlists.length > 0 && (
                <>
                  <Separator />
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={handleAddToPlaylist}
                      disabled={!selectedPlaylist || isLoading}
                      className="flex-1"
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
                    placeholder="Descreva sua playlist..."
                    value={newPlaylistDescription}
                    onChange={(e) => setNewPlaylistDescription(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="isPublic" className="font-medium">
                      Playlist Pública
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Outros usuários podem descobrir sua playlist
                    </p>
                  </div>
                  <Switch
                    id="isPublic"
                    checked={newPlaylistIsPublic}
                    onCheckedChange={setNewPlaylistIsPublic}
                  />
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
                      Criando...
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
