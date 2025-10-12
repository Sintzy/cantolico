import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    console.log('Received token:', token);

    if (!token) {
      return NextResponse.json(
        { error: 'Token obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o token é válido (formato: UUID-randomBytes)
    // Os UUIDs têm formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 caracteres)
    // Então o memberId são os primeiros 36 caracteres, depois um hífen, depois o randomBytes
    if (token.length < 37) {
      console.log('Token too short to contain UUID');
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 400 }
      );
    }

    const memberId = token.substring(0, 36); // UUID é sempre 36 caracteres
    const tokenSuffix = token.substring(37); // Pular o hífen após o UUID
    console.log('Extracted member ID (UUID):', memberId);
    console.log('Token suffix:', tokenSuffix);

    // Verificar se o memberId tem formato de UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(memberId)) {
      console.log('Invalid UUID format:', memberId);
      return NextResponse.json(
        { error: 'Token com formato inválido' },
        { status: 400 }
      );
    }

    // Buscar detalhes completos do convite
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
      return NextResponse.json(
        { error: 'Convite não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o convite não expirou (7 dias)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (new Date(member.invitedAt) < sevenDaysAgo) {
      return NextResponse.json(
        { error: 'Convite expirado' },
        { status: 400 }
      );
    }

    console.log('Member found:', JSON.stringify(member, null, 2));

    // Processar dados corretamente
    const playlist = Array.isArray(member.Playlist) ? member.Playlist[0] : member.Playlist;
    const invitedBy = Array.isArray(member.InvitedBy) ? member.InvitedBy[0] : member.InvitedBy;
    const playlistOwner = playlist ? (Array.isArray(playlist.User) ? playlist.User[0] : playlist.User) : null;

    console.log('Processed data:', {
      playlist,
      invitedBy,
      playlistOwner
    });

    // Retornar detalhes do convite
    return NextResponse.json({
      member,
      playlist,
      invitedBy: invitedBy || playlistOwner,
      invitedAt: member.invitedAt,
      status: member.status
    });

  } catch (error) {
    console.error('Error fetching invite details:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}