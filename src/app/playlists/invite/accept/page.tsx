'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Music, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<'loading' | 'success' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string>('');
  const [playlistId, setPlaylistId] = useState<string>('');
  const [inviteDetails, setInviteDetails] = useState<any>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!token) {
      setInviteStatus('error');
      setError('Token de convite inválido');
      return;
    }

    if (!session) {
      // Utilizador não está logado, redirecionar para login
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.href)}`);
      return;
    }

    // Buscar detalhes do convite
    fetchInviteDetails();
  }, [session, status, token, router]);

  const fetchInviteDetails = async () => {
    if (!token) return;

    try {
      const response = await fetch(`/api/playlists/invite/details?token=${token}`);
      const data = await response.json();

      if (response.ok) {
        setInviteDetails(data);
        setInviteStatus('ready');
      } else {
        setInviteStatus('error');
        setError(data.error || 'Erro ao carregar detalhes do convite');
      }
    } catch (error) {
      console.error('Error fetching invite details:', error);
      setInviteStatus('error');
      setError('Erro ao carregar convite');
    }
  };

  const handleAcceptInvite = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/playlists/invite/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setInviteStatus('success');
        setPlaylistId(data.playlistId);
        toast.success('Convite aceito com sucesso!');
      } else {
        setInviteStatus('error');
        setError(data.error || 'Erro ao aceitar convite');
        toast.error(data.error || 'Erro ao aceitar convite');
      }
    } catch (error) {
      console.error('Error accepting invite:', error);
      setInviteStatus('error');
      setError('Erro de conexão');
      toast.error('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || inviteStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">A processar convite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inviteStatus === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl text-gray-900">Erro no Convite</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              {error || 'Não foi possível processar o teu convite'}
            </p>
            <div className="flex gap-3">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/playlists">
                  Minhas Playlists
                </Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href="/musics">
                  Explorar Músicas
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inviteStatus === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-xl text-gray-900">Convite Aceito!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Parabéns! Agora és editor desta playlist e podes começar a adicionar músicas.
            </p>
            <div className="flex gap-3">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/playlists">
                  Ver Todas
                </Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href={`/playlists/${playlistId}`}>
                  Abrir Playlist
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Music className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl text-gray-900">Convite para Playlist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Playlist Information */}
          {inviteDetails && (
            <div className="text-center space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg border">
                <h3 className="font-semibold text-lg text-foreground mb-2">
                  {inviteDetails.playlist?.name}
                </h3>
                {inviteDetails.playlist?.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {inviteDetails.playlist.description}
                  </p>
                )}
                
                {/* Invited by information */}
                <div className="flex items-center justify-center gap-3 py-3 px-4 bg-background rounded-lg border">
                  <img
                    src={inviteDetails.invitedBy?.image || '/default-profile.png'}
                    alt={inviteDetails.invitedBy?.name || 'User'}
                    className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/default-profile.png';
                    }}
                  />
                  <div className="text-left">
                    <p className="font-medium text-sm">
                      {inviteDetails.invitedBy?.name || 'Utilizador'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      convidou-te para colaborar
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-medium">Como editor poderás:</p>
                <ul className="text-left space-y-1 text-xs">
                  <li>• Adicionar músicas à playlist</li>
                  <li>• Remover músicas existentes</li>
                  <li>• Reorganizar a ordem das músicas</li>
                  <li>• Colaborar com outros editores</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              asChild
            >
              <Link href="/playlists">
                Cancelar
              </Link>
            </Button>
            <Button 
              className="flex-1"
              onClick={handleAcceptInvite}
              disabled={isLoading}
            >
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

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600"><span className="sr-only">A carregar...</span><span aria-hidden data-nosnippet>A carregar...</span></p>
          </CardContent>
        </Card>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}