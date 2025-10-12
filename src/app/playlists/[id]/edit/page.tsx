'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Save, 
  Globe, 
  Lock, 
  EyeOff,
  Eye,
  Loader2, 
  UserPlus,
  Trash2,
  Crown,
  Edit3,
  Mail,
  CheckCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface PlaylistMember {
  id: string;
  userEmail: string;
  role: 'EDITOR' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  invitedAt: string;
  acceptedAt?: string;
}

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  visibility?: 'PUBLIC' | 'PRIVATE' | 'NOT_LISTED';
  userId: number;
  createdAt: string;
  updatedAt: string;
  members?: PlaylistMember[];
  songsCount: number;
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
  const [inviting, setInviting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'public' as 'public' | 'private' | 'not_listed'
  });
  const [newMemberEmail, setNewMemberEmail] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const { id } = await params;
        
        // Fetch playlist data
        const playlistResponse = await fetch(`/api/playlists/${id}`);
        if (!playlistResponse.ok) {
          if (playlistResponse.status === 404) {
            notFound();
          }
          throw new Error('Failed to fetch playlist');
        }
        
        const playlistData = await playlistResponse.json();
        
        // Check if user is owner
        if (!session?.user?.id || playlistData.userId !== session.user.id) {
          router.push(`/playlists/${id}`);
          return;
        }

        // Fetch members
        const membersResponse = await fetch(`/api/playlists/${id}/members`);
        let members = [];
        if (membersResponse.ok) {
          const membersData = await membersResponse.json();
          members = membersData.members || [];
        }

        const fullPlaylist = {
          ...playlistData,
          members,
          songsCount: playlistData._count?.items || 0
        };

        setPlaylist(fullPlaylist);
        setFormData({
          name: fullPlaylist.name,
          description: fullPlaylist.description || '',
          visibility: fullPlaylist.visibility === 'PUBLIC' ? 'public' : 
                     fullPlaylist.visibility === 'NOT_LISTED' ? 'not_listed' : 'private'
        });
      } catch (error) {
        console.error('Error loading playlist:', error);
        toast.error('Erro ao carregar playlist');
        router.push('/playlists');
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      loadData();
    }
  }, [params, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nome da playlist é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/playlists/${playlist!.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          visibility: formData.visibility === 'public' ? 'PUBLIC' : 
                     formData.visibility === 'not_listed' ? 'NOT_LISTED' : 'PRIVATE'
        }),
      });

      if (response.ok) {
        toast.success('Playlist atualizada com sucesso!');
        router.push(`/playlists/${playlist!.id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao atualizar playlist');
      }
    } catch (error) {
      console.error('Error updating playlist:', error);
      toast.error('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteMember = async () => {
    if (!newMemberEmail.trim()) {
      toast.error('Email é obrigatório');
      return;
    }

    if (!newMemberEmail.includes('@')) {
      toast.error('Email inválido');
      return;
    }

    // Check if already exists
    if (playlist?.members?.some(m => m.userEmail.toLowerCase() === newMemberEmail.toLowerCase().trim())) {
      toast.error('Este utilizador já foi convidado');
      return;
    }

    setInviting(true);
    try {
      const response = await fetch(`/api/playlists/${playlist!.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newMemberEmail.trim(),
        }),
      });

      if (response.ok) {
        toast.success('Convite enviado com sucesso! O utilizador receberá um email.');
        setNewMemberEmail('');
        // Refresh the page to show new member
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao enviar convite');
      }
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Erro de conexão');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const member = playlist?.members?.find(m => m.id === memberId);
    const isPending = member?.status === 'PENDING';
    
    const confirmMessage = isPending 
      ? 'Tens a certeza que queres cancelar este convite?' 
      : 'Tens a certeza que queres remover este membro?';
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const endpoint = isPending 
        ? `/api/playlists/${playlist!.id}/invites/${memberId}`
        : `/api/playlists/${playlist!.id}/members/${memberId}`;
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (response.ok) {
        const message = isPending ? 'Convite cancelado' : 'Membro removido';
        toast.success(`${message} com sucesso!`);
        // Refresh to show updated members list
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao remover');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Erro de conexão');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/playlists/${playlist.id}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Editar Playlist</h1>
              <p className="text-gray-600">Gere as definições e membros da tua playlist</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit3 className="w-5 h-5" />
                    Informações Básicas
                  </CardTitle>
                  <CardDescription>
                    Define o nome, descrição e privacidade da playlist
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="name">Nome da Playlist</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Nome da playlist..."
                        maxLength={100}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Descrição (opcional)</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Descreve a tua playlist..."
                        maxLength={500}
                        rows={3}
                        className="mt-1 resize-none"
                      />
                    </div>

                    <div>
                      <Label>Privacidade</Label>
                      <div className="grid grid-cols-1 gap-2 mt-2">
                        <Button
                          type="button"
                          variant={formData.visibility === 'public' ? 'default' : 'outline'}
                          className="justify-start h-auto p-3"
                          onClick={() => setFormData({ ...formData, visibility: 'public' })}
                        >
                          <div className="flex items-center gap-3">
                            <Globe className="h-4 w-4" />
                            <div className="text-left">
                              <div className="font-medium">Pública</div>
                              <div className="text-sm text-muted-foreground">Visível para todos</div>
                            </div>
                          </div>
                        </Button>
                        
                        <Button
                          type="button"
                          variant={formData.visibility === 'private' ? 'default' : 'outline'}
                          className="justify-start h-auto p-3"
                          onClick={() => setFormData({ ...formData, visibility: 'private' })}
                        >
                          <div className="flex items-center gap-3">
                            <Lock className="h-4 w-4" />
                            <div className="text-left">
                              <div className="font-medium">Privada</div>
                              <div className="text-sm text-muted-foreground">Apenas tu podes ver</div>
                            </div>
                          </div>
                        </Button>

                        <Button
                          type="button"
                          variant={formData.visibility === 'not_listed' ? 'default' : 'outline'}
                          className="justify-start h-auto p-3"
                          onClick={() => setFormData({ ...formData, visibility: 'not_listed' })}
                        >
                          <div className="flex items-center gap-3">
                            <Eye className="h-4 w-4" />
                            <div className="text-left">
                              <div className="font-medium">Não listada</div>
                              <div className="text-sm text-muted-foreground">Apenas com link direto</div>
                            </div>
                          </div>
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                      <Button type="submit" disabled={saving} className="flex-1">
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Guardar Alterações
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Members Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Colaboradores
                  </CardTitle>
                  <CardDescription>
                    Convida outros utilizadores para editar esta playlist
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Invite New Member */}
                  <div>
                    <Label>Convidar Novo Colaborador</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        placeholder="Email do utilizador..."
                        className="flex-1"
                      />
                      <Button 
                        type="button" 
                        onClick={handleInviteMember}
                        disabled={inviting || !newMemberEmail.trim()}
                      >
                        {inviting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <UserPlus className="h-4 w-4 mr-2" />
                        )}
                        Convidar
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      O utilizador receberá um email e terá de aceitar para colaborar
                    </p>
                  </div>

                  {/* Active Members */}
                  {playlist.members && playlist.members.filter(m => m.status === 'ACCEPTED').length > 0 && (
                    <div>
                      <Label>Colaboradores Ativos ({playlist.members.filter(m => m.status === 'ACCEPTED').length})</Label>
                      <div className="space-y-3 mt-2">
                        {playlist.members.filter(m => m.status === 'ACCEPTED').map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                <Mail className="w-4 h-4 text-gray-600" />
                              </div>
                              <div>
                                <div className="font-medium">{member.userEmail}</div>
                                <div className="text-sm text-gray-600">
                                  Convidado em {new Date(member.invitedAt).toLocaleDateString('pt-PT')}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                Editor
                              </Badge>
                              <Badge variant={member.status === 'ACCEPTED' ? 'default' : 'secondary'}>
                                {member.status === 'ACCEPTED' ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Ativo
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3 mr-1" />
                                    Pendente
                                  </>
                                )}
                              </Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Debug Info - Remove in production */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="bg-gray-100 p-3 rounded text-xs">
                      <strong>Debug Info:</strong>
                      <pre>{JSON.stringify({ 
                        membersTotal: playlist.members?.length || 0,
                        pendingCount: playlist.members?.filter(m => m.status === 'PENDING').length || 0,
                        acceptedCount: playlist.members?.filter(m => m.status === 'ACCEPTED').length || 0,
                        members: playlist.members?.map(m => ({ 
                          id: m.id, 
                          email: m.userEmail, 
                          status: m.status 
                        }))
                      }, null, 2)}</pre>
                    </div>
                  )}

                  {/* Pending Invites */}
                  {playlist.members && playlist.members.filter(m => m.status === 'PENDING').length > 0 && (
                    <div>
                      <Label className="text-yellow-700">Convites Pendentes ({playlist.members.filter(m => m.status === 'PENDING').length})</Label>
                      <div className="space-y-3 mt-2">
                        {playlist.members.filter(m => m.status === 'PENDING').map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-between">
                                <Clock className="w-4 h-4 text-yellow-600 mx-auto" />
                              </div>
                              <div>
                                <div className="font-medium text-yellow-900">{member.userEmail}</div>
                                <div className="text-sm text-yellow-700">
                                  Convite enviado em {new Date(member.invitedAt).toLocaleDateString('pt-PT')}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-yellow-200 text-yellow-800">
                                <Clock className="w-3 h-3 mr-1" />
                                Aguardando resposta
                              </Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-yellow-700 hover:text-yellow-800 hover:bg-yellow-100"
                                title="Cancelar convite"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Estatísticas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Músicas</span>
                    <Badge variant="secondary">{playlist.songsCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Colaboradores</span>
                    <Badge variant="secondary">{playlist.members?.length || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Privacidade</span>
                    <Badge variant={playlist.visibility === 'PUBLIC' ? 'default' : 'secondary'}>
                      {playlist.visibility === 'PUBLIC' ? (
                        <>
                          <Globe className="w-3 h-3 mr-1" />
                          Pública
                        </>
                      ) : playlist.visibility === 'NOT_LISTED' ? (
                        <>
                          <Eye className="w-3 h-3 mr-1" />
                          Não listada
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 mr-1" />
                          Privada
                        </>
                      )}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link href={`/playlists/${playlist.id}`}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Ver Playlist
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}