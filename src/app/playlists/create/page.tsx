'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ListMusic, ArrowLeft, Globe, Lock, Plus, Music, EyeOff, Users, Mail, X } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getVisibilityLabel, getVisibilityFlags } from '@/types/playlist';

interface CreatePlaylistForm {
  name: string;
  description: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'NOT_LISTED';
  memberEmails: string[];
}

export default function CreatePlaylistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<CreatePlaylistForm>({
    name: '',
    description: '',
    visibility: 'PRIVATE',
    memberEmails: []
  });
  const [newMemberEmail, setNewMemberEmail] = useState('');

  // Verificar autenticação
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/login");
      return;
    }
  }, [session, status, router]);

  const handleAddMemberEmail = () => {
    const email = newMemberEmail.trim();
    if (!email) return;

    // Validação básica de email
    if (!email.includes('@') || !email.includes('.')) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    // Verificar se já existe
    if (form.memberEmails.includes(email)) {
      toast.error('Este email já foi adicionado');
      return;
    }

    // Verificar se não é o próprio email
    if (session?.user?.email === email) {
      toast.error('Não podes adicionar o teu próprio email');
      return;
    }

    setForm(prev => ({
      ...prev,
      memberEmails: [...prev.memberEmails, email]
    }));
    setNewMemberEmail('');
    toast.success('Email adicionado com sucesso');
  };

  const handleRemoveMemberEmail = (emailToRemove: string) => {
    setForm(prev => ({
      ...prev,
      memberEmails: prev.memberEmails.filter(email => email !== emailToRemove)
    }));
    toast.success('Email removido');
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'PUBLIC': return Globe;
      case 'PRIVATE': return Lock;
      case 'NOT_LISTED': return EyeOff;
      default: return Globe;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      toast.error('O nome da playlist é obrigatório');
      return;
    }

    if (form.name.trim().length < 3) {
      toast.error('O nome da playlist deve ter pelo menos 3 caracteres');
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
          description: form.description.trim() || undefined,
          visibility: form.visibility,
          memberEmails: form.memberEmails
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

  // Loading state
  if (status !== "authenticated") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-blue-400 shadow-lg flex items-center justify-center mx-auto animate-pulse">
            <ListMusic className="h-8 w-8 text-white" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-900">A carregar...</h3>
            <p className="text-gray-600">A verificar a tua autenticação</p>
          </div>
        </div>
      </div>
    );
  }

  // Não autenticado
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

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-b border-gray-100">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-gray-600 hover:text-gray-900 hover:bg-white/60"
              >
                <Link href="/playlists">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar às Playlists
                </Link>
              </Button>
            </div>
            
            <div className="flex items-center gap-6 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-blue-400 shadow-lg flex items-center justify-center">
                <Plus className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  Criar Nova Playlist
                </h1>
                <p className="text-xl text-gray-600">
                  Organiza as tuas músicas favoritas numa coleção personalizada
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-white/20">
                <Music className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Organização Musical</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-white/20">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Partilha Colaborativa</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-white/20">
                <Globe className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Controlo de Privacidade</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Informações Básicas */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <ListMusic className="h-5 w-5 text-blue-600" />
                  Informações da Playlist
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-900">
                    Nome da Playlist *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: As Minhas Favoritas de 2024"
                    className="h-12"
                    maxLength={100}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    {form.name.length}/100 caracteres
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-900">
                    Descrição (Opcional)
                  </Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreve a tua playlist..."
                    className="min-h-[100px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500">
                    {form.description.length}/500 caracteres
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Privacidade */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <Lock className="h-5 w-5 text-green-600" />
                  Definições de Privacidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-gray-900">
                    Quem pode ver esta playlist?
                  </Label>
                  
                  <div className="space-y-3">
                    {['PUBLIC', 'NOT_LISTED', 'PRIVATE'].map((visibility) => {
                      const Icon = getVisibilityIcon(visibility);
                      const isSelected = form.visibility === visibility;
                      
                      return (
                        <div
                          key={visibility}
                          onClick={() => setForm(prev => ({ ...prev, visibility: visibility as any }))}
                          className={cn(
                            "p-4 border-2 rounded-xl cursor-pointer transition-all",
                            isSelected
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              isSelected ? "bg-blue-100" : "bg-gray-100"
                            )}>
                              <Icon className={cn(
                                "h-5 w-5",
                                isSelected ? "text-blue-600" : "text-gray-600"
                              )} />
                            </div>
                            <div className="flex-1">
                              <h4 className={cn(
                                "font-medium",
                                isSelected ? "text-blue-900" : "text-gray-900"
                              )}>
                                {getVisibilityLabel(visibility as any)}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {visibility === 'PUBLIC' && 'Visível para todos os utilizadores'}
                                {visibility === 'NOT_LISTED' && 'Visível apenas com link direto'}
                                {visibility === 'PRIVATE' && 'Visível apenas para ti e membros convidados'}
                              </p>
                            </div>
                            <div className={cn(
                              "w-4 h-4 rounded-full border-2",
                              isSelected
                                ? "border-blue-500 bg-blue-500"
                                : "border-gray-300"
                            )}>
                              {isSelected && (
                                <div className="w-full h-full rounded-full bg-white scale-50"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Membros Colaboradores - só para playlists não públicas */}
            {(form.visibility === 'PRIVATE' || form.visibility === 'NOT_LISTED') && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    Membros Colaboradores
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    Convida pessoas para editarem esta playlist contigo
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Input
                        type="email"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="h-12"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddMemberEmail();
                          }
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleAddMemberEmail}
                      disabled={!newMemberEmail.trim()}
                      className="h-12 px-6"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>

                  {form.memberEmails.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-900">
                        Membros Convidados ({form.memberEmails.length})
                      </Label>
                      <div className="space-y-2">
                        {form.memberEmails.map((email, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                <Mail className="h-4 w-4 text-purple-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{email}</p>
                                <p className="text-xs text-gray-500">Editor · Pendente</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMemberEmail(email)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Botões de Ação */}
            <div className="flex gap-4 pt-6">
              <Button
                type="button"
                variant="outline"
                size="lg"
                asChild
                className="flex-1"
              >
                <Link href="/playlists">
                  Cancelar
                </Link>
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={isLoading || !form.name.trim()}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    A criar...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Playlist
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}