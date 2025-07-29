import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logGeneral, logErrors } from "@/lib/logs";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    await logGeneral('INFO', 'Tentativa de registo de utilizador', 'Novo utilizador a tentar registar-se', {
      email,
      name,
      action: 'user_registration_attempt'
    });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await logGeneral('WARN', 'Registo falhado - Email já existe', 'Tentativa de registo com email já existente', {
        email,
        action: 'registration_failed_existing_email'
      });
      return NextResponse.json({ error: "Email já usado" }, { status: 400 });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const user = await prisma.user.create({
      data: { email, name, passwordHash },
    });

    await logGeneral('SUCCESS', 'Utilizador registado com sucesso', 'Novo utilizador criado no sistema', {
      userId: user.id,
      email: user.email,
      name: user.name,
      action: 'user_registered',
      entity: 'user'
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    await logErrors('ERROR', 'Erro no registo de utilizador', 'Erro interno durante o processo de registo', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'user_registration_error'
    });
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
