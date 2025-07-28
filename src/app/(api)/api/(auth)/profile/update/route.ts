
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await req.json();
  const { name, bio, image } = data;

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name, bio, image },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erro ao atualizar perfil:", err);
    return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 });
  }
}
