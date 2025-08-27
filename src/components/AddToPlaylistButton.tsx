"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, ListMusic, Check, ArrowLeft, Music, Globe, Lock, Users } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
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

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-blue-400 shadow-lg flex items-center justify-center">
              <ListMusic className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                {isCreatingNew ? 'Criar Nova Playlist' : 'Adicionar à Playlist'}
              </DialogTitle>
              <DialogDescription>
                {isCreatingNew
                  ? 'Crie uma nova playlist para organizar suas músicas favoritas'
                  : 'Escolha uma playlist existente ou crie uma nova para adicionar esta música'
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {!isCreatingNew ? (
            <>
              {/* Lista de Playlists Existentes */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Suas Playlists</Label>

                {playlists.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {playlists.map((playlist) => (
                      <Card
                        key={playlist.id}
                        className={cn(
                          "cursor-pointer transition-all duration-200 hover:shadow-md border",
                          selectedPlaylist === playlist.id
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-gray-200 hover:border-blue-300"
                        )}
                        onClick={() => setSelectedPlaylist(playlist.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-blue-400 shadow flex items-center justify-center">
                                <Music className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{playlist.name}</h4>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>{playlist._count.items} músicas</span>
                                  {playlist.isPublic ? (
                                    <Badge variant="secondary" className="h-5 px-2 text-xs">
                                      <Globe className="h-3 w-3 mr-1" />
                                      Pública
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="h-5 px-2 text-xs">
                                      <Lock className="h-3 w-3 mr-1" />
                                      Privada
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            {selectedPlaylist === playlist.id && (
                              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed border-2 border-gray-300">
                    <CardContent className="p-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 mx-auto mb-3 flex items-center justify-center">
                        <ListMusic className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        Ainda não tem playlists criadas
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCreatingNew(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar primeira playlist
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              <Separator />

              {/* Botões de Ação */}
              <div className="flex gap-3">
                <Button
                  onClick={handleAddToPlaylist}
                  disabled={!selectedPlaylist || isLoading}
                  className="flex-1 bg-gradient-to-t from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
                  size="lg"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Adicionar Música
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsCreatingNew(true)}
                  size="lg"
                  className="border-gray-300 hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Playlist
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Formulário de Nova Playlist */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Nome da Playlist *
                  </Label>
                  <Input
                    id="name"
                    placeholder="Ex: Minhas Favoritas, Adoração, Contemplação..."
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Descrição (opcional)
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva sua playlist para facilitar a organização..."
                    value={newPlaylistDescription}
                    onChange={(e) => setNewPlaylistDescription(e.target.value)}
                    className="min-h-20 resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <Card className="bg-gray-50 border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {newPlaylistIsPublic ? (
                          <Globe className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Lock className="h-5 w-5 text-gray-600" />
                        )}
                        <div>
                          <Label htmlFor="isPublic" className="font-medium cursor-pointer">
                            {newPlaylistIsPublic ? 'Playlist Pública' : 'Playlist Privada'}
                          </Label>
                          <p className="text-xs text-gray-500">
                            {newPlaylistIsPublic
                              ? 'Outros usuários podem descobrir e ver sua playlist'
                              : 'Apenas você pode ver e acessar esta playlist'
                            }
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="isPublic"
                        checked={newPlaylistIsPublic}
                        onCheckedChange={setNewPlaylistIsPublic}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Botões de Ação do Formulário */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={resetForm}
                  size="lg"
                  className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>

                <Button
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylistName.trim() || isLoading}
                  className="flex-1 bg-gradient-to-t from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
                  size="lg"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Criar e Adicionar
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
