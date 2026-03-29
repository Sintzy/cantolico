'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  ArrowLeft,
  Mail,
  Calendar,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Key,
  Smartphone,
  Globe,
  Clock,
  Activity,
  Music,
  ListMusic,
  Star,
  FileText,
  Ban,
  UserX,
  RefreshCw,
  LogOut,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  History,
  Settings,
  User,
  Link as LinkIcon,
} from 'lucide-react';

interface UserData {
  supabase: {
    id: number;
    name: string | null;
    email: string;
    image: string | null;
    role: string;
    bio: string | null;
    emailVerified: string | null;
    createdAt: string;
    updatedAt: string;
    clerkUserId: string | null;
    stats: {
      songs: number;
      playlists: number;
      stars: number;
      submissions: number;
    };
    moderationHistory: any[];
  };
  clerk: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    profileImageUrl: string | null;
    hasImage: boolean;
    primaryEmailAddress: any;
    emailAddresses: any[];
    primaryPhoneNumber: any;
    phoneNumbers: any[];
    externalAccounts: any[];
    publicMetadata: any;
    privateMetadata: any;
    lastSignInAt: number | null;
    lastActiveAt: number | null;
    createdAt: number;
    updatedAt: number;
    banned: boolean;
    locked: boolean;
    twoFactorEnabled: boolean;
    totpEnabled: boolean;
    backupCodeEnabled: boolean;
    passwordEnabled: boolean;
  } | null;
  sessions: any[];
  isLinked: boolean;
}

const ROLE_CONFIG = {
  USER: { label: 'Utilizador', color: 'bg-slate-100 text-slate-700', icon: User },
  TRUSTED: { label: 'Confiável', color: 'bg-green-100 text-green-700', icon: ShieldCheck },
  REVIEWER: { label: 'Revisor', color: 'bg-amber-100 text-amber-700', icon: Shield },
  ADMIN: { label: 'Administrador', color: 'bg-purple-100 text-purple-700', icon: ShieldAlert },
};

