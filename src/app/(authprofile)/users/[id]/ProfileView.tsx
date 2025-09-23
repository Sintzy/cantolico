"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import imageCompression from "browser-image-compression";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, Music2, Mail, CalendarDays, Star, User, Camera, Clock, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DeleteAccountModal from "@/components/DeleteAccountModal";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MusicVersion {
  id: string;
  songId: string;
  versionNumber: number;
  sourceType: string;
  sourcePdfKey: string | null;
  sourceText: string | null;
  renderedHtml: string | null;
  keyOriginal: string | null;
  lyricsPlain: string | null;
  mediaUrl: string | null;
  youtubeLink: string | null;
  spotifyLink: string | null;
  createdAt: string;
  createdById: number;
}

interface Music {
  id: string;
  title: string;
  moments: string[];
  type: string;
  mainInstrument: string;
  tags: string[];
  currentVersionId: string;
  createdAt: string;
  updatedAt: string;
  versions: MusicVersion[];
}

export interface ProfileViewProps {
  user: {
    id: number;
    name: string | null;
    email: string;
    image: string | null;
    bio: string | null;
    role: string;
    createdAt: string;
    moderation?: {
      id: number;
      status: string;
      type: string | null;
      reason: string | null;
      moderatorNote: string | null;
      moderatedAt: string | null;
      expiresAt: string | null;
      moderatedBy?: {
        name: string | null;
      };
    } | null;
    submissions: {
      id: string;
      title: string;
      createdAt: string;
      status: string;
    }[];
    _count: {
      submissions: number;
    };
  };
  isOwner: boolean;
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "USER":
      return "Utilizador";
    case "TRUSTED":
      return "Contribuidor";
    case "REVIEWER":
      return "Revisor";
    case "ADMIN":
      return "Administrador";
    default:
      return "Desconhecido";
  }
}

function getRoleBadgeVariant(role: string): "default" | "secondary" | "destructive" | "outline" {
  switch (role) {
    case "ADMIN":
      return "destructive";
    case "REVIEWER":
      return "default";
    case "TRUSTED":
      return "secondary";
    default:
      return "outline";
  }
}

