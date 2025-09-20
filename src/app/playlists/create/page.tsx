'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ListMusic, ArrowLeft, Globe, Lock, Plus, Music } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface CreatePlaylistForm {
  name: string;
  description: string;
  isPublic: boolean;
}

export default function CreatePlaylistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingModeration, setIsCheckingModeration] = useState(true);
  const [form, setForm] = useState<CreatePlaylistForm>({
    name: '',
    description: '',
    isPublic: false
  });

  // Verificar status de moderação no carregamento
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/login");
      return;
    }

    // Verificar se o utilizador pode criar playlists
    fetch("/api/user/moderation-status")
      .then(res => res.json())
      .then(data => {
        if (data.status === "BANNED") {
          router.push("/banned");
          return;
        }
        
        if (data.status === "SUSPENDED") {
          toast.error("A tua conta está suspensa. Não podes criar playlists.", {
            description: data.reason ? `Motivo: ${data.reason}` : undefined
          });
          router.push("/");
          return;
        }
        
        setIsCheckingModeration(false);
      })
      .catch(() => {
        setIsCheckingModeration(false);
      });
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user?.id) {
      toast.error('Precisas de estar autenticado para criares playlists');
      router.push('/login');
      return;
    }

    if (!form.name.trim()) {
      toast.error('Por favor, insere o nome da playlist');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          isPublic: form.isPublic
        }),
      });

      if (response.ok) {
        const newPlaylist = await response.json();
        toast.success('Playlist criada com sucesso!');
        router.push(`/playlists/${newPlaylist.id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao criar playlist');
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error('Erro de conexão ao criar playlist');
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect se não estiver autenticado
  if (!session) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-blue-400 shadow-lg flex items-center justify-center mb-6">
              <ListMusic className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-center text-gray-900">Autenticação Necessária</h3>
            <p className="text-gray-700 text-center mb-6 leading-relaxed">
              Para criares e personalizares as tuas próprias playlists, precisas de estar autenticado na tua conta.
            </p>
            <Button asChild size="lg" className="bg-gradient-to-t from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600">
              <Link href="/login">
                <Plus className="h-4 w-4 mr-2" />
                Fazer Login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state enquanto verifica moderação
  if (isCheckingModeration) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-blue-500 to-blue-400 shadow-lg flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Verificando Permissões</h3>
            <p className="text-gray-700">Aguarde um momento...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section com estilo da landing page */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-10">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/2 top-0 -translate-x-1/2">
            <div className="h-60 w-60 rounded-full bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-[80px]" />
          </div>
        </div>
        
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="pb-8 pt-12 md:pb-12 md:pt-16 relative z-10">
            {/* Navigation */}
            <div className="mb-8">
              <Button variant="outline" size="sm" asChild>
                <Link href="/playlists">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar às Playlists
                </Link>
              </Button>
            </div>

            {/* Header seguindo o padrão das outras páginas */}
            <div className="text-center lg:text-left">
              <div className="mb-4 border-y [border-image:linear-gradient(to_right,transparent,theme(colors.slate.300/.8),transparent)1]">
                <div className="-mx-0.5 flex justify-center lg:justify-start -space-x-2 py-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <ListMusic className="text-white text-xs w-3 h-3" />
                  </div>
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Plus className="text-white text-xs w-3 h-3" />
                  </div>
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 border-y [border-image:linear-gradient(to_right,transparent,theme(colors.slate.300/.8),transparent)1] leading-tight">
                Nova Playlist
              </h1>
              <p className="text-lg text-gray-700 max-w-2xl">
                Cria uma coleção personalizada das tuas músicas favoritas
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Form */}
          <Card className="max-w-2xl mx-auto border-0 shadow-lg">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nome da Playlist */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-900">
                    Nome da Playlist *
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Minhas Músicas Favoritas"
                    required
                    className="h-11"
                  />
                  <p className="text-xs text-gray-500">
                    Escolha um nome descritivo para facilitar a organização
                  </p>
                </div>

                {/* Descrição */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-900">
                    Descrição (opcional)
                  </Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Descreva o tipo de músicas que esta playlist contém..."
                    className="min-h-24 resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    Uma descrição ajuda-te a ti e a outros a entenderem o propósito da playlist
                  </p>
                </div>

                <Separator />

                {/* Configurações de Privacidade */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-gray-900">Configurações de Privacidade</Label>

                  <div className="border border-gray-200 rounded-lg p-6 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {form.isPublic ? (
                          <Globe className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Lock className="h-5 w-5 text-gray-600" />
                        )}
                        <div>
                          <Label htmlFor="isPublic" className="font-medium cursor-pointer text-gray-900">
                            {form.isPublic ? 'Playlist Pública' : 'Playlist Privada'}
                          </Label>
                          <p className="text-sm text-gray-600 mt-1">
                            {form.isPublic
                              ? 'Outros utilizadores podem descobrir e visualizar a tua playlist'
                              : 'Apenas tu podes ver e aceder a esta playlist'
                            }
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={form.isPublic ? "secondary" : "outline"} className="text-xs">
                              {form.isPublic ? (
                                <>
                                  <Globe className="h-3 w-3 mr-1" />
                                  Visível para todos
                                </>
                              ) : (
                                <>
                                  <Lock className="h-3 w-3 mr-1" />
                                  Apenas para você
                                </>
                              )}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Switch
                        id="isPublic"
                        checked={form.isPublic}
                        onCheckedChange={(checked) => setForm({ ...form, isPublic: checked })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Botões de Ação */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    onClick={() => router.back()}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>

                  <Button
                    type="submit"
                    disabled={!form.name.trim() || isLoading}
                    size="lg"
                    className="flex-1"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Criar Playlist
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
