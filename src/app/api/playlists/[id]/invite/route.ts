import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { sendEmail, createPlaylistInviteEmailTemplate } from '@/lib/email'
import crypto from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }
    const { id: playlistId } = await params;
    const body = await request.json();
    const { email: inviteEmail } = body;

    if (!inviteEmail || !inviteEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Email válido é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se a playlist existe e se o usuário é o dono
    const { data: playlist, error: playlistError } = await supabase
      .from('Playlist')
      .select(`
        id,
        name,
        description,
        userId,
        User (
          id,
          name,
          email
        )
      `)
      .eq('id', playlistId)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json(
        { error: 'Playlist não encontrada' },
        { status: 404 }
      );
    }

    if (playlist.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Apenas o criador da playlist pode convidar membros' },
        { status: 403 }
      );
    }

    // Verificar se já existe um convite aceito para este email (pendentes são permitidos para reenvio)
    console.log(`Checking existing invites for ${inviteEmail.toLowerCase().trim()} in playlist ${playlistId}`);
    
    const { data: existingInvite, error: checkError } = await supabase
      .from('PlaylistMember')
      .select('id, status')
      .eq('playlistId', playlistId)
      .eq('userEmail', inviteEmail.toLowerCase().trim())
      .single();

    console.log('Existing invite check result:', { existingInvite, checkError });

    if (existingInvite && existingInvite.status === 'ACCEPTED') {
      return NextResponse.json(
        { error: 'Este utilizador já é membro da playlist' },
        { status: 400 }
      );
    }
    
    // Se ainda existir um convite pendente, removê-lo primeiro
    if (existingInvite && existingInvite.status === 'PENDING') {
      console.log(`Found pending invite ${existingInvite.id}, removing it first`);
      
      const { error: deleteError } = await supabase
        .from('PlaylistMember')
        .delete()
        .eq('id', existingInvite.id);
        
      if (deleteError) {
        console.error('Error deleting existing invite:', deleteError);
        return NextResponse.json(
          { error: 'Erro ao remover convite anterior' },
          { status: 500 }
        );
      }
      
      console.log('Previous invite removed successfully');
    }

    // Verificar se o email convidado não é o do próprio dono
    if (session.user.email && inviteEmail.toLowerCase().trim() === session.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Não podes convidar-te a ti próprio' },
        { status: 400 }
      );
    }

    // Verificar se o usuário com este email existe na plataforma
    const { data: invitedUser } = await supabase
      .from('User')
      .select('id, name, email')
      .eq('email', inviteEmail.toLowerCase().trim())
      .single();

    let invitedUserName = inviteEmail; // Fallback para o email
    if (invitedUser) {
      invitedUserName = invitedUser.name || inviteEmail;
    }

    // Gerar token único para o convite
    const inviteToken = crypto.randomBytes(32).toString('hex');

    // Criar o convite na base de dados
    const { data: invite, error: inviteError } = await supabase
      .from('PlaylistMember')
      .insert({
        playlistId: playlistId,
        userEmail: inviteEmail.toLowerCase().trim(),
        role: 'EDITOR',
        status: 'PENDING',
        invitedBy: session.user.id,
        invitedAt: new Date().toISOString(),
        // Vamos guardar o token numa coluna metadata como JSON se não existir campo específico
        // ou criar uma tabela separada PlaylistInviteToken
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invite:', inviteError);
      return NextResponse.json(
        { error: 'Erro ao criar convite' },
        { status: 500 }
      );
    }

    // Por enquanto, vamos usar o ID do membro como token (menos seguro mas funcional)
    // Em produção, deveríamos criar uma tabela PlaylistInviteToken
    const inviteTokenForEmail = `${invite.id}-${crypto.randomBytes(16).toString('hex')}`;

    // Enviar email de convite
    try {
      const emailTemplate = createPlaylistInviteEmailTemplate(
        invitedUserName,
        playlist.name,
        playlist.description,
        playlist.User?.[0]?.name || 'Um utilizador',
        inviteTokenForEmail,
        playlistId
      );

      await sendEmail({
        to: inviteEmail,
        subject: `🎵 Convite para colaborar na playlist "${playlist.name}"`,
        html: emailTemplate
      });

      console.log('Playlist invitation sent successfully:', { playlistId, inviteEmail });

      return NextResponse.json({
        success: true,
        message: 'Convite enviado com sucesso'
      });

    } catch (emailError) {
      console.error('Error sending invite email:', emailError);
      
      // Remover o convite se o email falhar
      await supabase
        .from('PlaylistMember')
        .delete()
        .eq('id', invite.id);

      return NextResponse.json(
        { error: 'Erro ao enviar email de convite' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in playlist invite:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}