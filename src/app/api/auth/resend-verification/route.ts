import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase-client";
import { sendEmailConfirmation, generateEmailVerificationToken, createEmailVerificationData } from "@/lib/email";
import { logApiRequestError, toErrorContext } from "@/lib/logging-helpers";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: "Não autenticado" 
      }, { status: 401 });
    }

    const { email } = await req.json();
    
    // Verificar se o email corresponde ao da sessão
    if (email !== session.user.email) {
      return NextResponse.json({ 
        success: false, 
        error: "Email não corresponde à conta atual" 
      }, { status: 400 });
    }

    // Verificar se a conta já está verificada
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('id, name, email, emailVerified')
      .eq('id', Number(session.user.id))
      .single();

    if (userError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: "Utilizador não encontrado" 
      }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ 
        success: false, 
        error: "Email já está verificado" 
      }, { status: 400 });
    }

    // Rate limiting: permitir reenvio apenas após 10 minutos
    // Vamos usar um sistema baseado em timestamp no identificador
    
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - (10 * 60 * 1000));
    
    // Verificar se existe token recente (criado nos últimos 10 minutos)
    // Como não temos campo created_at, vamos criar identificadores únicos com timestamp
    const timestampIdentifier = `${user.email}:${now.getTime()}`;
    
    // Buscar tokens existentes para este email
    const { data: existingTokens, error: tokenCheckError } = await supabase
      .from('VerificationToken')
      .select('*')
      .eq('identifier', user.email)
      .gt('expires', now.toISOString()); // Apenas tokens válidos

    if (!tokenCheckError && existingTokens && existingTokens.length > 0) {
      // Calcular se último token foi criado há menos de 10 minutos
      // Como tokens têm 48h de validade, usamos isso para estimar quando foi criado
      const latestToken = existingTokens[0];
      const tokenExpires = new Date(latestToken.expires);
      const estimatedCreation = new Date(tokenExpires.getTime() - (48 * 60 * 60 * 1000));
      
      if (estimatedCreation > tenMinutesAgo) {
        const minutesLeft = Math.ceil((estimatedCreation.getTime() + (10 * 60 * 1000) - now.getTime()) / (1000 * 60));
        
        return NextResponse.json({ 
          success: false, 
          error: `Aguarda ${Math.max(1, minutesLeft)} minuto(s) antes de solicitar novo email de verificação` 
        }, { status: 429 });
      }
    }

    // Remover tokens antigos para este email
    await supabase
      .from('VerificationToken')
      .delete()
      .eq('identifier', user.email);

    // Gerar novo token
    const verificationToken = generateEmailVerificationToken();
    const verificationData = createEmailVerificationData(user.email, verificationToken);
    
    // Armazenar novo token
    const { error: tokenError } = await supabase
      .from('VerificationToken')
      .insert({
        identifier: user.email,
        token: verificationToken,
        expires: verificationData.expiresAt
      });

    if (tokenError) {
      logApiRequestError({
        method: req.method,
        url: req.url,
        path: '/api/auth/resend-verification',
        status_code: 500,
        error: toErrorContext(tokenError),
        details: { userId: user.id, email: user.email, action: 'token_creation_error' } as any
      });
      
      return NextResponse.json({ 
        success: false, 
        error: "Erro ao gerar token de verificação" 
      }, { status: 500 });
    }

    // Enviar email de verificação
    const emailResult = await sendEmailConfirmation(
      user.email,
      user.name || 'Utilizador',
      verificationToken
    );

    if (!emailResult.success) {
      logApiRequestError({
        method: req.method,
        url: req.url,
        path: '/api/auth/resend-verification',
        status_code: 500,
        error: toErrorContext(new Error(emailResult.error || 'Email send failed')),
        details: { userId: user.id, email: user.email, action: 'email_send_error' } as any
      });
      
      return NextResponse.json({ 
        success: false, 
        error: "Erro ao enviar email de verificação" 
      }, { status: 500 });
    }

    console.log(`📧 [EMAIL VERIFY] Verification email resent to: ${user.email}`);

    return NextResponse.json({ 
      success: true, 
      message: "Email de verificação reenviado com sucesso" 
    });

  } catch (error) {
    console.error('Erro ao reenviar email de verificação:', error);
    
    logApiRequestError({
      method: req.method,
      url: req.url,
      path: '/api/auth/resend-verification',
      status_code: 500,
      error: toErrorContext(error),
      details: { action: 'resend_verification_error' } as any
    });
    
    return NextResponse.json({ 
      success: false, 
      error: "Erro interno do servidor" 
    }, { status: 500 });
  }
}