export default function AdminUserPageClient({ userId }: { userId: string }) {
  const router = useRouter();
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banDialogOpen, setBanDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId]);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/users/${userId}/clerk-data`);
      if (!res.ok) throw new Error('Erro ao carregar dados');
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar dados do utilizador');
    } finally {
      setLoading(false);
    }
  }

  async function executeAction(action: string, extraData?: any) {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/users/${userId}/clerk-actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extraData }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Erro ao executar ação');
      }

      toast.success(json.message || 'Ação executada com sucesso');
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao executar ação');
    } finally {
      setActionLoading(false);
    }
  }

  function formatDate(timestamp: number | string | null) {
    if (!timestamp) return 'Nunca';
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">Utilizador não encontrado</p>
      </div>
    );
  }

  const { supabase: user, clerk, sessions, isLinked } = data;
  const roleConfig = ROLE_CONFIG[user.role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.USER;
  const RoleIcon = roleConfig.icon;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Gestão de Utilizador</h1>
          <p className="text-sm text-muted-foreground">ID: {user.id} {clerk && `• Clerk: ${clerk.id}`}</p>
        </div>
      </div>

      {/* Status Alerts */}
      {clerk?.banned && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <Ban className="h-5 w-5 text-red-600" />
          <div>
            <p className="font-medium text-red-800">Utilizador Banido</p>
            <p className="text-sm text-red-600">Este utilizador está banido e não pode aceder ao sistema.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => executeAction('unban')}
            disabled={actionLoading}
          >
            Remover Ban
          </Button>
        </div>
      )}

      {!isLinked && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">Utilizador Não Migrado</p>
            <p className="text-sm text-amber-600">Este utilizador ainda não está ligado ao Clerk.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile */}
        <div className="lg:col-span-1 space-y-4">
          {/* Profile Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                    {(clerk?.imageUrl || user.image) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={clerk?.imageUrl || user.image || ''}
                        alt={user.name || 'Avatar'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-bold text-white">
                        {(user.name || user.email || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {clerk?.banned && (
                    <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1">
                      <Ban className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>

                <h2 className="mt-4 text-xl font-semibold">{user.name || 'Sem nome'}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>

                <Badge className={`mt-2 ${roleConfig.color}`}>
                  <RoleIcon className="h-3 w-3 mr-1" />
                  {roleConfig.label}
                </Badge>

                <div className="mt-4 w-full space-y-2 text-sm">
                  <div className="flex items-center justify-between py-2 border-t">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Registado
                    </span>
                    <span>{formatDate(user.createdAt)}</span>
                  </div>
                  {clerk?.lastSignInAt && (
                    <div className="flex items-center justify-between py-2 border-t">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Último login
                      </span>
                      <span>{formatDate(clerk.lastSignInAt)}</span>
                    </div>
                  )}
                  {clerk?.lastActiveAt && (
                    <div className="flex items-center justify-between py-2 border-t">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Última atividade
                      </span>
                      <span>{formatDate(clerk.lastActiveAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Estatísticas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <Music className="h-5 w-5 mx-auto text-slate-500" />
                  <p className="text-2xl font-bold mt-1">{user.stats.songs}</p>
                  <p className="text-xs text-muted-foreground">Músicas</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <ListMusic className="h-5 w-5 mx-auto text-slate-500" />
                  <p className="text-2xl font-bold mt-1">{user.stats.playlists}</p>
                  <p className="text-xs text-muted-foreground">Playlists</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <Star className="h-5 w-5 mx-auto text-slate-500" />
                  <p className="text-2xl font-bold mt-1">{user.stats.stars}</p>
                  <p className="text-xs text-muted-foreground">Favoritos</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <FileText className="h-5 w-5 mx-auto text-slate-500" />
                  <p className="text-2xl font-bold mt-1">{user.stats.submissions}</p>
                  <p className="text-xs text-muted-foreground">Submissões</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.location.href = `mailto:${user.email}`}
              >
                <Mail className="h-4 w-4 mr-2" />
                Enviar Email
              </Button>

              {!clerk?.banned ? (
                <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                      <Ban className="h-4 w-4 mr-2" />
                      Banir Utilizador
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Banir Utilizador</DialogTitle>
                      <DialogDescription>
                        O utilizador não poderá aceder ao sistema após ser banido.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Motivo do ban</Label>
                        <Textarea
                          value={banReason}
                          onChange={(e) => setBanReason(e.target.value)}
                          placeholder="Descreva o motivo do ban..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          executeAction('ban', { reason: banReason });
                          setBanDialogOpen(false);
                          setBanReason('');
                        }}
                        disabled={actionLoading}
                      >
                        Banir
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-start text-green-600 hover:text-green-700"
                  onClick={() => executeAction('unban')}
                  disabled={actionLoading}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Remover Ban
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => executeAction('revokeAllSessions')}
                disabled={actionLoading || !isLinked}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Terminar Todas as Sessões
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Utilizador
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar Utilizador?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação é irreversível. O utilizador será eliminado do Clerk e os seus dados serão anonimizados no sistema.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => {
                        executeAction('deleteUser');
                        router.push('/admin/dashboard/users');
                      }}
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="security">Segurança</TabsTrigger>
              <TabsTrigger value="sessions">Sessões</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              {/* Role Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Permissões
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Role do Utilizador</Label>
                      <Select
                        value={user.role}
                        onValueChange={(value) => executeAction('updateRole', { role: value })}
                        disabled={actionLoading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USER">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Utilizador
                            </div>
                          </SelectItem>
                          <SelectItem value="TRUSTED">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-green-600" />
                              Confiável
                            </div>
                          </SelectItem>
                          <SelectItem value="REVIEWER">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-amber-600" />
                              Revisor
                            </div>
                          </SelectItem>
                          <SelectItem value="ADMIN">
                            <div className="flex items-center gap-2">
                              <ShieldAlert className="h-4 w-4 text-purple-600" />
                              Administrador
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Informação de Contacto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Email Addresses */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Email Principal</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 px-3 py-2 bg-slate-100 rounded text-sm">
                        {user.email}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(user.email)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {user.emailVerified ? (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verificado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600">
                          <XCircle className="h-3 w-3 mr-1" />
                          Não verificado
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Additional Clerk Emails */}
                  {clerk?.emailAddresses && clerk.emailAddresses.length > 1 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Emails Adicionais</Label>
                      <div className="space-y-2 mt-1">
                        {clerk.emailAddresses
                          .filter((e: any) => e.email_address !== user.email)
                          .map((email: any) => (
                            <div key={email.id} className="flex items-center gap-2">
                              <code className="flex-1 px-3 py-2 bg-slate-50 rounded text-sm">
                                {email.email_address}
                              </code>
                              {email.verification?.status === 'verified' && (
                                <Badge variant="outline" className="text-green-600 text-xs">Verificado</Badge>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Phone Numbers */}
                  {clerk?.phoneNumbers && clerk.phoneNumbers.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Telefone</Label>
                      <div className="space-y-2 mt-1">
                        {clerk.phoneNumbers.map((phone: any) => (
                          <div key={phone.id} className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            <code className="flex-1 px-3 py-2 bg-slate-50 rounded text-sm">
                              {phone.phone_number}
                            </code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Connected Accounts */}
              {clerk?.externalAccounts && clerk.externalAccounts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LinkIcon className="h-5 w-5" />
                      Contas Ligadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {clerk.externalAccounts.map((account: any) => (
                        <div
                          key={account.id}
                          className="flex items-center gap-3 p-3 border rounded-lg"
                        >
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                            <Globe className="h-5 w-5 text-slate-500" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium capitalize">{account.provider}</p>
                            <p className="text-sm text-muted-foreground">{account.email_address}</p>
                          </div>
                          {account.verification?.status === 'verified' && (
                            <Badge variant="outline" className="text-green-600">Verificada</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Metadata */}
              {clerk?.publicMetadata && Object.keys(clerk.publicMetadata).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Metadata Pública
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="p-4 bg-slate-50 rounded-lg text-sm overflow-x-auto">
                      {JSON.stringify(clerk.publicMetadata, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Autenticação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center gap-3">
                        <Key className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Password</p>
                          <p className="text-sm text-muted-foreground">Login com email e password</p>
                        </div>
                      </div>
                      {clerk?.passwordEnabled ? (
                        <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                      ) : (
                        <Badge variant="outline">Não configurado</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Autenticação de 2 Fatores</p>
                          <p className="text-sm text-muted-foreground">Camada extra de segurança</p>
                        </div>
                      </div>
                      {clerk?.twoFactorEnabled ? (
                        <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                      ) : (
                        <Badge variant="outline">Desativado</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">TOTP (Authenticator App)</p>
                          <p className="text-sm text-muted-foreground">Google Authenticator, etc.</p>
                        </div>
                      </div>
                      {clerk?.totpEnabled ? (
                        <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                      ) : (
                        <Badge variant="outline">Não configurado</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Key className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Códigos de Backup</p>
                          <p className="text-sm text-muted-foreground">Códigos de recuperação</p>
                        </div>
                      </div>
                      {clerk?.backupCodeEnabled ? (
                        <Badge className="bg-green-100 text-green-700">Configurado</Badge>
                      ) : (
                        <Badge variant="outline">Não configurado</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldX className="h-5 w-5" />
                    Estado da Conta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b">
                      <div>
                        <p className="font-medium">Banido</p>
                        <p className="text-sm text-muted-foreground">Utilizador impedido de aceder</p>
                      </div>
                      {clerk?.banned ? (
                        <Badge variant="destructive">Sim</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600">Não</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">Bloqueado</p>
                        <p className="text-sm text-muted-foreground">Conta temporariamente bloqueada</p>
                      </div>
                      {clerk?.locked ? (
                        <Badge variant="destructive">Sim</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600">Não</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sessions Tab */}
            <TabsContent value="sessions" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Sessões Ativas ({sessions.length})
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => executeAction('revokeAllSessions')}
                    disabled={actionLoading || sessions.length === 0}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Terminar Todas
                  </Button>
                </CardHeader>
                <CardContent>
                  {sessions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma sessão ativa
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map((session: any) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={session.status === 'active' ? 'default' : 'secondary'}
                                className={session.status === 'active' ? 'bg-green-100 text-green-700' : ''}
                              >
                                {session.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground font-mono">
                                {session.id.substring(0, 12)}...
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Última atividade: {formatDate(session.lastActiveAt)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Expira: {formatDate(session.expireAt)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => executeAction('revokeSession', { sessionId: session.id })}
                            disabled={actionLoading}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Histórico de Moderação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {user.moderationHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma ação de moderação registada
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {user.moderationHistory.map((mod: any, idx: number) => (
                        <div key={idx} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {mod.type === 'BAN' && <Ban className="h-4 w-4 text-red-500" />}
                              {mod.type === 'WARNING' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                              {mod.type === 'SUSPENSION' && <Clock className="h-4 w-4 text-orange-500" />}
                              {mod.type === 'UNBAN' && <CheckCircle className="h-4 w-4 text-green-500" />}
                              <Badge variant="outline">{mod.type}</Badge>
                              <Badge
                                variant={mod.status === 'ACTIVE' ? 'default' : 'secondary'}
                                className={mod.status === 'BANNED' ? 'bg-red-100 text-red-700' : ''}
                              >
                                {mod.status}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(mod.moderatedAt)}
                            </span>
                          </div>
                          {mod.reason && (
                            <p className="text-sm">{mod.reason}</p>
                          )}
                          {mod.moderatorNote && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              Nota: {mod.moderatorNote}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
