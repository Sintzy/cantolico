import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProfileView from "./ProfileView";
import { Metadata } from "next";

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
    return {
      title: "Utilizador não encontrado",
      description: "Este perfil de utilizador não existe.",
    };
  }

  return {
    title: `${user.name || "Utilizador"}`,
    description: user.bio || `Perfil de ${user.name || "utilizador"} no Can♱ólico! - Cancioneiro católico colaborativo.`,
  };
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

  const formattedUser = {
    ...user,
    submissions: user.submissions.map((submission) => ({
      ...submission,
      createdAt: submission.createdAt.toISOString(),
    })),
    createdAt: user.createdAt.toISOString(), 
  };

  const isOwner = session?.user?.id === user.id;

  return <ProfileView user={formattedUser} isOwner={isOwner} />;
}