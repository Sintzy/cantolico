import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdmin, logErrors } from "@/lib/logs";

type SubmissionWithSubmitter = {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
  submitter: {
    name: string | null;
  };
};

type SongWithVersions = {
  id: string;
  title: string;
  createdAt: Date;
  versions: Array<{
    createdBy: {
      name: string | null;
    };
  }>;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      await logAdmin('WARN', 'Acesso não autorizado às estatísticas', 'Tentativa de acesso sem permissões de admin', {
        userId: session?.user?.id,
        action: 'dashboard_stats_unauthorized'
      });
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    await logAdmin('INFO', 'Consulta de estatísticas do dashboard', 'Admin a consultar estatísticas gerais', {
      userId: session.user.id,
      action: 'dashboard_stats_fetch'
    });

    // Get total users
    const totalUsers = await prisma.user.count();

    // Get users by role
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true
      }
    });

    // Get total songs
    const totalSongs = await prisma.song.count();

    // Get songs by type
    const songsByType = await prisma.song.groupBy({
      by: ['type'],
      _count: {
        type: true
      }
    });

    // Get total submissions
    const totalSubmissions = await prisma.songSubmission.count();

    // Get pending submissions
    const pendingSubmissions = await prisma.songSubmission.count({
      where: { status: "PENDING" }
    });

    // Get submissions by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const submissionsByMonth = await prisma.songSubmission.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: sixMonthsAgo
        }
      },
      _count: {
        id: true
      }
    });

    // Process submissions by month
    const monthlySubmissions = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString('pt-PT', { month: 'short' });
      
      const count = submissionsByMonth.filter((s: { createdAt: Date; _count: { id: number } }) => {
        const submissionMonth = new Date(s.createdAt).getMonth();
        return submissionMonth === date.getMonth();
      }).reduce((sum: number, s: { createdAt: Date; _count: { id: number } }) => sum + s._count.id, 0);

      return { month: monthName, count };
    }).reverse();

    // Get recent activities (last 10)
    const recentSubmissions = await prisma.songSubmission.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        submitter: {
          select: { name: true }
        }
      }
    });

    const recentSongs = await prisma.song.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        versions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: { name: true }
            }
          }
        }
      }
    });

    // Combine recent activities
    const recentActivities = [
      ...recentSubmissions.map((s: SubmissionWithSubmitter) => ({
        id: `submission-${s.id}`,
        type: s.status === 'APPROVED' ? 'submission_approved' : 
              s.status === 'REJECTED' ? 'submission_rejected' : 'submission_created',
        description: `Submissão "${s.title}" ${
          s.status === 'APPROVED' ? 'foi aprovada' :
          s.status === 'REJECTED' ? 'foi rejeitada' : 'foi criada'
        }`,
        timestamp: s.createdAt.toISOString(),
        user: s.submitter.name || 'Utilizador'
      })),
      ...recentSongs.map((s: SongWithVersions) => ({
        id: `song-${s.id}`,
        type: 'song_created',
        description: `Nova música "${s.title}" foi publicada`,
        timestamp: s.createdAt.toISOString(),
        user: s.versions[0]?.createdBy?.name || 'Sistema'
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

    const stats = {
      totalUsers,
      totalSongs,
      pendingSubmissions,
      totalSubmissions,
      usersByRole: usersByRole.map((ur: any) => ({ 
        role: ur.role, 
        count: ur._count.role 
      })),
      songsByType: songsByType.map((st: any) => ({ 
        type: st.type, 
        count: st._count.type 
      })),
      submissionsByMonth: monthlySubmissions,
      recentActivities
    };

    await logAdmin('SUCCESS', 'Estatísticas carregadas com sucesso', 'Dados do dashboard enviados', {
      userId: session.user.id,
      action: 'dashboard_stats_loaded',
      totalUsers,
      totalSongs,
      pendingSubmissions
    });

    return NextResponse.json(stats);
  } catch (error) {
    await logErrors('ERROR', 'Erro ao carregar estatísticas', 'Falha na consulta de estatísticas do dashboard', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'dashboard_stats_error'
    });
    console.error("Erro ao carregar estatísticas:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
