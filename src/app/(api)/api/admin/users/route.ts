import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdmin, logErrors } from "@/lib/logs";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);

    if (!session || session.user.role !== "ADMIN") {
      await logAdmin('WARN', 'Acesso não autorizado à gestão de utilizadores', 'Tentativa de acesso sem permissões de admin', {
        userId: session?.user?.id,
        action: 'user_management_unauthorized'
      });
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role && role !== 'all') {
      where.role = role;
    }

    if (status && status !== 'all') {
      if (status === 'ACTIVE') {
        where.OR = [
          { moderation: null },
          { moderation: { status: 'ACTIVE' } }
        ];
      } else {
        where.moderation = {
          status: status
        };
      }
    }

    // Get users with pagination
    const [users, totalUsers] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder as 'asc' | 'desc'
        },
        include: {
          moderation: {
            include: {
              moderatedBy: {
                select: { name: true }
              }
            }
          },
          _count: {
            select: {
              songVersions: true,
              submissions: true,
              playlists: true,
              favorites: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    const totalPages = Math.ceil(totalUsers / limit);

    await logAdmin('INFO', 'Lista de utilizadores consultada', 'Admin a consultar gestão de utilizadores', {
      userId: session.user.id,
      action: 'user_management_fetch',
      filters: { page, limit, search, role },
      resultsCount: users.length
    });

    return NextResponse.json({
      users: users.map(user => ({
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        bio: user.bio,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        totalSongs: user._count.songVersions,
        totalSubmissions: user._count.submissions,
        moderation: user.moderation ? {
          id: user.moderation.id,
          status: user.moderation.status,
          type: user.moderation.type,
          reason: user.moderation.reason,
          moderatorNote: user.moderation.moderatorNote,
          moderatedAt: user.moderation.moderatedAt?.toISOString() || null,
          expiresAt: user.moderation.expiresAt?.toISOString() || null,
          moderatedBy: user.moderation.moderatedBy
        } : null
      })),
      totalCount: totalUsers,
      totalPages,
      currentPage: page
    });
  } catch (error) {
    await logErrors('ERROR', 'Erro na gestão de utilizadores', 'Falha na consulta de utilizadores', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'user_management_error'
    });
    console.error("Erro na gestão de utilizadores:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { userId, role } = body;

    if (!session || session.user.role !== "ADMIN") {
      await logAdmin('WARN', 'Tentativa não autorizada de alterar role', 'Acesso negado para alteração de utilizador', {
        userId: session?.user?.id,
        targetUserId: userId,
        action: 'user_role_change_unauthorized'
      });
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (!userId || !role) {
      return NextResponse.json({ error: "userId e role são obrigatórios" }, { status: 400 });
    }

    // Prevent self role change to prevent lockout
    if (session.user.id === userId && role !== "ADMIN") {
      await logAdmin('WARN', 'Tentativa de auto-remoção de admin', 'Admin tentou remover próprias permissões', {
        userId: session.user.id,
        action: 'self_admin_removal_prevented'
      });
      return NextResponse.json({ error: "Não podes remover as tuas próprias permissões de admin" }, { status: 400 });
    }

    // Get user before update for logging
    const userBefore = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, role: true }
    });

    if (!userBefore) {
      return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            songVersions: true,
            submissions: true
          }
        }
      }
    });

    await logAdmin('SUCCESS', 'Role de utilizador alterada', 'Alteração de permissões executada com sucesso', {
      userId: session.user.id,
      targetUserId: userId,
      targetUserName: userBefore.name,
      targetUserEmail: userBefore.email,
      roleFrom: userBefore.role,
      roleTo: role,
      action: 'user_role_changed'
    });

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        image: updatedUser.image,
        bio: updatedUser.bio,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        totalSongs: updatedUser._count.songVersions,
        totalSubmissions: updatedUser._count.submissions
      }
    });
  } catch (error) {
    await logErrors('ERROR', 'Erro ao alterar role de utilizador', 'Falha na alteração de permissões', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'user_role_change_error'
    });
    console.error("Erro ao alterar role:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { userId } = await request.json();

    if (!session || session.user.role !== "ADMIN") {
      await logAdmin('WARN', 'Tentativa não autorizada de apagar utilizador', 'Acesso negado para apagar utilizador', {
        userId: session?.user?.id,
        targetUserId: userId,
        action: 'user_delete_unauthorized'
      });
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (!userId) {
      return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 });
    }

    // Prevent self deletion
    if (session.user.id === userId) {
      await logAdmin('WARN', 'Tentativa de auto-eliminação', 'Admin tentou apagar-se a si próprio', {
        userId: session.user.id,
        action: 'self_delete_prevented'
      });
      return NextResponse.json({ error: "Não podes apagar-te a ti próprio" }, { status: 400 });
    }

    // Get user before deletion for logging
    const userBefore = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, role: true }
    });

    if (!userBefore) {
      return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
    }

    // Delete user (this will cascade delete related records)
    await prisma.user.delete({
      where: { id: userId }
    });

    await logAdmin('SUCCESS', 'Utilizador eliminado', 'Utilizador foi removido da base de dados', {
      userId: session.user.id,
      targetUserId: userId,
      targetUserName: userBefore.name,
      targetUserEmail: userBefore.email,
      targetUserRole: userBefore.role,
      action: 'user_deleted'
    });

    return NextResponse.json({
      message: "Utilizador eliminado com sucesso"
    });
  } catch (error) {
    await logErrors('ERROR', 'Erro ao eliminar utilizador', 'Falha na eliminação do utilizador', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'user_delete_error'
    });
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
