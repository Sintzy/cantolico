'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Globe, Lock, Plus, EyeOff, Users, Mail, X, Check, Music, ListMusic } from 'lucide-react';
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
            <h3 className="text-xl font-semibold text-gray-900"><span className="sr-only">A carregar...</span><span aria-hidden data-nosnippet>A carregar...</span></h3>
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
    <div className="min-h-screen bg-background">
      {/* Header simples */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-muted-foreground hover:text-foreground"
              >
                <Link href="/playlists">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Link>
              </Button>
            </div>
            
            <div>
              <h1 className="text-2xl font-semibold tracking-tight mb-2">
                Nova playlist
              </h1>
              <p className="text-muted-foreground">
                Organiza as tuas músicas favoritas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário minimalista */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Card único com todas as informações */}
            <Card>
              <CardContent className="p-6 space-y-6">
                
                {/* Nome da playlist */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nome da playlist
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="As minhas favoritas"
                    maxLength={100}
                    required
                  />
                </div>

                {/* Descrição */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Descrição <span className="text-muted-foreground">(opcional)</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Uma breve descrição da playlist..."
                    className="min-h-[80px] resize-none"
                    maxLength={500}
                  />
                </div>

                <Separator />

                {/* Privacidade simples */}
                <div className="space-y-4">
                  <Label>Privacidade</Label>
                  
                  <div className="grid gap-3">
                    {[
                      { value: 'PRIVATE', label: 'Privada', icon: Lock, desc: 'Só tu e convidados' },
                      { value: 'NOT_LISTED', label: 'Não listada', icon: EyeOff, desc: 'Visível com link' },
                      { value: 'PUBLIC', label: 'Pública', icon: Globe, desc: 'Visível para todos' }
                    ].map((option) => {
                      const Icon = option.icon;
                      const isSelected = form.visibility === option.value;
                      
                      return (
                        <div
                          key={option.value}
                          onClick={() => setForm(prev => ({ ...prev, visibility: option.value as any }))}
                          className={cn(
                            "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-accent"
                          )}
                        >
                          <Icon className={cn(
                            "h-4 w-4",
                            isSelected ? "text-primary" : "text-muted-foreground"
                          )} />
                          <div className="flex-1">
                            <div className={cn(
                              "font-medium text-sm",
                              isSelected ? "text-primary" : "text-foreground"
                            )}>
                              {option.label}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {option.desc}
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Membros colaboradores - layout compacto */}
                {form.visibility !== 'PUBLIC' && (
                  <>
                    <Separator />
                    
                    <div className="space-y-4">
                      <div>
                        <Label>Colaboradores <span className="text-muted-foreground">(opcional)</span></Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Adiciona pessoas que podem editar esta playlist
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Input
                          type="email"
                          value={newMemberEmail}
                          onChange={(e) => setNewMemberEmail(e.target.value)}
                          placeholder="email@exemplo.com"
                          className="text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddMemberEmail();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddMemberEmail}
                          disabled={!newMemberEmail.trim()}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {form.memberEmails.length > 0 && (
                        <div className="space-y-2">
                          {form.memberEmails.map((email, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between px-3 py-2 bg-accent rounded-md"
                            >
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{email}</span>
                                <Badge variant="secondary" className="text-xs">
                                  Pendente
                                </Badge>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMemberEmail(email)}
                                className="h-auto p-1 text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

              </CardContent>
            </Card>

            {/* Ações */}
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                asChild
              >
                <Link href="/playlists">
                  Cancelar
                </Link>
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !form.name.trim()}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    A criar...
                  </>
                ) : (
                  'Criar playlist'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}