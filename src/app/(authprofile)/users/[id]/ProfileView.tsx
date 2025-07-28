"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import imageCompression from "browser-image-compression";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Music2, Mail, CalendarDays, Star, User } from "lucide-react";
import { toast } from "sonner";

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

interface ProfileViewProps {
  user: {
    id: number;
    name: string | null;
    email: string;
    image: string | null;
    bio: string | null;
    role: string;
    createdAt: string;
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
      return "Usuário";
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

export default function ProfileView({ user, isOwner }: ProfileViewProps) {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
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
        const data: Music[] = await res.json();

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
      }
    };

    fetchMusics();
  }, [user.id]);

  const handleSave = async () => {
    setLoading(true);
    const res = await fetch("/api/profile/update", {
      method: "POST",
      body: JSON.stringify(form),
      headers: { "Content-Type": "application/json" },
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Perfil atualizado com sucesso!");
      window.location.reload();
      await getSession();
      setEditMode(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      }
    } catch (err) {
      console.error("Erro ao enviar imagem:", err);
    } finally {
      setLoading(false);
    }
  };

  const badgeUrl = `/badges/${user.role.toLowerCase()}.png`;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-10">
      {/* Avatar and Profile Info */}
      <div className="flex flex-col md:flex-row items-start gap-8">
        <div className="relative w-32 h-32 rounded-full overflow-hidden border border-gray-300 dark:border-neutral-700 group cursor-pointer">
          <Image
            src={form.image || "/default-profile.png"}
            alt="Avatar"
            fill
            className="object-cover"
            onClick={() => {
              if (editMode) inputRef.current?.click();
            }}
          />
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
          {editMode && (
            <div className="absolute bottom-0 w-full text-center bg-black/50 text-white text-xs py-1">
              Alterar foto
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            {editMode ? (
              <input
                className="text-3xl font-bold bg-transparent border-b border-gray-300 dark:border-neutral-600 focus:outline-none w-full"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            ) : (
              <h1 className="text-3xl font-bold">{user.name || "Sem nome"}</h1>
            )}
            <Image
              src={badgeUrl}
              alt={getRoleLabel(user.role)}
              width={32}
              height={32}
              className="h-7 w-7"
              title={getRoleLabel(user.role)}
            />
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Mail className="w-4 h-4" /> {user.email}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <CalendarDays className="w-4 h-4" /> Membro desde:{" "}
            {new Date(user.createdAt).toLocaleDateString()}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Star className="w-4 h-4" /> Submissões: {user._count.submissions}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <User className="w-4 h-4"/>Cargo: {getRoleLabel(user.role)}
          </p>
        </div>
      </div>

      {/* Biography Section */}
      <div>
        <h3 className="text-xl font-semibold border-b border-sky-500 pb-1">
          Biografia
        </h3>
        {editMode ? (
          <textarea
            className="mt-2 w-full p-3 rounded-md border border-gray-300 dark:border-neutral-600 bg-transparent"
            value={form.bio}
            rows={3}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        ) : (
          <p className="text-gray-800 dark:text-gray-300 mt-2 whitespace-pre-line">
            {user.bio || "Sem descrição"}
          </p>
        )}
      </div>

      {/* Musics Section */}
      <div>
        <h3 className="text-xl font-semibold border-b border-sky-500 pb-1">
          Músicas Criadas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {musics.length > 0 ? (
            musics.map((music) => (
              <Link
              key={music.id}
              href={`/musics/${music.id}`}
              className="p-4 border rounded-lg shadow-md bg-white dark:bg-neutral-900 space-y-2 hover:shadow-lg transition-shadow"
              >
              <div className="flex items-center gap-2">
                <Music2 className="w-5 h-5 text-black" />
                <h4 className="text-lg font-semibold truncate">
                {music.title}
                </h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Criada em: {new Date(music.createdAt).toLocaleDateString()}
              </p>
              <p className="text-sm text-muted-foreground">
                Instrumento principal: {music.mainInstrument}
              </p>
              <p className="text-sm text-muted-foreground">
                Tags: {music.tags.join(", ")}
              </p>
              </Link>
            ))
            ) : (
            <p className="text-gray-500 dark:text-gray-400">
              Sem músicas criadas.
            </p>
            )}
        </div>
      </div>

      {/* Edit Profile Buttons */}
      {isOwner && (
        <div className="pt-6 flex justify-end gap-2">
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => setEditMode(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? "Salvando..." : "Salvar perfil"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditMode(true)}>
              <Pencil className="w-4 h-4 mr-1" /> Editar perfil
            </Button>
          )}
        </div>
      )}
    </div>
  );
}