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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  Save, 
  Trash2, 
  Crown, 
  UserCheck, 
  UserPlus, 
  Send, 
  Loader2, 
  Globe,
  Lock,
  Eye,
  Mail,
  Clock,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface PlaylistMember {
  id: string;
  userEmail?: string;
  email?: string;
  name?: string;
  role: 'owner' | 'editor' | 'EDITOR' | 'OWNER';
  status: 'accepted' | 'pending' | 'ACCEPTED' | 'PENDING';
  invitedAt?: string;
  joinedAt?: string;
  acceptedAt?: string;
  user?: {
    id: number;
    name: string;
    email: string;
    image?: string;
  };
}

interface PlaylistEditModalProps {
  playlist: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

function PlaylistEditModal({ playlist, isOpen, onClose, onUpdate }: PlaylistEditModalProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'NOT_LISTED'>('PRIVATE');
  const [inviteEmail, setInviteEmail] = useState('');
  const [members, setMembers] = useState<PlaylistMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Early return if playlist is null
  if (!playlist) {
    return null;
  }

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

  const fetchMembers = async () => {
    if (!playlist?.id) return;

    setMembersLoading(true);
    try {
      const response = await fetch(`/api/playlists/${playlist.id}/members`);
      if (response.ok) {
        const data = await response.json();
        // A API retorna diretamente o array de membros
        setMembers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleSave = async () => {
    if (!playlist?.id || !name.trim()) {
      toast.error('Nome da playlist é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/playlists/${playlist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          isPublic: visibility === 'PUBLIC',
          isNotListed: visibility === 'NOT_LISTED',
          isPrivate: visibility === 'PRIVATE'
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
      setSaving(false);
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

    // Verificar se o email já foi convidado
    const existingMember = members.find(m => 
      (m.userEmail || m.email)?.toLowerCase() === inviteEmail.trim().toLowerCase()
    );
    
    setInviting(true);
    
    // Se já existe um convite, fazer revoke primeiro
    if (existingMember && (existingMember.status === 'pending' || existingMember.status === 'PENDING')) {
      try {
        console.log(`Revoking existing invite for member ${existingMember.id}`);
        const revokeResponse = await fetch(`/api/playlists/${playlist.id}/members?memberId=${existingMember.id}`, {
          method: 'DELETE'
        });
        
        if (!revokeResponse.ok) {
          const revokeError = await revokeResponse.json();
          console.error('Revoke failed:', revokeError);
          toast.error('Erro ao revogar convite anterior');
          setInviting(false);
          return;
        }
        
        console.log('Previous invite revoked successfully');
        toast.success('Convite anterior revogado. Enviando novo convite...');
        
        // Aguardar um pouco para garantir que a base de dados foi atualizada
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error('Error revoking previous invite:', error);
        toast.error('Erro ao revogar convite anterior');
        setInviting(false);
        return;
      }
    } else if (existingMember && (existingMember.status === 'accepted' || existingMember.status === 'ACCEPTED')) {
      toast.error('Este utilizador já é colaborador da playlist');
      setInviting(false);
      return;
    }

    try {
      console.log(`Sending new invite to ${inviteEmail.trim()}`);
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

    const isPending = memberStatus === 'PENDING' || memberStatus === 'pending';
    const confirmMessage = isPending 
      ? 'Tem certeza que deseja cancelar este convite?'
      : 'Tem certeza que deseja remover este membro?';
    
    if (!confirm(confirmMessage)) return;

    try {
      const endpoint = isPending
        ? `/api/playlists/${playlist.id}/invites/${memberId}`
        : `/api/playlists/${playlist.id}/members/${memberId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (response.ok) {
        const message = isPending ? 'Convite cancelado' : 'Membro removido';
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

  const handleResendInvite = async (memberId: string, memberEmail: string) => {
    if (!playlist?.id) return;

    setResending(memberId);
    try {
      const response = await fetch(`/api/playlists/${playlist.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: memberEmail }),
      });

      if (response.ok) {
        toast.success('Convite reenviado com sucesso!');
        fetchMembers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao reenviar convite');
      }
    } catch (error) {
      console.error('Error resending invite:', error);
      toast.error('Erro ao reenviar convite');
    } finally {
      setResending(null);
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

  // Separar membros ativos e pendentes
  const activeMembers = members.filter(m => 
    m.status === 'ACCEPTED' || m.status === 'accepted'
  );
  
  const pendingMembers = members.filter(m => 
    m.status === 'PENDING' || m.status === 'pending'
  );





  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
          className="p-0 overflow-hidden w-full max-w-none sm:mx-4 sm:rounded-lg sm:max-w-3xl md:max-w-5xl lg:max-w-[1100px] xl:max-w-[1300px] max-h-[95vh] sm:max-h-[95vh]"
        >
        {/* Background with blur effect */}
        <div className="absolute inset-0 bg-background/95 backdrop-blur-sm" />
        
        <div className="relative flex flex-col h-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 border-b bg-muted/20">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl sm:text-2xl font-semibold tracking-tight truncate">
                {playlist.title}
              </DialogTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Configurações da playlist
              </p>
            </div>
            <Badge variant="secondary" className="px-2 py-1 sm:px-3 sm:py-1.5 font-medium text-xs sm:text-sm self-start sm:self-center">
              <Crown className="h-3 w-3 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Proprietário</span>
              <span className="sm:hidden">Owner</span>
            </Badge>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-start">
              
              {/* Left Column - Playlist Settings */}
              <div className="lg:col-span-4 space-y-4 order-1 lg:order-1">
                <Card className="border-0 shadow-none bg-muted/20">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-medium">Configurações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-base font-medium">Nome da Playlist</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
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
                        className="mt-2"
                        placeholder="Descrição opcional da playlist"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Visibilidade</Label>
                      <div className="grid grid-cols-1 gap-2 mt-3">
                        <Button
                          type="button"
                          variant={visibility === 'PRIVATE' ? 'default' : 'outline'}
                          className="justify-start h-auto p-4 min-h-[60px] sm:min-h-[48px]"
                          onClick={() => setVisibility('PRIVATE')}
                        >
                          <div className="flex items-center gap-3">
                            <Lock className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                            <div className="text-left">
                              <div className="font-medium text-sm sm:text-base">Privada</div>
                              <div className="text-xs text-muted-foreground">Apenas você e editores</div>
                            </div>
                          </div>
                        </Button>

                        <Button
                          type="button"
                          variant={visibility === 'NOT_LISTED' ? 'default' : 'outline'}
                          className="justify-start h-auto p-4 min-h-[60px] sm:min-h-[48px]"
                          onClick={() => setVisibility('NOT_LISTED')}
                        >
                          <div className="flex items-center gap-3">
                            <Eye className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                            <div className="text-left">
                              <div className="font-medium text-sm sm:text-base">Não listada</div>
                              <div className="text-xs text-muted-foreground">Apenas com link direto</div>
                            </div>
                          </div>
                        </Button>

                        <Button
                          type="button"
                          variant={visibility === 'PUBLIC' ? 'default' : 'outline'}
                          className="justify-start h-auto p-4 min-h-[60px] sm:min-h-[48px]"
                          onClick={() => setVisibility('PUBLIC')}
                        >
                          <div className="flex items-center gap-3">
                            <Globe className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                            <div className="text-left">
                              <div className="font-medium text-sm sm:text-base">Pública</div>
                              <div className="text-xs text-muted-foreground">Visível para todos</div>
                            </div>
                          </div>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>


              </div>

              {/* Right Column - Members Management */}
              <div className="lg:col-span-8 space-y-4 order-2 lg:order-2">
                <Card className="border-0 shadow-none bg-muted/20">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between text-lg font-medium">
                      <span>Colaboradores</span>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {activeMembers.length} ativo{activeMembers.length !== 1 ? 's' : ''}
                        </Badge>
                        {pendingMembers.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {pendingMembers.length} pendente{pendingMembers.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    {/* Invite new member */}
                    <div>
                      <Label className="text-sm">Convidar Novo Colaborador</Label>
                      <div className="flex flex-col sm:flex-row gap-3 mt-2">
                        <Input
                          placeholder="Email do utilizador..."
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          type="email"
                          className="flex-1"
                        />
                        <Button 
                          onClick={handleInvite} 
                          disabled={!inviteEmail || inviting}
                          size="sm"
                          className="w-full sm:w-auto"
                        >
                          {inviting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              <span className="sm:hidden">Enviar Convite</span>
                              <span className="hidden sm:inline">Convidar</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        O editor poderá adicionar e remover músicas da playlist.
                      </p>
                    </div>

                    <Separator />

                    {/* Loading Spinner */}
                    {membersLoading && (
                      <div className="flex items-center justify-center py-12">
                        <div className="flex items-center gap-3">
                          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-2 border-muted-foreground/20 border-t-muted-foreground"></div>
                          <span className="sr-only">A carregar...</span><span aria-hidden data-nosnippet className="text-muted-foreground">A carregar...</span>
                        </div>
                      </div>
                    )}

                    {/* Active Members */}
                    {!membersLoading && activeMembers.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground mb-3">
                          Colaboradores Ativos ({activeMembers.length})
                        </Label>
                        <div className="space-y-2">
                          {activeMembers.map((member) => (
                            <div key={member.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 px-3 rounded-lg border bg-card">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="relative flex-shrink-0">
                                  <img 
                                    src={member.user?.image || '/default-profile.png'} 
                                    alt={member.user?.name || member.name || 'User'} 
                                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = '/default-profile.png';
                                    }}
                                  />
                                  {(member.role === 'owner' || member.role === 'OWNER') && (
                                    <Crown className="absolute -top-1 -right-1 h-3 w-3 text-amber-500" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">
                                    {member.name || member.email || member.userEmail}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {member.role === 'owner' || member.role === 'OWNER' ? 'Proprietário' : 'Editor'}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 self-start sm:self-center">
                                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                  Ativo
                                </Badge>
                                {(member.role === 'editor' || member.role === 'EDITOR') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveMember(member.id, member.status)}
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pending Invites */}
                    {!membersLoading && pendingMembers.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground mb-3">
                          Convites Pendentes ({pendingMembers.length})
                        </Label>
                        <div className="space-y-2">
                          {pendingMembers.map((member) => (
                            <div key={member.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 px-3 rounded-lg border bg-card">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="relative flex-shrink-0">
                                  <img 
                                    src={member.user?.image || '/default-profile.png'} 
                                    alt={member.user?.name || member.name || 'User'} 
                                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover opacity-60"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = '/default-profile.png';
                                    }}
                                  />
                                  <Clock className="absolute -bottom-1 -right-1 h-3 w-3 text-muted-foreground bg-background rounded-full p-0.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">
                                    {member.name || member.email || member.userEmail}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Convite enviado • Editor
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 sm:gap-2 self-start sm:self-center">
                                <Badge variant="outline" className="text-xs px-2 py-0.5 sm:px-3">
                                  Aguardando
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResendInvite(member.id, member.userEmail || member.email || '')}
                                  disabled={resending === member.id}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                                >
                                  {resending === member.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveMember(member.id, member.status)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empty state */}
                    {!membersLoading && activeMembers.length === 0 && pendingMembers.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum colaborador ainda.</p>
                        <p className="text-sm">Convide alguém para colaborar na playlist!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-6 border-t bg-muted/30">
            <div className="flex gap-2">
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={loading}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Apagar Playlist
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !name} className="flex-1 sm:flex-none">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Guardar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { PlaylistEditModal };
export default PlaylistEditModal;