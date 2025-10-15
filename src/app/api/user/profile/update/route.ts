import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase-client";
import { NextRequest, NextResponse } from "next/server";
import { logProfileAction, getUserInfoFromRequest } from "@/lib/user-action-logger";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userInfo = getUserInfoFromRequest(req, session);
    
    if (!session?.user?.id) {
      await logProfileAction('profile_update_unauthorized', userInfo, false, {
        reason: 'User not authenticated'
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const { name, bio, image } = data;

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

    await logProfileAction('profile_update_started', userInfo, true, {
      changes: actualChanges,
      requestData: { name, bio, image }
    });

    const { error: updateError } = await supabase
      .from('User')
      .update({ name, bio, image })
      .eq('id', session.user.id);

    if (updateError) {
      throw new Error(`Supabase error: ${updateError.message}`);
    }

    await logProfileAction('profile_updated', userInfo, true, {
      changes: actualChanges,
      updatedFields: Object.keys(actualChanges)
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const session = await getServerSession(authOptions);
    const userInfo = getUserInfoFromRequest(req, session);
    
    await logProfileAction('profile_update_error', userInfo, false, {
      error: err instanceof Error ? err.message : 'Unknown error'
    });
    
    console.error("Erro ao atualizar perfil:", err);
    return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 });
  }
}
