'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  User, Shield, Monitor, Settings, Globe, Trash2, LogOut,
  Camera, CheckCircle2, XCircle, AlertTriangle, Save, X,
  Pencil, Music, ListMusic, Star, FileText, Lock, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';

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

type Tab = 'profile' | 'security' | 'sessions' | 'advanced';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile',  label: 'Perfil',    icon: User    },
  { id: 'security', label: 'Segurança', icon: Shield  },
  { id: 'sessions', label: 'Sessões',   icon: Monitor },
  { id: 'advanced', label: 'Avançado',  icon: Settings },
];

export default function AccountPageClient({ initialStats, initialSessions }: AccountPageClientProps) {
  const { user, isLoaded } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [stats] = useState<UserStats>(initialStats);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
  }, [user]);

  const refreshSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch('/api/user/sessions');
      if (res.ok) { const d = await res.json(); setSessions(d.sessions || []); }
    } catch { /* silent */ }
    setLoadingSessions(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await user.update({ firstName, lastName });
      toast.success('Perfil atualizado com sucesso');
      setIsEditingProfile(false);
    } catch (e: any) { toast.error(e.errors?.[0]?.message || 'Erro ao atualizar perfil'); }
    setSavingProfile(false);
  };

  const handleCancelEdit = () => {
    if (user) { setFirstName(user.firstName || ''); setLastName(user.lastName || ''); }
    setIsEditingProfile(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingImage(true);
    try {
      await user.setProfileImage({ file });
      toast.success('Foto de perfil atualizada');
    } catch (e: any) { toast.error(e.errors?.[0]?.message || 'Erro ao carregar imagem'); }
    setUploadingImage(false);
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (newPassword !== confirmPassword) { toast.error('As passwords não coincidem'); return; }
    if (newPassword.length < 8) { toast.error('A password deve ter pelo menos 8 caracteres'); return; }
    setSavingPassword(true);
    try {
      await user.updatePassword({ currentPassword, newPassword });
      toast.success('Password alterada com sucesso');
      setIsChangingPassword(false);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e: any) { toast.error(e.errors?.[0]?.message || 'Erro ao alterar password'); }
    setSavingPassword(false);
  };

  const revokeSession = async (sessionId: string) => {
    try {
      const res = await fetch('/api/user/sessions/revoke', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) { toast.success('Sessão terminada'); refreshSessions(); }
      else toast.error('Erro ao terminar sessão');
    } catch { toast.error('Erro ao terminar sessão'); }
  };

  const revokeAllSessions = async () => {
    try {
      const res = await fetch('/api/user/sessions/revoke-all', { method: 'POST' });
      if (res.ok) { toast.success('Todas as sessões foram terminadas'); refreshSessions(); }
      else toast.error('Erro ao terminar sessões');
    } catch { toast.error('Erro ao terminar sessões'); }
  };

  const deleteAccount = async () => {
    try {
      const res = await fetch('/api/user/delete-account', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      });
      if (res.ok) { toast.success('Conta eliminada'); window.location.href = '/'; }
      else toast.error('Erro ao eliminar conta');
    } catch { toast.error('Erro ao eliminar conta'); }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-7 w-7 animate-spin text-rose-700" />
      </div>
    );
  }
  if (!user) return null;

  const primaryEmail = user.primaryEmailAddress?.emailAddress;
  const hasPassword = user.passwordEnabled;
  const externalAccounts = user.externalAccounts || [];

  const field = "border-stone-200 bg-white rounded-lg text-stone-900 focus:border-stone-400 focus-visible:ring-0 focus-visible:border-stone-400 placeholder:text-stone-400 disabled:bg-stone-50 disabled:text-stone-500";

  return (
    <div className="relative w-full min-h-screen bg-white">

      {/* ── Page header ── same pattern as /musics/[id] */}
      <div className="border-b border-stone-100 bg-white pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">

          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition-colors mb-6">
            ← Início
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <span className="text-rose-700 text-sm">✝</span>
            <span className="h-px w-6 bg-stone-300" />
            <span className="text-xs font-medium tracking-[0.18em] text-stone-400 uppercase">Conta</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <h1 className="font-display text-4xl sm:text-5xl text-stone-900 leading-tight">
              A Minha Conta
            </h1>

            {/* Avatar + name inline in header */}
            <div className="flex items-center gap-3 pb-1">
              <div className="relative group shrink-0">
                <div className="w-10 h-10 rounded-full border border-stone-200 overflow-hidden">
                  {user.imageUrl ? (
                    <Image src={user.imageUrl} alt={user.fullName || 'User'} width={40} height={40} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-stone-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-stone-400" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                >
                  {uploadingImage
                    ? <Loader2 className="w-3 h-3 text-white animate-spin" />
                    : <Camera className="w-3 h-3 text-white" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-stone-900 truncate">{user.fullName || 'Utilizador'}</span>
                  {!!user.publicMetadata?.role && (
                    <Badge className="bg-stone-100 text-stone-600 font-medium px-2 py-0.5 text-[10px] uppercase tracking-wide">
                      {String(user.publicMetadata.role)}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-stone-400 truncate">{primaryEmail}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="border-b border-stone-100 bg-stone-50/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex items-center gap-6 sm:gap-8">
          {[
            { icon: Music,     value: stats.songs,       label: 'Músicas',    color: 'text-rose-600'  },
            { icon: ListMusic, value: stats.playlists,    label: 'Playlists',  color: 'text-stone-600' },
            { icon: Star,      value: stats.stars,        label: 'Favoritos',  color: 'text-amber-500' },
            { icon: FileText,  value: stats.submissions,  label: 'Submissões', color: 'text-stone-500' },
          ].map(({ icon: Icon, value, label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-sm font-semibold text-stone-900">{value}</span>
              <span className="text-xs text-stone-400 hidden sm:inline">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs + content ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">

        {/* Tab bar */}
        <div className="flex gap-0 border-b border-stone-200 mb-8">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === id
                  ? 'border-rose-700 text-rose-700'
                  : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* ── Perfil ── */}
        {activeTab === 'profile' && (
          <div className="rounded-xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/50">
              <div>
                <p className="text-sm font-semibold text-stone-900">Informações Pessoais</p>
                <p className="text-xs text-stone-500 mt-0.5">Atualize os seus dados pessoais</p>
              </div>
              {!isEditingProfile ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)}
                  className="border-stone-200 text-stone-700 hover:bg-stone-100 text-xs h-8">
                  <Pencil className="w-3 h-3 mr-1.5" /> Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={savingProfile}
                    className="text-stone-600 text-xs h-8">
                    <X className="w-3 h-3 mr-1.5" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile}
                    className="bg-stone-900 hover:bg-rose-700 transition-colors text-xs h-8">
                    {savingProfile ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Save className="w-3 h-3 mr-1.5" />}
                    Guardar
                  </Button>
                </div>
              )}
            </div>
            <div className="px-6 py-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-stone-700 text-sm font-medium">Nome Próprio</Label>
                  <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)}
                    disabled={!isEditingProfile} placeholder="O seu nome" className={field} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-stone-700 text-sm font-medium">Apelido</Label>
                  <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)}
                    disabled={!isEditingProfile} placeholder="O seu apelido" className={field} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-stone-700 text-sm font-medium">Email</Label>
                <div className="flex items-center gap-3">
                  <Input value={primaryEmail || ''} disabled className={`${field} flex-1`} />
                  {user.primaryEmailAddress?.verification?.status === 'verified' ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verificado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-red-500 shrink-0">
                      <XCircle className="w-3.5 h-3.5" /> Não verificado
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400">O email não pode ser alterado por aqui</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Segurança ── */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            {/* Password */}
            <div className="rounded-xl border border-stone-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50">
                <p className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-stone-400" /> Password
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {hasPassword ? 'Altere a sua password' : 'Configure uma password para a sua conta'}
                </p>
              </div>
              <div className="px-6 py-5">
                {!isChangingPassword ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {hasPassword ? (
                        <><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-sm text-stone-700">Password configurada</span></>
                      ) : (
                        <><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="text-sm text-stone-700">Sem password — a usar login social</span></>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(true)}
                      className="border-stone-200 text-stone-700 hover:bg-stone-100 text-xs h-8">
                      {hasPassword ? 'Alterar' : 'Criar password'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {hasPassword && (
                      <div className="space-y-1.5">
                        <Label htmlFor="currentPassword" className="text-stone-700 text-sm font-medium">Password Atual</Label>
                        <Input id="currentPassword" type="password" value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" className={field} />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="newPassword" className="text-stone-700 text-sm font-medium">Nova Password</Label>
                      <Input id="newPassword" type="password" value={newPassword}
                        onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className={field} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword" className="text-stone-700 text-sm font-medium">Confirmar Password</Label>
                      <Input id="confirmPassword" type="password" value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className={field} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" disabled={savingPassword}
                        onClick={() => { setIsChangingPassword(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}
                        className="text-stone-600 text-xs h-8">
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={handleChangePassword} disabled={savingPassword}
                        className="bg-stone-900 hover:bg-rose-700 transition-colors text-xs h-8">
                        {savingPassword ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Save className="w-3 h-3 mr-1.5" />}
                        Guardar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contas ligadas */}
            {externalAccounts.length > 0 && (
              <div className="rounded-xl border border-stone-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50">
                  <p className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-stone-400" /> Contas Ligadas
                  </p>
                </div>
                <div className="px-6 py-2 divide-y divide-stone-100">
                  {externalAccounts.map((account: any) => (
                    <div key={account.id} className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border border-stone-200 bg-stone-50 flex items-center justify-center shrink-0">
                          {account.provider === 'google' ? (
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                          ) : (
                            <Globe className="w-4 h-4 text-stone-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-stone-900 capitalize">{account.provider}</p>
                          <p className="text-xs text-stone-500">{account.emailAddress || account.username || 'Ligado'}</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" /> Ligado
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Sessões ── */}
        {activeTab === 'sessions' && (
          <div className="rounded-xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/50">
              <div>
                <p className="text-sm font-semibold text-stone-900">Sessões Ativas</p>
                <p className="text-xs text-stone-500 mt-0.5">Dispositivos com sessão iniciada</p>
              </div>
              {sessions.length > 1 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="border-stone-200 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-8">
                      <LogOut className="w-3 h-3 mr-1.5" /> Terminar Todas
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Terminar todas as sessões?</AlertDialogTitle>
                      <AlertDialogDescription>Isto irá terminar a sessão em todos os dispositivos, exceto o atual.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={revokeAllSessions}>Terminar Todas</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <div className="divide-y divide-stone-100">
              {loadingSessions ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-rose-700" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-10">
                  <Monitor className="w-8 h-8 mx-auto mb-2 text-stone-200" />
                  <p className="text-sm text-stone-400">Nenhuma sessão ativa encontrada</p>
                </div>
              ) : (
                sessions.map(session => (
                  <div key={session.id} className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border border-stone-200 bg-stone-50 flex items-center justify-center shrink-0">
                        <Monitor className="w-4 h-4 text-stone-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-stone-900">Dispositivo</p>
                          {session.isCurrent && (
                            <Badge className="bg-stone-100 text-stone-600 font-medium px-2 py-0.5 text-[10px] uppercase tracking-wide">Atual</Badge>
                          )}
                        </div>
                        <p className="text-xs text-stone-500">
                          Última atividade: {new Date(session.lastActiveAt).toLocaleString('pt-PT')}
                        </p>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0">
                            <LogOut className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Terminar sessão?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação irá terminar a sessão neste dispositivo.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => revokeSession(session.id)}>Terminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Avançado ── */}
        {activeTab === 'advanced' && (
          <div className="rounded-xl border border-red-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-red-100 bg-red-50/40">
              <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Zona de Perigo
              </p>
              <p className="text-xs text-red-500/80 mt-0.5">Ações irreversíveis. Tenha cuidado.</p>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-900">Eliminar Conta</p>
                    <p className="text-xs text-stone-500 mt-0.5 max-w-sm">
                      Eliminar permanentemente a sua conta e todos os dados associados. Esta ação é irreversível.
                    </p>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="shrink-0 text-xs h-8">Eliminar</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eliminar conta permanentemente?</AlertDialogTitle>
                      <AlertDialogDescription>
                        <p className="mb-2">Esta ação é irreversível. Serão eliminados:</p>
                        <ul className="list-disc list-inside text-sm space-y-0.5">
                          <li>Todas as suas músicas e submissões</li>
                          <li>Todas as suas playlists</li>
                          <li>Todos os favoritos</li>
                          <li>Histórico de atividade</li>
                        </ul>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={deleteAccount} className="bg-red-600 hover:bg-red-700">
                        Sim, eliminar conta
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
