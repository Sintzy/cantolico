'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ListMusic, ArrowLeft, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface CreatePlaylistForm {
  name: string;
  description: string;
  isPublic: boolean;
}

export default function CreatePlaylistPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<CreatePlaylistForm>({
    name: '',
    description: '',
    isPublic: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user?.id) {
      toast.error('Precisas de estar autenticado para criar playlists');
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
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListMusic className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Autenticação necessária</h3>
            <p className="text-muted-foreground text-center mb-6">
              Precisas de estar autenticado para criar playlists.
            </p>
            <Button asChild>
              <Link href="/login">Fazer Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section com estilo da landing page */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/2 top-0 -translate-x-1/2">
            <div className="h-60 w-60 rounded-full bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-[80px]" />
          </div>
        </div>
        
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="pb-8 pt-12 md:pb-12 md:pt-16 relative z-10">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/playlists">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar às Playlists
                  </Link>
                </Button>
              </div>
              
              <div className="text-center lg:text-left">
                <div className="mb-4 border-y [border-image:linear-gradient(to_right,transparent,theme(colors.slate.300/.8),transparent)1]">
                  <div className="-mx-0.5 flex justify-center lg:justify-start -space-x-2 py-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <ListMusic className="text-white text-xs w-3 h-3" />
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
        </div>
      </section>
      
      {/* Main Content */}
      <section className="bg-gray-50 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Form */}
          <Card className="max-w-2xl mx-auto border-0 shadow-lg backdrop-blur-sm bg-white/95">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Playlist *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Minhas Músicas Favoritas"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descreve a tua playlist..."
                rows={4}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-4">
              <Label>Visibilidade</Label>
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="isPublic"
                  checked={form.isPublic}
                  onCheckedChange={(checked: boolean) => setForm({ ...form, isPublic: !!checked })}
                  disabled={isLoading}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label 
                    htmlFor="isPublic"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                  >
                    {form.isPublic ? (
                      <>
                        <Globe className="h-4 w-4 text-green-600" />
                        Playlist Pública
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 text-gray-600" />
                        Playlist Privada
                      </>
                    )}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {form.isPublic 
                      ? 'Qualquer pessoa com o link pode ver esta playlist'
                      : 'Apenas tu podes ver e gerir esta playlist'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
                className="flex-1"
              >
                Cancelar
              </Button>
                  <Button
                    type="submit"
                    disabled={!form.name.trim() || isLoading}
                    className="flex-1"
                  >
                    {isLoading ? 'Criando...' : 'Criar Playlist'}
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
