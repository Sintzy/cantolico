import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase-client";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { PAGE_METADATA } from "@/lib/metadata";
import ProfileView from "./ProfileView";

// Inline the ProfileViewProps type definition
interface ProfileViewProps {
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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const userId = Number(id);
  
  if (isNaN(userId)) {
    return {
      title: "Utilizador não encontrado",
      description: "Este perfil de utilizador não existe.",
    };
  }

  const { data: user } = await supabase
    .from('User')
    .select('name, bio')
    .eq('id', userId)
    .single();

  if (!user) {
    return PAGE_METADATA.userProfile();
  }

  return PAGE_METADATA.userProfile(user.name || undefined, user.bio || undefined);
}

export type ProfilePageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const session = await getServerSession(authOptions);
  const { id } = await params;
  const userId = Number(id);
  if (isNaN(userId)) return notFound();

  // Buscar utilizador
  const { data: user, error: userError } = await supabase
    .from('User')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !user) return notFound();

  // Buscar dados de moderação separadamente
  const { data: userModeration } = await supabase
    .from('UserModeration')
    .select(`
      *,
      User!UserModeration_moderatedById_fkey (
        name
      )
    `)
    .eq('userId', userId)
    .single();

  // Buscar submissões
  const { data: submissions } = await supabase
    .from('SongSubmission')
    .select('id, title, createdAt, status')
    .eq('submitterId', userId)
    .order('createdAt', { ascending: false });

  // Contar submissões
  const { count: submissionsCount } = await supabase
    .from('SongSubmission')
    .select('*', { count: 'exact', head: true })
    .eq('submitterId', userId);

  const formattedUser: ProfileViewProps['user'] = {
    ...user,
    submissions: submissions || [],
    _count: {
      submissions: submissionsCount || 0
    },
    createdAt: user.createdAt,
    moderation: userModeration
      ? {
          id: userModeration.id,
          status: userModeration.status as string,
          type: userModeration.type as string | null,
          reason: userModeration.reason,
          moderatorNote: userModeration.moderatorNote,
          moderatedAt: userModeration.moderatedAt,
          expiresAt: userModeration.expiresAt,
          moderatedBy: userModeration.User || undefined,
        }
      : undefined,
  };

  const isOwner = session?.user?.id ? Number(session.user.id) === user.id : false;

  return <ProfileView user={formattedUser} isOwner={isOwner} />;
}