import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase-client";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: "Não autenticado" 
      }, { status: 401 });
    }

    // Buscar contas OAuth do utilizador
    const { data: accounts, error } = await supabase
      .from('Account')
      .select('provider')
      .eq('userId', Number(session.user.id));

    if (error) {
      throw error;
    }

    return NextResponse.json({ 
      success: true,
      accounts: accounts || [],
      isOAuth: (accounts || []).length > 0,
      hasGoogle: (accounts || []).some(acc => acc.provider === 'google')
    });

  } catch (error) {
    console.error('Erro ao buscar profile:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Erro interno do servidor",
      accounts: [],
      isOAuth: false,
      hasGoogle: false
    }, { status: 500 });
  }
}