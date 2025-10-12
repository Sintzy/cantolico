'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  X, 
  Save, 
  Trash2, 
  Crown, 
  UserCheck, 
  UserPlus, 
  Send, 
  Loader2, 
  Music,
  Users,
  Globe,
  Lock,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

interface PlaylistMember {
  id: string;
  email: string;
  name?: string;
  status: 'accepted' | 'pending';
  role: 'owner' | 'editor';
}

interface EditPlaylistModalProps {
  playlist: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

function EditPlaylistModal({ playlist, isOpen, onClose, onUpdate }: EditPlaylistModalProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'NOT_LISTED'>('PRIVATE');
  const [inviteEmail, setInviteEmail] = useState('');
  const [members, setMembers] = useState<PlaylistMember[]>([]);

  // Reset form when playlist changes
  useEffect(() => {
    if (playlist && isOpen) {
      setName(playlist.name || '');
      setDescription(playlist.description || '');
      setVisibility(playlist.visibility || 'PRIVATE');
      fetchMembers();
    }
  }, [playlist?.id, isOpen]);

  const isOwner = playlist?.userRole === 'owner';
  const canEditSettings = isOwner;

  // Early return if playlist is null
  if (!playlist) {
    return null;
  }

  const fetchMembers = async () => {
    if (!playlist?.id) return;

    try {
      const response = await fetch(`/api/playlists/${playlist.id}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleSave = async () => {
    if (!playlist?.id || !name.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/playlists/${playlist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          visibility
        }),
      });

      if (response.ok) {
        toast.success('Playlist atualizada com sucesso!');
        onUpdate();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao atualizar playlist');
      }
    } catch (error) {
      console.error('Error updating playlist:', error);
      toast.error('Erro ao atualizar playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!playlist?.id || !confirm('Tem certeza que deseja apagar esta playlist?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/playlists/${playlist.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Playlist apagada com sucesso!');
        onUpdate();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao apagar playlist');
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error('Erro ao apagar playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !playlist?.id) return;

    setInviting(true);
    try {
      const response = await fetch(`/api/playlists/${playlist.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      if (response.ok) {
        toast.success('Convite enviado com sucesso!');
        setInviteEmail('');
        fetchMembers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao enviar convite');
      }
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Erro ao enviar convite');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberStatus: string) => {
    if (!playlist?.id) return;

    const confirmMessage = memberStatus === 'pending' 
      ? 'Tem certeza que deseja cancelar este convite?'
      : 'Tem certeza que deseja remover este membro?';
    
    if (!confirm(confirmMessage)) return;

    try {
      const endpoint = memberStatus === 'pending'
        ? `/api/playlists/${playlist.id}/invites/${memberId}`
        : `/api/playlists/${playlist.id}/members/${memberId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (response.ok) {
        const message = memberStatus === 'pending' ? 'Convite cancelado' : 'Membro removido';
        toast.success(`${message} com sucesso!`);
        fetchMembers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao remover');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Erro ao remover');
    }
  };

  const getVisibilityIcon = (vis: string) => {
    switch (vis) {
      case 'PUBLIC': return <Globe className="h-4 w-4" />;
      case 'NOT_LISTED': return <Eye className="h-4 w-4" />;
      default: return <Lock className="h-4 w-4" />;
    }
  };

  const getVisibilityLabel = (vis: string) => {
    switch (vis) {
      case 'PUBLIC': return 'Pública';
      case 'NOT_LISTED': return 'Não listada';
      default: return 'Privada';
    }
  };

  // Debug logging
  console.log('EditPlaylistModal Debug:', {
    playlist: playlist?.id,
    membersCount: members.length,
    pendingCount: members.filter(m => m.status === 'pending').length
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        {/* Background with blur effect */}
        <div className="absolute inset-0 bg-background/95 backdrop-blur-sm" />
        
        <div className="relative flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">
                  {canEditSettings ? 'Editar Playlist' : 'Detalhes da Playlist'}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {canEditSettings ? 'Gere a sua playlist e editores' : 'Visualizar informações da playlist'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={playlist?.userRole === 'owner' ? 'default' : 'secondary'} className="px-3 py-1">
                {playlist?.userRole === 'owner' ? (
                  <>
                    <Crown className="h-3 w-3 mr-1" />
                    Proprietário
                  </>
                ) : (
                  <>
                    <UserCheck className="h-3 w-3 mr-1" />
                    Editor
                  </>
                )}
              </Badge>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Playlist Settings */}
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-base font-medium">Nome da Playlist</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!canEditSettings}
                    className="mt-2"
                    placeholder="Digite o nome da playlist"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-base font-medium">Descrição</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!canEditSettings}
                    className="mt-2"
                    placeholder="Descrição opcional da playlist"
                    rows={3}
                  />
                </div>

                {canEditSettings && (
                  <div>
                    <Label className="text-base font-medium">Visibilidade</Label>
                    <Select value={visibility} onValueChange={(value: any) => setVisibility(value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRIVATE">
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            <div>
                              <div className="font-medium">Privada</div>
                              <div className="text-xs text-muted-foreground">Apenas você e editores</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="NOT_LISTED">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            <div>
                              <div className="font-medium">Não listada</div>
                              <div className="text-xs text-muted-foreground">Apenas com link direto</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="PUBLIC">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            <div>
                              <div className="font-medium">Pública</div>
                              <div className="text-xs text-muted-foreground">Visível para todos</div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {!canEditSettings && (
                  <div>
                    <Label className="text-base font-medium">Visibilidade</Label>
                    <div className="mt-2 p-3 border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        {getVisibilityIcon(playlist?.visibility || 'PRIVATE')}
                        <span>{getVisibilityLabel(playlist?.visibility || 'PRIVATE')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Debug Info */}
            <div className="bg-gray-100 p-3 rounded text-xs">
              <strong>Debug Info:</strong>
              <pre>{JSON.stringify({ 
                membersCount: members.length,
                pendingCount: members.filter(m => m.status === 'pending').length,
                acceptedCount: members.filter(m => m.status === 'accepted').length,
                members: members.map(m => ({ 
                  id: m.id, 
                  email: m.email, 
                  status: m.status, 
                  role: m.role 
                }))
              }, null, 2)}</pre>
            </div>

            {/* Members Section - Only for owners */}
            {canEditSettings && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Editores</h3>
                  <div className="flex gap-2">
                    {members.filter(m => m.status === 'accepted').length > 0 && (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        {members.filter(m => m.status === 'accepted').length} ativo{members.filter(m => m.status === 'accepted').length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {members.filter(m => m.status === 'pending').length > 0 && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        {members.filter(m => m.status === 'pending').length} pendente{members.filter(m => m.status === 'pending').length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Invite new member */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Input
                          placeholder="Convidar por email..."
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          type="email"
                        />
                      </div>
                      <Button 
                        onClick={handleInvite} 
                        disabled={!inviteEmail || inviting}
                        size="sm"
                      >
                        {inviting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-1" />
                            Convidar
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      O editor poderá adicionar e remover músicas, mas não editar configurações.
                    </p>
                  </CardContent>
                </Card>

                {/* Active Members */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Membros Ativos ({members.filter(m => m.status === 'accepted').length})
                  </h4>
                  {members.filter(m => m.status === 'accepted').length > 0 ? (
                    <div className="space-y-2">
                      {members.filter(m => m.status === 'accepted').map((member) => (
                        <Card key={member.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  {member.role === 'owner' ? (
                                    <Crown className="h-4 w-4 text-amber-500" />
                                  ) : (
                                    <UserCheck className="h-4 w-4 text-green-600" />
                                  )}
                                  <div>
                                    <div className="font-medium">
                                      {member.name || member.email}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {member.name && member.email}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  Ativo
                                </Badge>
                                {member.role === 'editor' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveMember(member.id, member.status)}
                                    title="Remover membro"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum membro ativo.</p>
                  )}
                </div>

                {/* Pending Invites */}
                {members.filter(m => m.status === 'pending').length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Convites Pendentes</h4>
                    {members.filter(m => m.status === 'pending').map((member) => (
                      <Card key={member.id} className="border-yellow-200 bg-yellow-50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <UserPlus className="h-4 w-4 text-yellow-600" />
                                <div>
                                  <div className="font-medium text-yellow-900">
                                    {member.email}
                                  </div>
                                  <div className="text-sm text-yellow-700">
                                    Convite enviado • Editor
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-yellow-200 text-yellow-800">
                                Aguardando resposta
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member.id, member.status)}
                                title="Cancelar convite"
                                className="text-yellow-700 hover:text-yellow-800 hover:bg-yellow-100"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-muted/30">
            <div className="flex gap-2">
              {isOwner && (
                <Button 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={loading}
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Apagar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              {canEditSettings && (
                <Button onClick={handleSave} disabled={loading || !name}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Guardar
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { EditPlaylistModal };
export default EditPlaylistModal;