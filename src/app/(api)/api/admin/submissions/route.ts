import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdmin, logErrors } from "@/lib/logs";


export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      await logAdmin('WARN', 'Acesso não autorizado às submissões', 'Tentativa de acesso sem autenticação', {
        action: 'admin_submissions_unauthorized'
      });

      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || (user.role !== "REVIEWER" && user.role !== "ADMIN")) {
      await logAdmin('WARN', 'Acesso negado às submissões', 'Utilizador sem permissões de administração', {
        userId: user?.id,
        userRole: user?.role,
        action: 'admin_submissions_forbidden'
      });
      return NextResponse.json({ error: "Sem permissões" }, { status: 403 });
    }

    await logAdmin('INFO', 'Consulta de submissões pendentes', 'Administrador/Revisor a consultar submissões', {
      userId: user.id,
      userRole: user.role,
      action: 'admin_submissions_fetch'
    });

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

    await logAdmin('SUCCESS', 'Submissões carregadas com sucesso', `${submissions.length} submissões pendentes encontradas`, {
      userId: user.id,
      userRole: user.role,
      submissionCount: submissions.length,
      action: 'admin_submissions_loaded'
    });

    return NextResponse.json(submissions);
  } catch (error) {
    await logErrors('ERROR', 'Erro ao carregar submissões', 'Falha na consulta de submissões pendentes', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'admin_submissions_error'
    });
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}