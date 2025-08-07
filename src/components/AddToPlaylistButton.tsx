"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, ListMusic, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
        <Button variant={variant} size={size} className={className}>
          <ListMusic className="h-4 w-4 mr-2" />
          Playlist
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar à Playlist</DialogTitle>
          <DialogDescription>
            Escolha uma playlist existente ou crie uma nova para adicionar esta música.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isCreatingNew ? (
            <>
              <div className="space-y-2">
                <Label>Escolher Playlist</Label>
                <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma playlist" />
                  </SelectTrigger>
                  <SelectContent>
                    {playlists.map((playlist) => (
                      <SelectItem key={playlist.id} value={playlist.id}>
                        <div className="flex items-center gap-2">
                          <span>{playlist.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({playlist._count.items} músicas)
                          </span>
                          {playlist.isPublic && (
                            <span className="text-xs bg-green-100 text-green-700 px-1 rounded">
                              Pública
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleAddToPlaylist}
                  disabled={!selectedPlaylist || isLoading}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Adicionar
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
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Playlist</Label>
                <Input
                  id="name"
                  placeholder="Nome da playlist"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  placeholder="Descrição da playlist"
                  value={newPlaylistDescription}
                  onChange={(e) => setNewPlaylistDescription(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPublic"
                  checked={newPlaylistIsPublic}
                  onCheckedChange={(checked: boolean) => setNewPlaylistIsPublic(!!checked)}
                />
                <Label htmlFor="isPublic">
                  Tornar playlist pública (outros podem ver com o link)
                </Label>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylistName.trim() || isLoading}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar e Adicionar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreatingNew(false);
                    setNewPlaylistName('');
                    setNewPlaylistDescription('');
                    setNewPlaylistIsPublic(false);
                  }}
                >
                  Voltar
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
