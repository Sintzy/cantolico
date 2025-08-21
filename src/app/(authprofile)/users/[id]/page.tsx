import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, bio: true },
  });

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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      moderation: {
        include: {
          moderatedBy: {
            select: { name: true }
          }
        }
      },
      submissions: {
        select: {
          id: true,
          title: true,
          createdAt: true,
          status: true,
        },
      },
      _count: {
        select: {
          submissions: true,
        },
      },
    },
  });

  if (!user) return notFound();

  const formattedUser: ProfileViewProps['user'] = {
    ...user,
    submissions: user.submissions.map((submission: any) => ({
      ...submission,
      createdAt: submission.createdAt.toISOString(),
    })),
    createdAt: user.createdAt.toISOString(),
    moderation: user.moderation
      ? {
          id: user.moderation.id,
          status: user.moderation.status as string,
          type: user.moderation.type as string | null,
          reason: user.moderation.reason,
          moderatorNote: user.moderation.moderatorNote,
          moderatedAt: user.moderation.moderatedAt?.toISOString() || null,
          expiresAt: user.moderation.expiresAt?.toISOString() || null,
          moderatedBy: user.moderation.moderatedBy || undefined,
        }
      : undefined,
  };

  const isOwner = session?.user?.id === user.id;

  return <ProfileView user={formattedUser} isOwner={isOwner} />;
}