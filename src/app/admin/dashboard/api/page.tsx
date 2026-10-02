'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, CheckCircle2, Copy, KeyRound, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/hooks/useClerkSession';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/shadcn-io/spinner';

type PartnerApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—';

export default function PartnerApiKeysPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [keys, setKeys] = useState<PartnerApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [rateLimit, setRateLimit] = useState('120');
  const [expiresAt, setExpiresAt] = useState('');

  const loadKeys = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const response = await fetch('/api/admin/partner-api-keys');
      if (!response.ok) throw new Error('Não foi possível carregar as credenciais.');
      const payload = await response.json();
      setKeys(payload.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar as credenciais.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'ADMIN') {
      router.replace('/login');
      return;
    }
    void loadKeys();
  }, [loadKeys, router, session, status]);

  const createKey = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    try {
      const response = await fetch('/api/admin/partner-api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          rateLimit: Number(rateLimit),
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível criar a credencial.');

      setKeys(current => [payload.data, ...current]);
      setShowCreate(false);
      setName('');
      setRateLimit('120');
      setExpiresAt('');
      setNewKey(payload.key);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar a credencial.');
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (apiKey: PartnerApiKey) => {
    if (!confirm(`Revogar a credencial “${apiKey.name}”? Esta integração deixa de conseguir aceder imediatamente.`)) return;
    try {
      const response = await fetch(`/api/admin/partner-api-keys/${apiKey.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Não foi possível revogar a credencial.');
      setKeys(current => current.map(item => item.id === apiKey.id ? { ...item, isActive: false } : item));
      toast.success('Credencial revogada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível revogar a credencial.');
    }
  };

  const copy = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      toast.error('Não foi possível copiar automaticamente.');
    }
  };

  if (status === 'loading' || loading) {
    return <div className="flex min-h-screen items-center justify-center"><Spinner variant="circle" size={32} /></div>;
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Credenciais da API</h1>
          <p className="mt-1 text-muted-foreground">Dá a cada integração acesso de leitura ao catálogo de cânticos.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadKeys(true)} disabled={refreshing}>
            {refreshing ? <Spinner variant="circle" size={16} className="mr-2" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Atualizar
          </Button>
          <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" />Nova credencial</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />Como o cliente usa a API</CardTitle>
          <CardDescription>Usa a chave no header <code>Authorization: Bearer &lt;api_key&gt;</code> ou <code>X-API-Key</code>.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p><code>GET /api/v1/songs?q=gloria&amp;moment=GLORIA&amp;page=1&amp;per_page=25</code></p>
          <p><code>GET /api/v1/songs/&#123;id-ou-slug&#125;</code></p>
          <p><code>GET /api/v1/liturgical-suggestions?date=YYYY-MM-DD</code></p>
          <p>A credencial só permite <strong className="font-medium text-foreground">songs:read</strong>; podes revogá-la aqui a qualquer momento.</p>
          <a href="/developers" className="inline-flex pt-2 font-medium text-rose-700 hover:underline">Abrir documentação para parceiros →</a>
        </CardContent>
      </Card>

      {keys.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Ainda não existem credenciais de API.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {keys.map(apiKey => (
            <Card key={apiKey.id} className={!apiKey.isActive ? 'opacity-65' : ''}>
              <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{apiKey.name}</p>
                    <Badge variant={apiKey.isActive ? 'default' : 'secondary'}>{apiKey.isActive ? 'Ativa' : 'Revogada'}</Badge>
                    <Badge variant="outline">songs:read</Badge>
                  </div>
                  <div className="grid gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2">
                    <span>Prefixo: <code>{apiKey.keyPrefix}…</code></span>
                    <span>{apiKey.rateLimit} pedidos/minuto</span>
                    <span>Último uso: {formatDate(apiKey.lastUsedAt)}</span>
                    <span>Expira: {formatDate(apiKey.expiresAt)}</span>
                  </div>
                </div>
                {apiKey.isActive && <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => void revokeKey(apiKey)}><Ban className="mr-2 h-4 w-4" />Revogar</Button>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova credencial</DialogTitle>
            <DialogDescription>A chave será apresentada apenas uma vez, depois de criada.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={createKey}>
            <div className="space-y-2"><Label htmlFor="client-name">Cliente / integração</Label><Input id="client-name" required minLength={2} maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Paróquia de São João" /></div>
            <div className="space-y-2"><Label htmlFor="rate-limit">Limite por minuto</Label><Input id="rate-limit" required type="number" min="1" max="10000" value={rateLimit} onChange={event => setRateLimit(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="expires-at">Expira em (opcional)</Label><Input id="expires-at" type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>Cancelar</Button><Button type="submit" disabled={creating}>{creating && <Spinner variant="circle" size={16} className="mr-2" />}Criar chave</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(newKey)} onOpenChange={open => !open && setNewKey(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-600" />Credencial criada</DialogTitle><DialogDescription>Copia e entrega esta chave ao cliente agora. Por segurança, não a poderás voltar a ver.</DialogDescription></DialogHeader>
          <div className="flex gap-2"><Input readOnly value={newKey || ''} className="font-mono text-xs" /><Button type="button" variant="outline" onClick={() => newKey && void copy(newKey, 'Chave copiada.')}><Copy className="h-4 w-4" /><span className="sr-only">Copiar chave</span></Button></div>
          <DialogFooter><Button onClick={() => setNewKey(null)}>Concluído</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
