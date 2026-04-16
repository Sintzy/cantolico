import { adminSupabase as supabase } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

import { getClerkSession } from '@/lib/api-middleware';
export async function POST(req: NextRequest) {
  try {
    const session = await getClerkSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const { name, bio, image } = data;

    console.log(`👤 [PROFILE UPDATE] Updating profile for user: ${session.user.email}`);

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

    const { error: updateError } = await supabase
      .from('User')
      .update({ name, bio, image })
      .eq('id', session.user.id);

    if (updateError) {
      throw new Error(`Supabase error: ${updateError.message}`);
    }

    console.log(`✅ [PROFILE UPDATE] Profile updated successfully for: ${session.user.email}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erro ao atualizar perfil:", err);
    return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 });
  }
}
