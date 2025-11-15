import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabase } from '@/lib/supabase-client';
import { logVerificationAction, getUserInfoFromRequest } from '@/lib/user-action-logger';

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

    // Log access to email verification status
    try {
      const userInfo = getUserInfoFromRequest(req, session);
      await logVerificationAction('email_verification_status_view', userInfo, true, {});
    } catch (e) {
      console.warn('Failed to log email verification status view:', e);
    }

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