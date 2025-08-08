'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { ListMusic, ArrowLeft, Globe, Lock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Playlist {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  userId: number;
  user: {
    id: number;
    name: string;
  };
}

interface EditPlaylistForm {
  name: string;
  description: string;
  isPublic: boolean;
}

interface EditPlaylistPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditPlaylistPage({ params }: EditPlaylistPageProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<EditPlaylistForm>({
    name: '',
    description: '',
    isPublic: false
  });

  useEffect(() => {
    const loadData = async () => {
      const { id } = await params;
      await fetchPlaylist(id);
    };
    loadData();
  }, [params]);

  const fetchPlaylist = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/playlists/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          notFound();
        }
        throw new Error('Erro ao carregar playlist');
      }
      
      const data = await response.json();
      setPlaylist(data);
      setForm({
        name: data.name,
        description: data.description || '',
        isPublic: data.isPublic
      });
    } catch (error) {
      console.error('Error fetching playlist:', error);
      toast.error('Erro ao carregar dados da playlist');
      router.push('/playlists');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playlist) return;

    if (!form.name.trim()) {
      toast.error('Por favor, insere o nome da playlist');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/playlists/${playlist.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          isPublic: form.isPublic
        }),
      });

      if (response.ok) {
        toast.success('Playlist atualizada com sucesso!');
        router.push(`/playlists/${playlist.id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao atualizar playlist');
      }
    } catch (error) {
      console.error('Error updating playlist:', error);
      toast.error('Erro de conexão ao atualizar playlist');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!playlist) return;

    const confirmed = confirm(`Tens a certeza que queres eliminar a playlist "${playlist.name}"? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    setDeleting(true);

    try {
      const response = await fetch(`/api/playlists/${playlist.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Playlist eliminada com sucesso');
        router.push('/playlists');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao eliminar playlist');
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error('Erro de conexão ao eliminar playlist');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!playlist) {
    return notFound();
  }

  // Verificar se é o proprietário
  if (!session || session.user.id !== playlist.userId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lock className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Sem permissão</h3>
            <p className="text-muted-foreground text-center mb-6">
              Não tens permissão para editar esta playlist.
            </p>
            <Button asChild>
              <Link href={`/playlists/${playlist.id}`}>Ver Playlist</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/playlists/${playlist.id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar à Playlist
            </Link>
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-3 text-white">
            <ListMusic className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Editar Playlist</h1>
            <p className="text-muted-foreground">
              Atualiza os detalhes da tua playlist
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Playlist</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Playlist *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Minhas Músicas Favoritas"
                    required
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Descreve a tua playlist..."
                    rows={4}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-4">
                  <Label>Visibilidade</Label>
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="isPublic"
                      checked={form.isPublic}
                      onCheckedChange={(checked: boolean) => setForm({ ...form, isPublic: !!checked })}
                      disabled={saving}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label 
                        htmlFor="isPublic"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                      >
                        {form.isPublic ? (
                          <>
                            <Globe className="h-4 w-4 text-green-600" />
                            Playlist Pública
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 text-gray-600" />
                            Playlist Privada
                          </>
                        )}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {form.isPublic 
                          ? 'Qualquer pessoa com o link pode ver esta playlist'
                          : 'Apenas tu podes ver e gerir esta playlist'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={saving}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={!form.name.trim() || saving}
                    className="flex-1"
                  >
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Danger Zone */}
        <div className="lg:col-span-1">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Zona Perigosa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ações irreversíveis que afetam permanentemente esta playlist.
              </p>
              
              <Button 
                variant="destructive" 
                className="w-full"
                disabled={deleting}
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? 'Eliminando...' : 'Eliminar Playlist'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
