import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase-client";
import { logSystemEvent } from "@/lib/enhanced-logging";
import { logVerificationAction, getUserInfoFromRequest } from '@/lib/user-action-logger';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: "Não autenticado" 
      }, { status: 401 });
    }

    console.log(`🔧 [FORCE VERIFY] Forçando verificação para utilizador ${session.user.email}...`);

    // Verificar se tem conta OAuth (Google)
    const { data: oauthAccount, error: accountError } = await supabase
      .from('Account')
      .select('provider')
      .eq('userId', Number(session.user.id))
      .eq('provider', 'google')
      .single();

    if (!oauthAccount) {
      return NextResponse.json({
        success: false,
        error: "Esta conta não é uma conta OAuth do Google"
      }, { status: 400 });
    }

    // Forçar emailVerified = agora
    const { data: updatedUser, error: updateError } = await supabase
      .from('User')
      .update({
        emailVerified: new Date().toISOString()
      })
      .eq('id', Number(session.user.id))
      .select('id, email, name, emailVerified')
      .single();

    if (updateError) {
      throw updateError;
    }

    // Log do evento (user action)
    const requesterInfo = getUserInfoFromRequest(req, session);
    await logVerificationAction('force_verify_oauth', requesterInfo, true, {
      provider: 'google',
      verifiedAt: updatedUser.emailVerified
    });

    // Also keep system event log for operational traces
    await logSystemEvent(
      'oauth_email_force_verified',
      'Verificação forçada de email OAuth',
      {
        userId: session.user.id,
        userEmail: session.user.email,
        verifiedAt: updatedUser.emailVerified,
        provider: 'google',
        timestamp: new Date().toISOString()
      }
    );

    console.log(`✅ [FORCE VERIFY] Email verificado para ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: "Email verificado com sucesso",
      emailVerified: updatedUser.emailVerified
    });

  } catch (error) {
    console.error('❌ [FORCE VERIFY] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}