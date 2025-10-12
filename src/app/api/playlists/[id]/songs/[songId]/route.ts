import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

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

    // Verificar se a playlist existe e se o usuário tem permissão
    const { data: playlist, error: playlistError } = await supabase
      .from('Playlist')
      .select('userId')
      .eq('id', id)
      .single()

    if (playlistError || !playlist) {
      return NextResponse.json({ error: 'Playlist não encontrada' }, { status: 404 })
    }

    // Verificar se é o dono
    const isOwner = playlist.userId === session.user.id;
    
    // Se não é o dono, verificar se é colaborador editor
    let isEditor = false;
    if (!isOwner) {
      const { data: membership } = await supabase
        .from('PlaylistMember')
        .select('role, status')
        .eq('playlistId', id)
        .eq('userEmail', session.user.email)
        .eq('status', 'ACCEPTED')
        .eq('role', 'EDITOR')
        .single();

      isEditor = !!membership;
    }

    if (!isOwner && !isEditor) {
      return NextResponse.json({ error: 'Não autorizado. Apenas o proprietário ou editores podem remover músicas.' }, { status: 403 })
    }

    // Verificar se a música existe na playlist
    const { data: playlistItem, error: itemError } = await supabase
      .from('PlaylistItem')
      .select('id')
      .eq('playlistId', id)
      .eq('songId', songId)
      .single()

    if (itemError || !playlistItem) {
      return NextResponse.json({ error: 'Música não encontrada na playlist' }, { status: 404 })
    }

    // Remover a música da playlist
    const { error: deleteError } = await supabase
      .from('PlaylistItem')
      .delete()
      .eq('id', playlistItem.id)

    if (deleteError) {
      throw new Error(`Supabase error: ${deleteError.message}`)
    }

    // Buscar itens restantes para reordenar
    const { data: remainingItems, error: remainingError } = await supabase
      .from('PlaylistItem')
      .select('id, order')
      .eq('playlistId', id)
      .order('order', { ascending: true })

    if (remainingError) {
      throw new Error(`Supabase error: ${remainingError.message}`)
    }

    // Atualizar a ordem dos itens restantes
    if (remainingItems && remainingItems.length > 0) {
      for (let i = 0; i < remainingItems.length; i++) {
        const { error: updateError } = await supabase
          .from('PlaylistItem')
          .update({ order: i + 1 })
          .eq('id', remainingItems[i].id)

        if (updateError) {
          console.error('Error updating order:', updateError)
        }
      }
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
