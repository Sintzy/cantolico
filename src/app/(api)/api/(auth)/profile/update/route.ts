
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { logGeneral, logErrors } from "@/lib/logs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      await logGeneral('WARN', 'Tentativa de atualização de perfil sem autenticação', 'Utilizador não autenticado tentou atualizar perfil', {
        action: 'profile_update_unauthorized'
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const { name, bio, image } = data;

    await logGeneral('INFO', 'Atualização de perfil iniciada', 'Utilizador a atualizar o seu perfil', {
      userId: session.user.id,
      action: 'profile_update_attempt',
      entity: 'user_profile'
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { name, bio, image },
    });

    await logGeneral('SUCCESS', 'Perfil atualizado com sucesso', 'Dados do perfil do utilizador foram atualizados', {
      userId: session.user.id,
      action: 'profile_updated',
      entity: 'user_profile'
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const session = await getServerSession(authOptions);
    await logErrors('ERROR', 'Erro ao atualizar perfil', 'Erro interno durante atualização do perfil', {
      userId: session?.user?.id,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
      action: 'profile_update_error'
    });
    console.error("Erro ao atualizar perfil:", err);
    return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 });
  }
}
