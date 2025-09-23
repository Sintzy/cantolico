import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase-client";
import { sendEmailConfirmation, generateEmailVerificationToken, createEmailVerificationData } from "@/lib/email";
import { logGeneral, logErrors } from "@/lib/logs";

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
      await logErrors('ERROR', 'Erro ao criar token de verificação (reenvio)', 'Falha ao armazenar token de verificação', {
        userId: user.id,
        email: user.email,
        error: tokenError.message
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
      await logErrors('ERROR', 'Erro ao reenviar email de verificação', 'Falha no envio do email', {
        userId: user.id,
        email: user.email,
        error: emailResult.error
      });
      
      return NextResponse.json({ 
        success: false, 
        error: "Erro ao enviar email de verificação" 
      }, { status: 500 });
    }

    // Log do reenvio
    await logGeneral('INFO', 'Email de verificação reenviado', 'Utilizador solicitou reenvio de email de verificação', {
      userId: user.id,
      email: user.email,
      action: 'resend_verification_email'
    });

    return NextResponse.json({ 
      success: true, 
      message: "Email de verificação reenviado com sucesso" 
    });

  } catch (error) {
    console.error('Erro ao reenviar email de verificação:', error);
    
    await logErrors('ERROR', 'Erro no reenvio de email de verificação', 'Erro interno no processo de reenvio', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({ 
      success: false, 
      error: "Erro interno do servidor" 
    }, { status: 500 });
  }
}