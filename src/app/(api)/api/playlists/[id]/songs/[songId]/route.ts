import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params {
  id: string
  songId: string
}

// DELETE - Remover música da playlist
export async function DELETE(request: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id, songId } = await params

    // Verificar se a playlist existe e pertence ao usuário
    const playlist = await prisma.playlist.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist não encontrada' }, { status: 404 })
    }

    if (playlist.userId !== session.user.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    // Verificar se a música existe na playlist
    const playlistItem = await prisma.playlistItem.findFirst({
      where: {
        playlistId: id,
        songId: songId
      }
    })

    if (!playlistItem) {
      return NextResponse.json({ error: 'Música não encontrada na playlist' }, { status: 404 })
    }

    // Remover a música da playlist
    await prisma.playlistItem.delete({
      where: { id: playlistItem.id }
    })

    // Reordenar os itens restantes
    const remainingItems = await prisma.playlistItem.findMany({
      where: { playlistId: id },
      orderBy: { order: 'asc' }
    })

    // Atualizar a ordem dos itens
    for (let i = 0; i < remainingItems.length; i++) {
      await prisma.playlistItem.update({
        where: { id: remainingItems[i].id },
        data: { order: i + 1 }
      })
    }

    return NextResponse.json({ message: 'Música removida da playlist com sucesso' })
  } catch (error) {
    console.error('Erro ao remover música da playlist:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
