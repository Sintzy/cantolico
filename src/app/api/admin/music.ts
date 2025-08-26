import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { songId } = await req.json();
    if (!songId) {
      return NextResponse.json({ error: 'ID da música não fornecido' }, { status: 400 });
    }

    // Apaga todas as versões da música
    const versionsDeleted = await prisma.songVersion.deleteMany({
      where: { songId },
    });

    // Apaga favoritos relacionados
    const favoritesDeleted = await prisma.favorite.deleteMany({
      where: { songId },
    });

    // Apaga estrelas relacionadas
    await prisma.star.deleteMany({
      where: { songId },
    });

    // Apaga playlist items relacionados
    await prisma.playlistItem.deleteMany({
      where: { songId },
    });

    // Por fim, apaga a música
    await prisma.song.delete({
      where: { id: songId },
    });

    return NextResponse.json({
      success: true,
      details: {
        versionsDeleted: versionsDeleted.count,
        favoritesDeleted: favoritesDeleted.count,
      },
    });
  } catch (error) {
    console.error('Erro ao eliminar música:', error);
    return NextResponse.json({ error: 'Erro interno ao eliminar música' }, { status: 500 });
  }
}
