'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  User,
  Shield,
  Monitor,
  Settings,
  Globe,
  Trash2,
  LogOut,
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Save,
  X,
  Pencil,
  Music,
  ListMusic,
  Star,
  FileText,
  Lock,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface Session {
  id: string;
  status: string;
  lastActiveAt: number;
  expireAt: number;
  clientId: string;
  createdAt: number;
  updatedAt: number;
  isCurrent: boolean;
}

interface UserStats {
  songs: number;
  playlists: number;
  stars: number;
  submissions: number;
}

interface AccountPageClientProps {
  initialStats: UserStats;
  initialSessions: Session[];
}

export default function AccountPageClient({ initialStats, initialSessions }: AccountPageClientProps) {
  const { user, isLoaded } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [stats] = useState<UserStats>(initialStats);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Estados de edição
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Estados de segurança
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Inicializar estados quando o user carrega
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
  }, [user]);

  const refreshSessions = async () => {
    setLoadingSessions(true);
    try {
      const response = await fetch('/api/user/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Erro ao carregar sessões:', error);
    }
    setLoadingSessions(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);

    try {
      await user.update({
        firstName: firstName,
        lastName: lastName,
      });
      toast.success('Perfil atualizado com sucesso');
      setIsEditingProfile(false);
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error(error.errors?.[0]?.message || 'Erro ao atualizar perfil');
    }

    setSavingProfile(false);
  };

  const handleCancelEdit = () => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
    setIsEditingProfile(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingImage(true);
    try {
      await user.setProfileImage({ file });
      toast.success('Foto de perfil atualizada');
    } catch (error: any) {
      console.error('Erro ao carregar imagem:', error);
      toast.error(error.errors?.[0]?.message || 'Erro ao carregar imagem');
    }
    setUploadingImage(false);
  };

  const handleChangePassword = async () => {
    if (!user) return;

    if (newPassword !== confirmPassword) {
      toast.error('As passwords não coincidem');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('A password deve ter pelo menos 8 caracteres');
      return;
    }

    setSavingPassword(true);
    try {
      await user.updatePassword({
        currentPassword: currentPassword,
        newPassword: newPassword,
      });
      toast.success('Password alterada com sucesso');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Erro ao alterar password:', error);
      toast.error(error.errors?.[0]?.message || 'Erro ao alterar password');
    }
    setSavingPassword(false);
  };

  const revokeSession = async (sessionId: string) => {
    try {
      const response = await fetch('/api/user/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (response.ok) {
        toast.success('Sessão terminada com sucesso');
        refreshSessions();
      } else {
        toast.error('Erro ao terminar sessão');
      }
    } catch (error) {
      toast.error('Erro ao terminar sessão');
    }
  };

  const revokeAllSessions = async () => {
    try {
      const response = await fetch('/api/user/sessions/revoke-all', {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Todas as sessões foram terminadas');
        refreshSessions();
      } else {
        toast.error('Erro ao terminar sessões');
      }
    } catch (error) {
      toast.error('Erro ao terminar sessões');
    }
  };

  const deleteAccount = async () => {
    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        toast.success('Conta eliminada com sucesso');
        window.location.href = '/';
      } else {
        toast.error('Erro ao eliminar conta');
      }
    } catch (error) {
      toast.error('Erro ao eliminar conta');
    }
  };

  if (!isLoaded) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-rose-500" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const primaryEmail = user.primaryEmailAddress?.emailAddress;
  const hasPassword = user.passwordEnabled;
  const externalAccounts = user.externalAccounts || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Minha Conta</h1>
        <p className="text-slate-500 mt-1">Gerir o seu perfil e configurações</p>
      </div>

      {/* Profile Card */}
      <Card className="mb-8 overflow-hidden border-slate-200">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-full border-2 border-slate-200 bg-white overflow-hidden">
                {user.imageUrl ? (
                  <Image
                    src={user.imageUrl}
                    alt={user.fullName || 'User'}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                    <User className="w-10 h-10 text-slate-400" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              >
                {uploadingImage ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">
                  {user.fullName || 'Utilizador'}
                </h2>
                {user.publicMetadata?.role ? (
                  <Badge variant="outline" className="border-slate-300 text-slate-600">
                    {String(user.publicMetadata.role)}
                  </Badge>
                ) : null}
              </div>
              <p className="text-slate-500 text-sm">{primaryEmail}</p>
            </div>

            {/* Stats */}
            <div className="flex gap-6 pt-4 sm:pt-0">
              <div className="text-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-100 mb-1 mx-auto">
                  <Music className="w-5 h-5 text-rose-600" />
                </div>
                <div className="text-lg font-bold text-slate-900">{stats.songs}</div>
                <div className="text-xs text-slate-500">Músicas</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 mb-1 mx-auto">
                  <ListMusic className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-lg font-bold text-slate-900">{stats.playlists}</div>
                <div className="text-xs text-slate-500">Playlists</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-100 mb-1 mx-auto">
                  <Star className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="text-lg font-bold text-slate-900">{stats.stars}</div>
                <div className="text-xs text-slate-500">Favoritos</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 mb-1 mx-auto">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-lg font-bold text-slate-900">{stats.submissions}</div>
                <div className="text-xs text-slate-500">Submissões</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full grid grid-cols-4 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <User className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Shield className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Segurança</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Monitor className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Sessões</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Settings className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Avançado</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Perfil */}
        <TabsContent value="profile">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>Atualize os seus dados pessoais</CardDescription>
              </div>
              {!isEditingProfile ? (
                <Button variant="outline" onClick={() => setIsEditingProfile(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={handleCancelEdit} disabled={savingProfile}>
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Guardar
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome Próprio</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={!isEditingProfile}
                    placeholder="O seu nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apelido</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={!isEditingProfile}
                    placeholder="O seu apelido"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={primaryEmail || ''}
                    disabled
                    className="bg-slate-50"
                  />
                  {user.primaryEmailAddress?.verification?.status === 'verified' ? (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 shrink-0">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Verificado
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="shrink-0">
                      <XCircle className="w-3 h-3 mr-1" />
                      Não verificado
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  O email não pode ser alterado por aqui
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Segurança */}
        <TabsContent value="security" className="space-y-6">
          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Password
              </CardTitle>
              <CardDescription>
                {hasPassword ? 'Altere a sua password' : 'Configure uma password para a sua conta'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isChangingPassword ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {hasPassword ? (
                      <>
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">Password configurada</p>
                          <p className="text-sm text-slate-500">Última alteração desconhecida</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">Sem password</p>
                          <p className="text-sm text-slate-500">Está a usar login social</p>
                        </div>
                      </>
                    )}
                  </div>
                  <Button variant="outline" onClick={() => setIsChangingPassword(true)}>
                    {hasPassword ? 'Alterar password' : 'Criar password'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {hasPassword && (
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Password Atual</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Introduza a password atual"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Introduza a nova password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirme a nova password"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      disabled={savingPassword}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleChangePassword} disabled={savingPassword}>
                      {savingPassword ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Guardar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contas Ligadas */}
          {externalAccounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Contas Ligadas
                </CardTitle>
                <CardDescription>
                  Contas externas ligadas à sua conta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {externalAccounts.map((account: any) => (
                  <div key={account.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center">
                        {account.provider === 'google' ? (
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        ) : (
                          <Globe className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 capitalize">{account.provider}</p>
                        <p className="text-sm text-slate-500">
                          {account.emailAddress || account.username || 'Ligado'}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      Ligado
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Sessões */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sessões Ativas</CardTitle>
                <CardDescription>Dispositivos com sessão iniciada</CardDescription>
              </div>
              {sessions.length > 1 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-600 hover:text-red-700">
                      <LogOut className="w-4 h-4 mr-2" />
                      Terminar Todas
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Terminar todas as sessões?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isto irá terminar a sessão em todos os dispositivos, exceto o atual.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={revokeAllSessions}>
                        Terminar Todas
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardHeader>
            <CardContent>
              {loadingSessions ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8">
                  <Monitor className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500">Nenhuma sessão ativa encontrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => {
                    const lastActive = new Date(session.lastActiveAt);
                    const isCurrentSession = session.isCurrent;

                    return (
                      <div key={session.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center">
                            <Monitor className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-900">Dispositivo</p>
                              {isCurrentSession && (
                                <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                                  Atual
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">
                              Última atividade: {lastActive.toLocaleString('pt-PT')}
                            </p>
                          </div>
                        </div>
                        {!isCurrentSession && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                <LogOut className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Terminar sessão?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação irá terminar a sessão neste dispositivo.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => revokeSession(session.id)}>
                                  Terminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Avançado */}
        <TabsContent value="advanced">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Zona de Perigo
              </CardTitle>
              <CardDescription>
                Ações irreversíveis. Tenha cuidado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-red-900">Eliminar Conta</p>
                      <p className="text-sm text-red-700 mt-1">
                        Eliminar permanentemente a sua conta e todos os dados associados.
                        Esta ação é irreversível.
                      </p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="shrink-0">
                        Eliminar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar conta permanentemente?</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <p>Esta ação é irreversível. Serão eliminados:</p>
                          <ul className="list-disc list-inside text-sm">
                            <li>Todas as suas músicas e submissões</li>
                            <li>Todas as suas playlists</li>
                            <li>Todos os favoritos</li>
                            <li>Histórico de atividade</li>
                          </ul>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={deleteAccount}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Sim, eliminar conta
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
