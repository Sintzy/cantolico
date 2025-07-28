import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProfileView from "./ProfileView";

export type ProfilePageProps = {
  params: { id: string };
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const session = await getServerSession(authOptions);
  const userId = Number(params.id);
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