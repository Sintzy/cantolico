import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/playlists?error=invalid_token', request.url));
    }

    // Verificar se o token é válido (formato: UUID-randomBytes)
    if (token.length < 37) {
      return NextResponse.redirect(new URL('/playlists?error=invalid_token', request.url));
    }

    const memberId = token.substring(0, 36); // UUID é sempre 36 caracteres
    
    // Verificar se o memberId tem formato de UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(memberId)) {
      return NextResponse.redirect(new URL('/playlists?error=invalid_token', request.url));
    }

    // Buscar o membro pela ID extraída do token
    const { data: member, error: memberError } = await supabase
      .from('PlaylistMember')
      .select(`
        id,
        playlistId,
        userEmail,
        status,
        invitedAt,
        invitedBy,
        Playlist (
          id,
          name,
          description,
          User (
            id,
            name,
            image
          )
        ),
        InvitedBy:User!PlaylistMember_invitedBy_fkey (
          id,
          name,
          image,
          email
        )
      `)
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.redirect(new URL('/playlists?error=invalid_token', request.url));
    }

    // Verificar se o convite não expirou (7 dias)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (new Date(member.invitedAt) < sevenDaysAgo) {
      return NextResponse.redirect(new URL('/playlists?error=expired_token', request.url));
    }

    // Verificar o status do convite
    if (!member) {
      return NextResponse.redirect(new URL('/playlists?error=invite_not_found', request.url));
    }
    
    if (member.status === 'ACCEPTED' || member.status === 'accepted') {
      return NextResponse.redirect(new URL('/playlists?error=already_accepted', request.url));
    }
    
    if (member.status !== 'PENDING' && member.status !== 'pending') {
      return NextResponse.redirect(new URL('/playlists?error=invite_cancelled', request.url));
    }

    // Verificar se o usuário está logado
    const session = await getServerSession(authOptions);
    if (!session) {
      // Redirecionar para login com return URL
      return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(`/playlists/invite/accept?token=${token}`)}`, request.url));
    }

    // Verificar se o email do usuário logado corresponde ao email do convite
    if (!session.user.email || session.user.email.toLowerCase() !== member.userEmail.toLowerCase()) {
      return NextResponse.redirect(new URL('/playlists?error=email_mismatch', request.url));
    }

    // Aceitar o convite
    const { error: updateError } = await supabase
      .from('PlaylistMember')
      .update({
        status: 'ACCEPTED',
        acceptedAt: new Date().toISOString()
      })
      .eq('id', member.id);

    if (updateError) {
      console.error('Error accepting invite:', updateError);
      return NextResponse.redirect(new URL('/playlists?error=accept_failed', request.url));
    }

    // Redirecionar para a playlist com sucesso
    return NextResponse.redirect(new URL(`/playlists/${member.playlistId}?invited=success`, request.url));

  } catch (error) {
    console.error('Error processing invite acceptance:', error);
    return NextResponse.redirect(new URL('/playlists?error=server_error', request.url));
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token obrigatório' },
        { status: 400 }
      );
    }

    // Verificar token (formato: UUID-randomBytes)
    if (token.length < 37) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 400 }
      );
    }

    const memberId = token.substring(0, 36); // UUID é sempre 36 caracteres
    console.log('Accepting invite for member ID:', memberId);

    // Verificar se o memberId tem formato de UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(memberId)) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 400 }
      );
    }

    // Buscar membro
    const { data: member, error: memberError } = await supabase
      .from('PlaylistMember')
      .select('id, playlistId, userEmail, status, invitedAt')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 400 }
      );
    }

    // Verificar se não expirou (7 dias)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (new Date(member.invitedAt) < sevenDaysAgo) {
      return NextResponse.json(
        { error: 'Token expirado' },
        { status: 400 }
      );
    }

    console.log(`Member status: ${member.status}, expected: PENDING`);
    
    if (member.status !== 'PENDING' && member.status !== 'pending') {
      console.log(`Invalid status: ${member.status}`);
      return NextResponse.json(
        { error: `Convite inválido. Status atual: ${member.status}` },
        { status: 400 }
      );
    }

    if (!session.user.email || session.user.email.toLowerCase() !== member.userEmail.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email não corresponde ao convite' },
        { status: 403 }
      );
    }

    // Aceitar o convite
    const { error: updateError } = await supabase
      .from('PlaylistMember')
      .update({
        status: 'ACCEPTED',
        acceptedAt: new Date().toISOString()
      })
      .eq('id', member.id);

    if (updateError) {
      console.error('Error accepting invite:', updateError);
      return NextResponse.json(
        { error: 'Erro ao aceitar convite' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      playlistId: member.playlistId
    });

  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}