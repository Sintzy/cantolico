import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || (user.role !== "REVIEWER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Sem permissões" }, { status: 403 });
  }

  const submissions = await prisma.songSubmission.findMany({
    where: { status: "PENDING" },
    include: {
      submitter: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });


  return NextResponse.json(submissions);
}