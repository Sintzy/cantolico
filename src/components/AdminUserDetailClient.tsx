'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AdminDeleteUserModal from './AdminDeleteUserModal';
import { toast } from 'sonner';
import { 
  Users, 
  Mail, 
  Calendar, 
  Music, 
  Star, 
  ListMusic, 
  Shield, 
  History, 
  Ban, 
  AlertTriangle,
  X,
  CheckCircle,
  Clock,
  Key,
  Activity
} from 'lucide-react';

export default function AdminUserDetailClient({ userId, initialUser }: { userId: string; initialUser: any }) {
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(initialUser.role || 'USER');
  const [moderationHistory, setModerationHistory] = useState<any[]>([]);
  const [logQuery, setLogQuery] = useState('');
  const [moderateDialogOpen, setModerateDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [moderateData, setModerateData] = useState<{ type: 'WARNING' | 'SUSPENSION' | 'BAN'; reason: string; moderatorNote?: string; duration?: number }>({
    type: 'WARNING',
    reason: '',
    moderatorNote: '',
  });

  useEffect(() => {
    fetchSummary();
  }, [userId]);

  async function fetchSummary() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/summary`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Summary API error:', res.status, errorText);
        throw new Error('Erro ao carregar resumo');
      }
      const data = await res.json();
      console.log('Summary data received:', data);
      setSummary(data);
      
      // fetch moderation history
      try {
        const mh = await fetch(`/api/admin/users/${userId}/moderation-history`);
        if (mh.ok) {
          const mhData = await mh.json();
          setModerationHistory(mhData.history || []);
        }
      } catch (err) {
        console.error('Erro ao carregar histórico de moderação', err);
      }
    } catch (err) {
      console.error('Fetch summary error:', err);
      toast.error('Erro ao carregar dados do utilizador');
    } finally { 
      setLoading(false); 
    }
  }

  async function handleSendReset() {
    try {
      const res = await fetch(`/api/admin/users/${userId}/send-reset`, { method: 'POST' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || 'Erro ao enviar email');
      }
      toast.success('Email de redefinição enviado');
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar email de redefinição';
      toast.error(errorMessage);
    }
  }

  async function handleRoleChange(newRole: string) {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!res.ok) throw new Error('Erro ao alterar role');
      setRole(newRole);
      toast.success('Role atualizada');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar role');
    }
  }

  async function handleModerateUser() {
    try {
      const response = await fetch(`/api/admin/users/${userId}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: moderateData.type,
          reason: moderateData.reason,
          moderatorNote: moderateData.moderatorNote,
          duration: moderateData.duration,
        }),
      });

      if (!response.ok) throw new Error('Erro ao aplicar moderação');

      toast.success('Moderação aplicada com sucesso');
      setModerateDialogOpen(false);
      setModerateData({ type: 'WARNING', reason: '', moderatorNote: '' });
      fetchSummary();
    } catch (error) {
      console.error('Erro ao moderar utilizador:', error);
      toast.error('Erro ao aplicar moderação');
    }
  }

  async function handleRemoveModeration() {
    try {
      const response = await fetch(`/api/admin/users/${userId}/moderate`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erro ao remover moderação');

      toast.success('Moderação removida com sucesso');
      fetchSummary();
    } catch (error) {
      console.error('Erro ao remover moderação:', error);
      toast.error('Erro ao remover moderação');
    }
  }

  const ROLE_COLORS = {
    USER: 'bg-blue-100 text-blue-800',
    TRUSTED: 'bg-green-100 text-green-800',
    REVIEWER: 'bg-orange-100 text-orange-800',
    ADMIN: 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header Card - Perfil do Utilizador */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-20 h-20 bg-linear-to-br from-blue-500 to-purple-600 rounded-full overflow-hidden flex items-center justify-center shrink-0">
              {initialUser.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={initialUser.image} alt={initialUser.name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-3xl font-semibold text-white">
                  {(initialUser.name || initialUser.email || '').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl">{initialUser.name}</CardTitle>
              <CardDescription className="flex flex-col gap-1 mt-1">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {initialUser.email}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  ID: <span className="font-mono">#{initialUser.id}</span>
                </span>
                {initialUser.createdAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Registado: {new Date(initialUser.createdAt).toLocaleDateString('pt-PT')}
                  </span>
                )}
              </CardDescription>
            </div>
            <Badge className={ROLE_COLORS[role as keyof typeof ROLE_COLORS]}>
              {role}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <Select value={role} onValueChange={(v) => handleRoleChange(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">USER</SelectItem>
                  <SelectItem value="TRUSTED">TRUSTED</SelectItem>
                  <SelectItem value="REVIEWER">REVIEWER</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleSendReset} 
              variant="outline" 
              className="h-9 mt-6"
              disabled={summary && summary.accounts && summary.accounts.length > 0}
              title={summary && summary.accounts && summary.accounts.length > 0 
                ? `Utilizador tem login via ${summary.accounts.map((a: any) => a.provider).join(', ')} - não possui senha` 
                : 'Enviar email de redefinição de senha'}
            >
              <Key className="h-4 w-4 mr-2" />
              Enviar Reset
            </Button>
            
            <Button variant="outline" onClick={() => window.location.href = `mailto:${initialUser.email}`} className="h-9 mt-6">
              <Mail className="h-4 w-4 mr-2" />
              Enviar Email
            </Button>
            
            <div className="mt-6">
              <AdminDeleteUserModal userId={userId} userName={initialUser.name} onSuccess={() => { /* navigate */ }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Moderação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Moderação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Dialog open={moderateDialogOpen} onOpenChange={setModerateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Ban className="h-4 w-4 mr-2" />
                  Moderar Utilizador
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Moderar Utilizador</DialogTitle>
                  <DialogDescription>
                    Aplicar moderação a {initialUser.name}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Tipo de Moderação</Label>
                    <Select 
                      value={moderateData.type} 
                      onValueChange={(value: 'WARNING' | 'SUSPENSION' | 'BAN') => {
                        console.log('Selected moderation type:', value);
                        setModerateData(prev => ({ ...prev, type: value }));
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent className="z-100">
                        <SelectItem value="WARNING">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <span>Advertência</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="SUSPENSION">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-orange-500" />
                            <span>Suspensão</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="BAN">
                          <div className="flex items-center gap-2">
                            <Ban className="h-4 w-4 text-red-500" />
                            <span>Banimento</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {moderateData.type === 'SUSPENSION' && (
                    <div className="space-y-2">
                      <Label>Duração (dias)</Label>
                      <Input
                        type="number"
                        value={moderateData.duration || ''}
                        onChange={(e) => setModerateData(prev => ({ 
                          ...prev, 
                          duration: parseInt(e.target.value) || undefined 
                        }))}
                        placeholder="Número de dias"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Motivo (visível ao utilizador)</Label>
                    <Textarea
                      value={moderateData.reason}
                      onChange={(e) => setModerateData(prev => ({ 
                        ...prev, 
                        reason: e.target.value 
                      }))}
                      placeholder="Descreva o motivo da moderação..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Nota interna (apenas para admins)</Label>
                    <Textarea
                      value={moderateData.moderatorNote || ''}
                      onChange={(e) => setModerateData(prev => ({ 
                        ...prev, 
                        moderatorNote: e.target.value 
                      }))}
                      placeholder="Nota interna sobre a moderação..."
                      rows={2}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setModerateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleModerateUser}
                    disabled={!moderateData.reason.trim()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Aplicar Moderação
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={() => handleRemoveModeration()}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Remover Moderação
            </Button>

            <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <History className="h-4 w-4 mr-2" />
                  Ver Histórico
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Histórico de Moderação</DialogTitle>
                  <DialogDescription>
                    Histórico completo de ações de moderação
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-3">
                  {moderationHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum histórico de moderação encontrado.
                    </p>
                  ) : (
                    moderationHistory.map((m, idx) => (
                      <div key={idx} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{m.type} - {m.status}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(m.moderatedAt).toLocaleDateString('pt-PT')}
                          </span>
                        </div>
                        {m.reason && (
                          <p className="text-sm text-muted-foreground">{m.reason}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {loading ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      ) : summary && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">Songs</div>
                </div>
                <div className="text-2xl font-bold mt-1">{summary.counts.songs}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ListMusic className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">Playlists</div>
                </div>
                <div className="text-2xl font-bold mt-1">{summary.counts.playlists}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">Stars</div>
                </div>
                <div className="text-2xl font-bold mt-1">{summary.counts.stars}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">Sessions</div>
                </div>
                <div className="text-2xl font-bold mt-1">{summary.counts.sessions}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">Logs</div>
                </div>
                <div className="text-2xl font-bold mt-1">{summary.counts.logs}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">Accounts</div>
                </div>
                <div className="text-2xl font-bold mt-1">{summary.counts.accounts}</div>
              </CardContent>
            </Card>
          </div>

          {/* Songs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Músicas ({summary.counts.songs})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary.songs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem músicas</p>
              ) : (
                <ul className="list-none pl-0 max-h-60 overflow-y-auto space-y-1">
                  {summary.songs.map((s: any) => (
                    <li key={s.id} className="text-sm">
                      <Link 
                        href={`/musics/${s.id}`}
                        className="text-blue-600 hover:underline hover:text-blue-800"
                      >
                        {s.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Playlists & Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListMusic className="h-5 w-5" />
                Playlists ({summary.counts.playlists})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary.playlists.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem playlists</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {summary.playlists.map((pl: any) => (
                    <Link 
                      key={pl.id} 
                      href={`/playlists/${pl.id}`}
                      className="block border rounded p-3 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium hover:underline">{pl.title}</div>
                        <Badge variant="secondary">{(pl.items || []).length} items</Badge>
                      </div>
                      {pl.items && pl.items.length > 0 && (
                        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-0.5">
                          {pl.items.map((it: any) => (
                            <li key={it.id}>{it.title || `Track ${it.trackId}`}</li>
                          ))}
                        </ul>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stars */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Favoritos ({summary.counts.stars})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary.stars.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem favoritos</p>
              ) : (
                <ul className="list-none pl-0 max-h-60 overflow-y-auto space-y-1">
                  {summary.stars.map((s: any) => (
                    <li key={s.id} className="text-sm">
                      <Link 
                        href={`/musics/${s.songId}`}
                        className="text-blue-600 hover:underline hover:text-blue-800"
                      >
                        {s.title || `Song ${s.songId}`}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Sessions Ativas ({summary.counts.sessions})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary.sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem sessões ativas</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {summary.sessions.map((sess: any) => (
                    <div key={sess.id} className="p-2 border rounded text-sm">
                      <div className="font-mono text-xs text-muted-foreground">#{sess.id}</div>
                      <div className="text-xs">Expira: {new Date(sess.expires).toLocaleString('pt-PT')}</div>
                      {sess.ip && <div className="text-xs text-muted-foreground">IP: {sess.ip}</div>}
                      {sess.userAgent && <div className="text-xs text-muted-foreground truncate">User-Agent: {sess.userAgent}</div>}
                      {sess.sessionToken && <div className="text-xs text-muted-foreground truncate">Token: {sess.sessionToken.substring(0, 20)}...</div>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Provedores ({summary.counts.accounts})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary.accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem contas de provedores externos</p>
              ) : (
                <div className="space-y-2">
                  {summary.accounts.map((acc: any) => (
                    <div key={acc.id} className="p-2 border rounded">
                      <div className="font-medium text-sm">{acc.provider}</div>
                      <div className="text-xs text-muted-foreground font-mono">{acc.providerAccountId}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Logs ({summary.counts.logs})
              </CardTitle>
              <CardDescription>
                <Input 
                  placeholder="Filtrar logs..." 
                  value={logQuery} 
                  onChange={(e) => setLogQuery(e.target.value)}
                  className="mt-2"
                />
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summary.logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem logs</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {summary.logs.map((l: any) => {
                    const searchText = `${l.message} ${l.level} ${(l.details && JSON.stringify(l.details)) || ''}`.toLowerCase();
                    if (logQuery && !searchText.includes(logQuery.toLowerCase())) return null;
                    
                    return (
                      <div key={l.id} className="p-3 border rounded">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant={l.level === 'ERROR' ? 'destructive' : 'secondary'}>
                            {l.level}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(l.created_at).toLocaleString('pt-PT')}
                          </span>
                        </div>
                        <p className="text-sm">{l.message}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
