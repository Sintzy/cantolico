'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useClerkSession';
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
  Church,
  Users,
  Globe,
  Lock,
  Eye,
  Calendar,
  User as UserIcon
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Mass,
  MassVisibility,
  LiturgicalColor,
  LITURGICAL_COLORS,
  LITURGICAL_COLOR_LABELS,
  getColorHex,
} from '@/types/mass';

interface MassMember {
  id: string;
  userEmail: string;
  name?: string;
  status: 'PENDING' | 'ACCEPTED';
  role: 'OWNER' | 'EDITOR';
}

interface EditMassModalProps {
  mass: Mass & { isOwner: boolean };
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedMass: Partial<Mass>) => void;
  onDelete?: () => void;
}

export default function EditMassModal({ mass, isOpen, onClose, onUpdate, onDelete }: EditMassModalProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [parish, setParish] = useState('');
  const [celebrant, setCelebrant] = useState('');
  const [celebration, setCelebration] = useState('');
  const [liturgicalColor, setLiturgicalColor] = useState<LiturgicalColor | ''>('');
  const [visibility, setVisibility] = useState<MassVisibility>('PRIVATE');
  const [inviteEmail, setInviteEmail] = useState('');
  const [members, setMembers] = useState<MassMember[]>([]);

  // Reset form when mass changes
  useEffect(() => {
    if (mass && isOpen) {
      setName(mass.name || '');
      setDescription(mass.description || '');
      setParish(mass.parish || '');
      setCelebrant(mass.celebrant || '');
      setCelebration(mass.celebration || '');
      setLiturgicalColor((mass.liturgicalColor as LiturgicalColor) || '');
      setVisibility(mass.visibility || 'PRIVATE');
      
      // Parse date and time
      if (mass.date) {
        const d = new Date(mass.date);
        setDate(d.toISOString().split('T')[0]);
        setTime(d.toTimeString().slice(0, 5));
      } else {
        setDate('');
        setTime('');
      }
      
      fetchMembers();
    }
  }, [mass?.id, isOpen]);

  const isOwner = mass?.isOwner;
  const canEditSettings = true; // Allow editing if modal is open (access already validated)

  if (!mass) {
    return null;
  }

  const fetchMembers = async () => {
    if (!mass?.id) return;

    try {
      const response = await fetch(`/api/masses/${mass.id}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleSave = async () => {
    if (!mass?.id || !name.trim()) {
      toast.error('O nome da missa é obrigatório');
      return;
    }

    setLoading(true);
    try {
      // Combine date and time
      let dateTime = null;
      if (date) {
        dateTime = time 
          ? `${date}T${time}:00`
          : `${date}T10:00:00`;
      }

      const response = await fetch(`/api/masses/${mass.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          date: dateTime,
          parish: parish.trim() || null,
          celebrant: celebrant.trim() || null,
          celebration: celebration.trim() || null,
          liturgicalColor: liturgicalColor || null,
          visibility,
        }),
      });

      if (response.ok) {
        const updatedMass = await response.json();
        toast.success('Missa atualizada com sucesso!');
        onUpdate(updatedMass);
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao atualizar missa');
      }
    } catch (error) {
      console.error('Error updating mass:', error);
      toast.error('Erro ao atualizar missa');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!mass?.id || !confirm('Tens a certeza que queres apagar esta missa? Esta ação não pode ser desfeita.')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/masses/${mass.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Missa apagada com sucesso!');
        onDelete?.();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao apagar missa');
      }
    } catch (error) {
      console.error('Error deleting mass:', error);
      toast.error('Erro ao apagar missa');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !mass?.id) return;

    setInviting(true);
    try {
      const response = await fetch(`/api/masses/${mass.id}/invite`, {
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
    if (!mass?.id) return;

    const confirmMessage = memberStatus === 'PENDING' 
      ? 'Tens a certeza que queres cancelar este convite?'
      : 'Tens a certeza que queres remover este membro?';
    
    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/api/masses/${mass.id}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const message = memberStatus === 'PENDING' ? 'Convite cancelado' : 'Membro removido';
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

  const getVisibilityIcon = (vis: MassVisibility) => {
    switch (vis) {
      case 'PUBLIC': return <Globe className="h-4 w-4" />;
      case 'NOT_LISTED': return <Eye className="h-4 w-4" />;
      default: return <Lock className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-6 border-b bg-background">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ 
                backgroundColor: liturgicalColor 
                  ? `${getColorHex(liturgicalColor)}20`
                  : 'hsl(var(--primary) / 0.1)'
              }}
            >
              <Church 
                className="h-5 w-5" 
                style={{ 
                  color: liturgicalColor 
                    ? getColorHex(liturgicalColor)
                    : 'hsl(var(--primary))'
                }}
              />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                {canEditSettings ? 'Editar Missa' : 'Detalhes da Missa'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {canEditSettings ? 'Gere os detalhes da celebração' : 'Visualizar informações da missa'}
              </p>
            </div>
          </div>
          <Badge variant={isOwner ? 'default' : 'secondary'} className="px-3 py-1.5">
            {isOwner ? (
              <>
                <Crown className="h-3 w-3 mr-1" />
                Organizador
              </>
            ) : (
              <>
                <UserCheck className="h-3 w-3 mr-1" />
                Editor
              </>
            )}
          </Badge>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-base font-medium">Nome da Missa *</Label>
            <Input
              id="name"
              value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEditSettings}
                placeholder="Ex: Missa do 1º Domingo do Advento"
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={!canEditSettings}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Hora</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={!canEditSettings}
                />
              </div>
            </div>

            {/* Celebration */}
            <div className="space-y-2">
              <Label htmlFor="celebration">Celebração</Label>
              <Input
                id="celebration"
                value={celebration}
                onChange={(e) => setCelebration(e.target.value)}
                disabled={!canEditSettings}
                placeholder="Ex: 1º Domingo do Advento"
              />
            </div>

            {/* Liturgical Color */}
            <div className="space-y-2">
              <Label htmlFor="liturgicalColor">Cor Litúrgica</Label>
              <Select
                value={liturgicalColor || "NONE"}
                onValueChange={(value) => setLiturgicalColor(value === "NONE" ? "" : value as LiturgicalColor)}
                disabled={!canEditSettings}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Nenhuma</SelectItem>
                  {LITURGICAL_COLORS.map((color) => (
                    <SelectItem key={color} value={color}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full border"
                          style={{ backgroundColor: getColorHex(color) }}
                        />
                        {LITURGICAL_COLOR_LABELS[color]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Parish and Celebrant */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parish" className="flex items-center gap-2">
                  <Church className="w-4 h-4" />
                  Paróquia/Local
                </Label>
                <Input
                  id="parish"
                  value={parish}
                  onChange={(e) => setParish(e.target.value)}
                  disabled={!canEditSettings}
                  placeholder="Ex: Paróquia de São João"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="celebrant" className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  Celebrante
                </Label>
                <Input
                  id="celebrant"
                  value={celebrant}
                  onChange={(e) => setCelebrant(e.target.value)}
                  disabled={!canEditSettings}
                  placeholder="Ex: Padre António"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Notas/Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canEditSettings}
                placeholder="Notas adicionais sobre a missa..."
                rows={3}
              />
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <Label htmlFor="visibility">Visibilidade</Label>
              <Select
                value={visibility}
                onValueChange={(value) => setVisibility(value as MassVisibility)}
                disabled={!canEditSettings}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Privada - Só tu podes ver
                    </div>
                  </SelectItem>
                  <SelectItem value="NOT_LISTED">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Não listada - Quem tiver o link pode ver
                    </div>
                  </SelectItem>
                  <SelectItem value="PUBLIC">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Pública - Todos podem ver e duplicar
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Members Section - Only for owners */}
            {canEditSettings && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Membros e Editores
                  </Label>
                </div>

                {/* Invite Form */}
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Email do membro..."
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleInvite} 
                    disabled={inviting || !inviteEmail.trim()}
                    size="sm"
                  >
                    {inviting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Convidar
                      </>
                    )}
                  </Button>
                </div>

                {/* Members List */}
                {members.length > 0 && (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div 
                        key={member.id} 
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            {member.role === 'OWNER' ? (
                              <Crown className="h-4 w-4 text-primary" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {member.name || member.userEmail}
                            </p>
                            {member.name && (
                              <p className="text-xs text-muted-foreground">{member.userEmail}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={member.status === 'PENDING' ? 'secondary' : 'default'}>
                            {member.status === 'PENDING' ? 'Pendente' : member.role === 'OWNER' ? 'Dono' : 'Editor'}
                          </Badge>
                          {member.role !== 'OWNER' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMember(member.id, member.status)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {members.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum membro ainda. Convida alguém para colaborar!
                  </p>
                )}
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between p-6 border-t bg-muted/30 gap-4">
          {isOwner && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
              className="px-4"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Apagar
            </Button>
          )}
          <div className="flex items-center gap-3 ml-auto">
            <Button variant="outline" onClick={onClose} disabled={loading} className="px-5">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading || !name.trim()} className="px-6">
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
