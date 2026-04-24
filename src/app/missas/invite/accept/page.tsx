'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useClerkSession';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Church, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

function AcceptMassInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [pageStatus, setPageStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const [massId, setMassId] = useState('');
  const [inviteDetails, setInviteDetails] = useState<any>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (status === 'loading') return;
    if (!token) {
      setPageStatus('error');
      setError('Token de convite inválido');
      return;
    }
    if (!session) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`);
      return;
    }
    fetchDetails();
  }, [session, status, token]);

  const fetchDetails = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/masses/invite/details?token=${token}`);
      const data = await res.json();
      if (res.ok) {
        setInviteDetails(data);
        setPageStatus('ready');
      } else {
        setPageStatus('error');
        setError(data.error || 'Erro ao carregar convite');
      }
    } catch {
      setPageStatus('error');
      setError('Erro ao carregar convite');
    }
  };

  const handleAccept = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/masses/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok) {
        setMassId(data.massId);
        setPageStatus('success');
        toast.success('Convite aceito com sucesso!');
      } else {
        setPageStatus('error');
        setError(data.error || 'Erro ao aceitar convite');
        toast.error(data.error || 'Erro ao aceitar convite');
      }
    } catch {
      setPageStatus('error');
      setError('Erro de conexão');
      toast.error('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || pageStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">A carregar convite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Erro no Convite</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error || 'Não foi possível processar o convite'}</p>
            <Button asChild className="w-full">
              <Link href="/missas">Ver as Minhas Missas</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Convite Aceito!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Agora és editor desta missa e podes colaborar na sua preparação.
            </p>
            <div className="flex gap-3">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/missas">Ver Todas</Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href={`/missas/${massId}`}>Abrir Missa</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const mass = inviteDetails?.mass;
  const invitedBy = inviteDetails?.invitedBy;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Church className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Convite para Missa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {mass && (
            <div className="text-center space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg border">
                <h3 className="font-semibold text-lg mb-1">{mass.name}</h3>
                {mass.celebration && (
                  <p className="text-sm text-muted-foreground mb-2">{mass.celebration}</p>
                )}
                {mass.date && (
                  <p className="text-sm text-muted-foreground">
                    {new Date(mass.date).toLocaleDateString('pt-PT', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                )}
                {mass.parish && (
                  <p className="text-sm text-muted-foreground">{mass.parish}</p>
                )}

                {invitedBy && (
                  <div className="flex items-center justify-center gap-3 mt-3 py-3 px-4 bg-background rounded-lg border">
                    {invitedBy.image ? (
                      <img
                        src={invitedBy.image}
                        alt={invitedBy.name || 'Utilizador'}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/default-profile.png'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {(invitedBy.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="text-left">
                      <p className="font-medium text-sm">{invitedBy.name || 'Utilizador'}</p>
                      <p className="text-xs text-muted-foreground">convidou-te para colaborar</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-medium">Como editor poderás:</p>
                <ul className="text-left space-y-1 text-xs">
                  <li>• Adicionar músicas a cada momento litúrgico</li>
                  <li>• Remover e reorganizar músicas</li>
                  <li>• Exportar em PDF ou apresentação</li>
                  <li>• Colaborar com outros editores</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" asChild>
              <Link href="/missas">Cancelar</Link>
            </Button>
            <Button className="flex-1" onClick={handleAccept} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  A aceitar...
                </>
              ) : (
                'Aceitar Convite'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptMassInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">A carregar...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <AcceptMassInviteContent />
    </Suspense>
  );
}
