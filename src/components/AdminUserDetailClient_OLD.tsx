'use client';

import React, { useEffect, useState } from 'react';
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
  Key
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
      if (!res.ok) throw new Error('Erro ao carregar resumo');
      const data = await res.json();
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
      console.error(err);
      toast.error('Erro ao carregar dados do utilizador');
    } finally { setLoading(false); }
  }

  async function handleSendReset() {
    try {
      const res = await fetch(`/api/admin/users/${userId}/send-reset`, { method: 'POST' });
      if (!res.ok) throw new Error('Erro');
      toast.success('Email de redefinição enviado');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar email de redefinição');
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
      fetchSummary(); // Refresh data
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
      fetchSummary(); // Refresh data
    } catch (error) {
      console.error('Erro ao remover moderação:', error);
      toast.error('Erro ao remover moderação');
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1">
          <div className="p-6 border rounded-lg flex flex-col items-start gap-4">
            <div className="flex items-center gap-4 w-full">
              <div className="w-24 h-24 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center">
                {initialUser.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={initialUser.image} alt={initialUser.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-xl font-semibold text-gray-600">{(initialUser.name || initialUser.email || '').charAt(0)}</div>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold">{initialUser.name}</h2>
                <p className="text-sm text-gray-600">{initialUser.email}</p>
                <p className="text-xs text-gray-500 mt-1">ID: <span className="font-mono">#{initialUser.id}</span></p>
                {initialUser.createdAt && (
                  <p className="text-xs text-gray-500">Registado: {new Date(initialUser.createdAt).toLocaleDateString('pt-PT')}</p>
                )}
              </div>
            </div>

            <div className="w-full">
              <label className="text-sm">Role</label>
              <Select value={role} onValueChange={(v) => handleRoleChange(v)}>
                <SelectTrigger>
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

            <div className="w-full flex gap-2">
              <Button onClick={handleSendReset}>Enviar Reset</Button>
              <Button variant="outline" onClick={() => window.location.href = `mailto:${initialUser.email}`}>Enviar Email</Button>
              <AdminDeleteUserModal userId={userId} userName={initialUser.name} onSuccess={() => { /* navigate back or refresh */ }} />
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Resumo</h3>
            {loading && <p>Carregando...</p>}
            {summary && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-sm">Songs: <strong className="text-black">{summary.counts.songs}</strong></p>
                  <p className="text-sm">Playlists: <strong className="text-black">{summary.counts.playlists}</strong></p>
                  <p className="text-sm">Stars: <strong className="text-black">{summary.counts.stars}</strong></p>
                  <p className="text-sm">Sessions: <strong className="text-black">{summary.counts.sessions}</strong></p>
                  <p className="text-sm">Logs: <strong className="text-black">{summary.counts.logs}</strong></p>
                  <p className="text-sm">Accounts: <strong className="text-black">{summary.counts.accounts}</strong></p>
                </div>
                <div>
                  <h4 className="font-medium">Recent Songs</h4>
                  <ul className="list-disc pl-5 max-h-40 overflow-y-auto">
                    {summary.songs.map((s: any) => <li key={s.id}>{s.title}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Playlists & Items</h3>
            {summary?.playlists?.length === 0 && <p className="text-sm text-gray-500">Sem playlists</p>}
            <div className="space-y-3 mt-2">
              {summary?.playlists?.map((pl: any) => (
                <div key={pl.id} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{pl.title}</div>
                    <div className="text-sm text-gray-500">{(pl.items || []).length} items</div>
                  </div>
                  <ul className="mt-2 list-disc pl-5 max-h-32 overflow-y-auto text-sm">
                    {(pl.items || []).map((it: any) => (
                      <li key={it.id}>{it.title || `track ${it.trackId}`}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Stars (Favoritos)</h3>
            {summary?.stars?.length === 0 && <p className="text-sm text-gray-500">Sem favoritos</p>}
            <ul className="list-disc pl-5 max-h-40 overflow-y-auto mt-2">
              {summary?.stars?.map((s: any) => <li key={s.id}>{s.title || `music ${s.music_id}`}</li>)}
            </ul>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Sessions Ativas</h3>
            {summary?.sessions?.length === 0 && <p className="text-sm text-gray-500">Sem sessões ativas</p>}
            <div className="space-y-2 mt-2">
              {summary?.sessions?.map((sess: any) => (
                <div key={sess.id} className="p-2 border rounded">
                  <div className="text-sm font-medium">Session #{sess.id}</div>
                  <div className="text-xs text-gray-600">Expira: {new Date(sess.expires).toLocaleString()}</div>
                  {sess.ip && <div className="text-xs text-gray-500">IP: {sess.ip}</div>}
                  {sess.user_agent && <div className="text-xs text-gray-500 truncate">User Agent: {sess.user_agent}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Accounts (Provedores)</h3>
            {summary?.accounts?.length === 0 && <p className="text-sm text-gray-500">Sem contas de provedores externos</p>}
            <div className="space-y-2 mt-2">
              {summary?.accounts?.map((acc: any) => (
                <div key={acc.id} className="p-2 border rounded">
                  <div className="text-sm font-medium">{acc.provider}</div>
                  <div className="text-xs text-gray-600">ID: {acc.provider_account_id}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Logs recentes</h3>
            <div className="mt-2">
              <Input placeholder="Filtrar logs" value={logQuery} onChange={(e) => setLogQuery(e.target.value)} />
            </div>
            {summary?.logs?.length === 0 && <p className="text-sm text-gray-500">Sem logs</p>}
            <div className="space-y-2 mt-2">
              {summary?.logs?.map((l: any) => (
                logQuery && !(`${l.message} ${l.level} ${(l.details && JSON.stringify(l.details)) || ''}`.toLowerCase().includes(logQuery.toLowerCase())) ? null : (
                  <div key={l.id} className="p-2 border rounded">
                    <div className="text-sm text-gray-800 font-medium">{l.level}</div>
                    <div className="text-xs text-gray-600">{l.message}</div>
                    <div className="text-xs text-gray-500">{new Date(l.created_at).toLocaleString()}</div>
                  </div>
                )
              ))}
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Histórico de Moderação</h3>
            {moderationHistory.length === 0 ? (
              <p className="text-sm text-gray-500">Sem histórico de moderação</p>
            ) : (
              <div className="space-y-2 mt-2">
                {moderationHistory.map((m) => (
                  <div key={m.id} className="p-2 border rounded">
                    <div className="text-sm font-medium">{m.type} - {m.status}</div>
                    <div className="text-xs text-gray-600">{m.reason}</div>
                    <div className="text-xs text-gray-500">{new Date(m.moderatedAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
