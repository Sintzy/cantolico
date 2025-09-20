import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase-client";
import { NextRequest, NextResponse } from "next/server";
import { logGeneral, logErrors } from "@/lib/logs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      await logGeneral('WARN', 'Tentativa de atualização de perfil sem autenticação', 'Utilizador não autenticado tentou atualizar perfil', {
        action: 'profile_update_unauthorized'
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const { name, bio, image } = data;

    // Obter informações de IP e User-Agent para logs
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Buscar dados atuais do utilizador para comparação
    const { data: currentUser } = await supabase
      .from('User')
      .select('name, bio, image')
      .eq('id', session.user.id)
      .single();

    // Criar objeto com as mudanças
    const changes = {
      name: currentUser?.name !== name ? { from: currentUser?.name, to: name } : null,
      bio: currentUser?.bio !== bio ? { from: currentUser?.bio, to: bio } : null,
      image: currentUser?.image !== image ? { from: currentUser?.image, to: image } : null
    };

    // Filtrar apenas mudanças válidas
    const actualChanges = Object.fromEntries(
      Object.entries(changes).filter(([_, value]) => value !== null)
    );

    await logGeneral('INFO', 'Atualização de perfil iniciada', 'Utilizador a atualizar o seu perfil', {
      userId: session.user.id,
      userEmail: session.user.email,
      changes: actualChanges,
      ipAddress: ip,
      userAgent: userAgent,
      action: 'profile_update_attempt',
      entity: 'user_profile'
    });

    const { error: updateError } = await supabase
      .from('User')
      .update({ name, bio, image })
      .eq('id', session.user.id);

    if (updateError) {
      throw new Error(`Supabase error: ${updateError.message}`);
    }

    await logGeneral('SUCCESS', 'Perfil atualizado com sucesso', 'Dados do perfil do utilizador foram atualizados', {
      userId: session.user.id,
      userEmail: session.user.email,
      changes: actualChanges,
      ipAddress: ip,
      userAgent: userAgent,
      action: 'profile_updated',
      entity: 'user_profile'
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const session = await getServerSession(authOptions);
    await logErrors('ERROR', 'Erro ao atualizar perfil', 'Erro interno durante atualização do perfil', {
      userId: session?.user?.id,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
      action: 'profile_update_error'
    });
    console.error("Erro ao atualizar perfil:", err);
    return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 });
  }
}
