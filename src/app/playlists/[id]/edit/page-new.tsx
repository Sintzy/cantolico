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
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { ArrowLeft, Globe, Lock, Trash2, EyeOff, Edit, Mail, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getVisibilityLabel, getVisibilityFlags, getVisibilityFromPlaylist } from '@/types/playlist';

interface Playlist {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean | null;
  userId: number;
  user: {
    id: number;
    name: string;
  };
  members?: Array<{
    userEmail: string;
    role: string;
    status: string;
  }>;
}

interface EditPlaylistForm {
  name: string;
  description: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'NOT_LISTED';
  memberEmails: string[];
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
    visibility: 'PRIVATE',
    memberEmails: []
  });
  const [newMemberEmail, setNewMemberEmail] = useState('');

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
      const visibility = getVisibilityFromPlaylist({ isPublic: data.isPublic });
      
      setForm({
        name: data.name,
        description: data.description || '',
        visibility,
        memberEmails: data.members?.map((m: any) => m.userEmail) || []
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
          visibility: form.visibility,
          memberEmails: form.memberEmails
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
        <Spinner variant="circle" size={32} className="text-black" />
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
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Link href={`/playlists/${playlist.id}`}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Link>
                </Button>
                <div className="h-6 w-px bg-border" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center">
                    <Edit className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold">Editar Playlist</h1>
                    <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                      {playlist.name}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Nome da Playlist
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: As Minhas Favoritas"
                  disabled={saving}
                  className="font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Descrição
                </Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descreve a tua playlist..."
                  rows={3}
                  disabled={saving}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">Opcional</p>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Privacidade</CardTitle>
              <p className="text-sm text-muted-foreground">
                Controla quem pode ver e aceder à tua playlist
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['PUBLIC', 'NOT_LISTED', 'PRIVATE'].map((visibility) => {
                  const getIcon = (vis: string) => {
                    switch (vis) {
                      case 'PUBLIC': return Globe;
                      case 'PRIVATE': return Lock;
                      case 'NOT_LISTED': return EyeOff;
                      default: return Globe;
                    }
                  };
                  
                  const Icon = getIcon(visibility);
                  const isSelected = form.visibility === visibility;
                  
                  return (
                    <div
                      key={visibility}
                      onClick={() => !saving && setForm(prev => ({ ...prev, visibility: visibility as any }))}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:border-primary/50 hover:bg-accent/50",
                        saving && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {getVisibilityLabel(visibility as any)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {visibility === 'PUBLIC' && 'Toda a gente pode ver'}
                          {visibility === 'NOT_LISTED' && 'Apenas com link direto'}
                          {visibility === 'PRIVATE' && 'Apenas tu e convidados'}
                        </div>
                      </div>
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2",
                        isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                      )}>
                        {isSelected && (
                          <div className="w-full h-full rounded-full bg-background scale-[0.4]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Members - only for private/unlisted */}
          {(form.visibility === 'PRIVATE' || form.visibility === 'NOT_LISTED') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Colaboradores</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Convida pessoas para editarem esta playlist
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    disabled={saving}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const email = newMemberEmail.trim();
                        if (email && email.includes('@') && !form.memberEmails.includes(email)) {
                          setForm(prev => ({
                            ...prev,
                            memberEmails: [...prev.memberEmails, email]
                          }));
                          setNewMemberEmail('');
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      const email = newMemberEmail.trim();
                      if (email && email.includes('@') && !form.memberEmails.includes(email)) {
                        setForm(prev => ({
                          ...prev,
                          memberEmails: [...prev.memberEmails, email]
                        }));
                        setNewMemberEmail('');
                      }
                    }}
                    disabled={!newMemberEmail.trim() || saving}
                    variant="outline"
                    size="icon"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {form.memberEmails.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Membros ({form.memberEmails.length})
                    </Label>
                    <div className="space-y-2">
                      {form.memberEmails.map((email, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <Mail className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-sm font-medium">{email}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setForm(prev => ({
                                ...prev,
                                memberEmails: prev.memberEmails.filter(e => e !== email)
                              }));
                            }}
                            disabled={saving}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit}>
                <div className="flex gap-3">
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
                    {saving ? 'A guardar...' : 'Guardar Alterações'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Eliminar Playlist
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Esta ação é irreversível e eliminará permanentemente a playlist
              </p>
            </CardHeader>
            <CardContent>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={deleting}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? 'A eliminar...' : 'Eliminar Playlist'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}