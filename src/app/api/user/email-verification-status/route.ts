import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabase } from '@/lib/supabase-client';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: "Não autenticado" 
      }, { status: 401 });
    }

    // Buscar status de verificação de email
    const { data: user, error } = await supabase
      .from('User')
      .select('emailVerified')
      .eq('id', Number(session.user.id))
      .single();

    if (error || !user) {
      return NextResponse.json({ 
        success: false, 
        error: "Utilizador não encontrado" 
      }, { status: 404 });
    }

    // Remoção de log de acesso desnecessário

    return NextResponse.json({ 
      success: true, 
      emailVerified: user.emailVerified !== null 
    });

  } catch (error) {
    console.error('Erro ao verificar status de email:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Erro interno do servidor" 
    }, { status: 500 });
  }
}