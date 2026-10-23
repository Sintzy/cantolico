'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useClerkSession';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  Send, 
  Loader2, 
  Church,
  Users,
  Globe,
  Lock,
  Eye,
  Calendar,
  User as UserIcon,
  ListFilter,
  ChevronDown,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Mass,
  MassVisibility,
  LiturgicalColor,
  LITURGICAL_COLORS,
  LITURGICAL_COLOR_LABELS,
  LITURGICAL_MOMENTS,
  LITURGICAL_MOMENT_LABELS,
  LiturgicalMoment,
  getColorHex,
  toggleMassMomentVisibility,
} from '@/types/mass';
import { normalizeEmail } from '@/lib/mass-collaboration';

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
  const [hiddenMoments, setHiddenMoments] = useState<LiturgicalMoment[]>([]);
  const [isMomentOptionsOpen, setIsMomentOptionsOpen] = useState(false);
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
      setHiddenMoments(mass.hiddenMoments || []);
      setIsMomentOptionsOpen(false);
      
      // Parse date and time
      if (mass.date) {
        const d = new Date(mass.date);
        setDate(d.toISOString().split('T')[0]);
        setTime(d.toTimeString().slice(0, 5));
      } else {
        setDate('');
        setTime('');
      }
      
      if (mass.isOwner || session?.user?.role === 'ADMIN') {
        fetchMembers();
      } else {
        setMembers([]);
      }
    }
  }, [mass?.id, isOpen, session?.user?.role]);

  const isOwner = mass?.isOwner || session?.user?.id === mass?.userId;
  const isAdmin = session?.user?.role === 'ADMIN';
  const canManageMembers = isOwner || isAdmin;
  const canEditSettings = true; // Allow editing if modal is open (access already validated)
  const momentsWithSongs = new Set((mass.items || []).map((item) => item.moment));
  const visibleMomentCount = LITURGICAL_MOMENTS.length - hiddenMoments.length;

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
          hiddenMoments,
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

    const email = normalizeEmail(inviteEmail);
    if (!email) {
      toast.error('Introduz um email válido');
      return;
    }

    setInviting(true);
    try {
      const response = await fetch(`/api/masses/${mass.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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

  const toggleHiddenMoment = (moment: LiturgicalMoment) => {
    setHiddenMoments((current) => toggleMassMomentVisibility(current, moment, mass.items || []));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col overflow-hidden rounded-none border-stone-200 p-0 sm:h-[calc(100dvh-3rem)] sm:w-[min(1180px,calc(100vw-3rem))] sm:max-w-none sm:rounded-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-5 py-4 pr-14 sm:px-8 sm:py-5">
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
              <DialogTitle className="text-xl font-semibold sm:text-2xl">
                {canEditSettings ? 'Editar Missa' : 'Detalhes da Missa'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {canEditSettings ? 'Gere os detalhes da celebração' : 'Visualizar informações da missa'}
              </p>
            </div>
          </div>
          <Badge variant={isOwner ? 'default' : 'secondary'} className="hidden px-3 py-1.5 sm:inline-flex">
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
        <div className="flex-1 overflow-y-auto bg-stone-50/70 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] xl:items-start">
            <div className="space-y-6">
          <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-stone-900">Celebração</p>
              <p className="text-xs text-stone-500">Informações que aparecem no cabeçalho da missa.</p>
            </div>
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
                disabled={!canEditSettings || !(isOwner || isAdmin)}
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

          </section>

          <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-stone-900">Estrutura da celebração</p>
              <p className="text-xs text-stone-500">Escolhe quais os momentos vazios que queres mostrar na lista.</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-stone-900 p-2 text-white"><ListFilter className="h-4 w-4" /></div>
                  <div>
                    <p className="text-sm font-medium text-stone-900">Momentos apresentados</p>
                    <p className="text-xs text-stone-500">{visibleMomentCount} de {LITURGICAL_MOMENTS.length} momentos visíveis</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-between gap-3 border-stone-300 bg-white"
                  aria-expanded={isMomentOptionsOpen}
                  aria-controls="mass-moment-options"
                  onClick={() => setIsMomentOptionsOpen((current) => !current)}
                >
                  Personalizar
                  <ChevronDown className={`h-4 w-4 transition-transform ${isMomentOptionsOpen ? 'rotate-180' : ''}`} />
                </Button>
              </div>
              {isMomentOptionsOpen && (
                <div id="mass-moment-options" className="mt-4 rounded-xl border border-stone-200 bg-white p-3 sm:p-4">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-stone-900">Momentos litúrgicos</p>
                    <p className="text-xs text-stone-500">Desseleciona os momentos que não vais usar. Os que têm cânticos ficam sempre visíveis.</p>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {LITURGICAL_MOMENTS.map((moment) => {
                      const hasSongs = momentsWithSongs.has(moment);
                      const isVisible = !hiddenMoments.includes(moment);
                      return (
                        <label key={moment} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${hasSongs ? 'cursor-not-allowed bg-stone-50 text-stone-400' : 'cursor-pointer hover:bg-stone-50'}`}>
                          <Checkbox
                            checked={isVisible}
                            disabled={hasSongs || !canEditSettings}
                            onCheckedChange={() => toggleHiddenMoment(moment)}
                          />
                          <span className="flex-1">{LITURGICAL_MOMENT_LABELS[moment]}</span>
                          {hasSongs && <span className="text-xs">tem cânticos</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              {hiddenMoments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {hiddenMoments.map((moment) => <Badge key={moment} variant="secondary" className="gap-1"><EyeOff className="h-3 w-3" />{LITURGICAL_MOMENT_LABELS[moment]}</Badge>)}
                </div>
              )}
            </div>
          </section>

            </div>

            {/* Members Section - Only for owners */}
            <div className="space-y-6">
            {canManageMembers && (
              <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
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
              </section>
            )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col-reverse gap-3 border-t bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-5">
          {(isOwner || isAdmin) && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Apagar
            </Button>
          )}
          <div className="flex w-full flex-col-reverse gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:gap-3">
            <Button variant="outline" onClick={onClose} disabled={loading} className="w-full sm:w-auto sm:px-5">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading || !name.trim()} className="w-full sm:w-auto sm:px-6">
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