export default function ProfileView({ user, isOwner }: ProfileViewProps) {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [form, setForm] = useState({
    name: user.name ?? "",
    bio: user.bio ?? "",
    image: user.image ?? "",
  });
  const [musics, setMusics] = useState<Music[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchMusics = async () => {
      try {
        const res = await fetch("/api/musics/getmusics");
        const response = await res.json();
        
        // Verificar se a resposta tem a estrutura esperada
        const data: Music[] = Array.isArray(response.songs) ? response.songs : [];

        const filteredMusics = data.filter((music) =>
          music.versions.some((version) => version.createdById === user.id)
        );

        const formattedMusics = filteredMusics.map((music) => ({
          ...music,
          versions: music.versions.filter(
            (version) => version.createdById === user.id
          ),
        }));

        setMusics(formattedMusics);
      } catch (error) {
        console.error("Erro ao buscar músicas:", error);
        toast.error("Erro ao carregar músicas");
        setMusics([]); // Garantir que musics é sempre um array
      }
    };

    fetchMusics();
  }, [user.id]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await fetch("/api/user/profile/update", {
        method: "POST",
        body: JSON.stringify(form),
        headers: { "Content-Type": "application/json" },
      });
      
      if (res.ok) {
        toast.success("Perfil atualizado com sucesso!");
        window.location.reload();
        await getSession();
        setEditMode(false);
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Erro ao atualizar perfil");
      }
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      toast.error("Erro de conexão ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, seleciona apenas ficheiros de imagem");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("O ficheiro é muito grande. Máximo 5MB");
      return;
    }
    
    setLoading(true);

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 512,
        useWebWorker: true,
      });
      const filePath = `avatars/${user.id}-${Date.now()}.jpg`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(filePath, compressed, {
          upsert: true,
        });

      if (error) throw error;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      if (data?.publicUrl) {
        setForm({ ...form, image: data.publicUrl });
        toast.success("Imagem carregada com sucesso!");
      }
    } catch (err) {
      console.error("Erro ao enviar imagem:", err);
      toast.error("Erro ao carregar a imagem. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  };

  const badgeUrl = `/badges/${user.role.toLowerCase()}.png`;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <section className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="relative">
                <Avatar className="h-32 w-32">
                  <AvatarImage 
                    src={editMode ? form.image || "/default-profile.png" : user.image || "/default-profile.png"} 
                    alt={user.name || "Utilizador"} 
                  />
                  <AvatarFallback className="text-2xl">
                    {(user.name || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {editMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                    onClick={() => inputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2">
                  {editMode ? (
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="text-2xl font-bold border-0 p-0 h-auto bg-transparent focus-visible:ring-0"
                      />
                    </div>
                  ) : (
                    <h1 className="text-3xl font-bold text-gray-900">
                      {user.name || "Sem nome"}
                    </h1>
                  )}
                  
                  <div className="flex items-center gap-3 text-black">
                    <Badge
                      variant={getRoleBadgeVariant(user.role)}
                      className="text-black"
                    >
                      <Image
                        src={badgeUrl}
                        alt={getRoleLabel(user.role)}
                        width={16}
                        height={16}
                        className="mr-1"
                      />
                      {getRoleLabel(user.role)}
                    </Badge>
                    
                    {user.moderation && user.moderation.status !== 'ACTIVE' && (
                      <Badge className="text-black" variant="destructive">
                        {user.moderation.status === 'BANNED' ? 'Banido' 
                         : user.moderation.status === 'SUSPENDED' ? 'Suspenso'
                         : 'Advertido'}
                      </Badge>
                    )}
                  </div>
                </div>

                {isOwner && (
                  <div className="flex gap-2">
                    {editMode ? (
                      <>
                        <Button variant="outline" onClick={() => setEditMode(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={loading}>
                          {loading ? "A guardar..." : "Guardar"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button onClick={() => setEditMode(true)} variant="outline">
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar perfil
                        </Button>
                        <Button 
                          onClick={() => setShowDeleteModal(true)} 
                          variant="destructive"
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar conta
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* User Stats */}
              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  <span>Membro desde {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  <span>{user._count.submissions} submissões</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-8">
        <div className="max-w-6xl mx-auto px-6 space-y-8">
          {/* Biography */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Biografia
              </CardTitle>
              <CardDescription>
                Informações pessoais do utilizador
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editMode ? (
                <div className="space-y-2">
                  <Label htmlFor="bio">Sobre mim</Label>
                  <Textarea
                    id="bio"
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    rows={4}
                    placeholder="Conta-nos um pouco sobre ti..."
                  />
                </div>
              ) : (
                <p className="text-muted-foreground whitespace-pre-line">
                  {user.bio || "Este utilizador ainda não adicionou uma biografia."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Music Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Submissões
                </CardTitle>
                <Upload className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{user._count.submissions}</div>
                <p className="text-xs text-muted-foreground">
                  Músicas enviadas para o sistema
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Músicas Aprovadas
                </CardTitle>
                <Music2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{musics.length}</div>
                <p className="text-xs text-muted-foreground">
                  Músicas disponíveis publicamente
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Membro há
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Dias na plataforma
                </p>
              </CardContent>
            </Card>
          </div>

          {/* User's Music */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music2 className="h-5 w-5" />
                Músicas Criadas ({musics.length})
              </CardTitle>
              <CardDescription>
                Cânticos submetidos e aprovados por este utilizador
              </CardDescription>
            </CardHeader>
            <CardContent>
              {musics.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {musics.map((music) => (
                    <Link key={music.id} href={`/musics/${music.id}`}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base line-clamp-1">
                            {music.title}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {music.mainInstrument} • {music.type}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {new Date(music.createdAt).toLocaleDateString()}
                            </span>
                            <div className="flex gap-1">
                              {music.tags.slice(0, 2).map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {music.tags.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{music.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Music2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    Nenhuma música encontrada
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Este utilizador ainda não tem músicas aprovadas.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        isAdminAction={false}
      />
    </main>
  );
}