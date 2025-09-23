import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";
import { logGeneral, logErrors } from "@/lib/logs";
import { logSystemEvent } from "@/lib/enhanced-logging";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      console.error('Token não fornecido');
      return NextResponse.redirect(new URL('/auth/confirm-email?status=missing-token', req.url));
    }

    console.log('Processando verificação de email para token:', token.substring(0, 8) + '...');

    // Obter informações de IP para logs
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    try {
      await logGeneral('INFO', 'Tentativa de verificação de email', 'Utilizador a tentar verificar email', {
        token: token.substring(0, 8) + '...', // Log apenas parte do token por segurança
        ipAddress: ip,
        userAgent: userAgent,
        action: 'email_verification_attempt'
      });
    } catch (logError) {
      console.warn('Erro no logging (não crítico):', logError);
    }

    // Buscar token na base de dados
    const { data: verificationData, error: tokenError } = await supabase
      .from('VerificationToken')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !verificationData) {
      console.error('Token não encontrado ou erro:', tokenError);
      try {
        await logErrors('WARN', 'Token de verificação inválido', 'Token não encontrado na base de dados', {
          token: token.substring(0, 8) + '...',
          ip,
          userAgent
        });
      } catch (logError) {
        console.warn('Erro no logging (não crítico):', logError);
      }
      
      return NextResponse.redirect(new URL('/auth/confirm-email?status=invalid-token', req.url));
    }

    // Verificar se token expirou
    const now = new Date();
    const expirationDate = new Date(verificationData.expires);
    
    if (now > expirationDate) {
      // Remover token expirado
      await supabase
        .from('VerificationToken')
        .delete()
        .eq('token', token);

      try {
        await logErrors('WARN', 'Token de verificação expirado', 'Utilizador tentou usar token expirado', {
          email: verificationData.identifier,
          expiredAt: verificationData.expires,
          ip,
          userAgent
        });
      } catch (logError) {
        console.warn('Erro no logging (não crítico):', logError);
      }

      return NextResponse.redirect(new URL('/auth/confirm-email?status=expired', req.url));
    }

    // Buscar utilizador pelo email
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('id, name, email, emailVerified')
      .eq('email', verificationData.identifier)
      .single();

    if (userError || !user) {
      console.error('Utilizador não encontrado:', userError);
      try {
        await logErrors('ERROR', 'Utilizador não encontrado para verificação', 'Email do token não corresponde a nenhum utilizador', {
          email: verificationData.identifier,
          token: token.substring(0, 8) + '...',
          ip,
          userAgent
        });
      } catch (logError) {
        console.warn('Erro no logging (não crítico):', logError);
      }

      return NextResponse.redirect(new URL('/auth/confirm-email?status=user-not-found', req.url));
    }

    // Verificar se email já está verificado
    if (user.emailVerified) {
      // Remover token já usado
      await supabase
        .from('VerificationToken')
        .delete()
        .eq('token', token);

      return NextResponse.redirect(new URL('/auth/confirm-email?status=already-verified', req.url));
    }

    // Verificar email do utilizador
    const { error: updateError } = await supabase
      .from('User')
      .update({ 
        emailVerified: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Erro de atualização da base de dados:', updateError);
      try {
        await logErrors('ERROR', 'Erro ao verificar email', 'Falha ao atualizar status de verificação na base de dados', {
          userId: user.id,
          email: user.email,
          error: updateError.message,
          errorCode: updateError.code,
          errorDetails: updateError.details,
          ip,
          userAgent
        });
      } catch (logError) {
        console.warn('Erro no logging (não crítico):', logError);
      }

      return NextResponse.redirect(new URL('/auth/confirm-email?status=update-failed', req.url));
    }

    // Remover token usado
    await supabase
      .from('VerificationToken')
      .delete()
      .eq('token', token);

    // Log de evento crítico do sistema
    try {
      await logSystemEvent(
        'email_verified',
        'Email verificado com sucesso',
        {
          userId: user.id,
          email: user.email,
          name: user.name,
          verifiedAt: new Date().toISOString(),
          ip,
          userAgent
        }
      );
    } catch (logError) {
      console.warn('Erro no logging do sistema (não crítico):', logError);
    }

    // Enviar email de boas-vindas após verificação
    try {
      await sendWelcomeEmail(
        user.email,
        user.name || 'Utilizador'
      );
      console.log('✅ Email de boas-vindas enviado após verificação para:', user.email);
    } catch (emailError) {
      console.error('❌ Erro ao enviar email de boas-vindas:', emailError);
      // Não falhar a verificação se o email falhar
    }

    console.log(`✅ Email verificado com sucesso para utilizador ${user.id}`);
    return NextResponse.redirect(new URL('/auth/confirm-email?status=success', req.url));

  } catch (error) {
    console.error('=== ERRO NA VERIFICAÇÃO DE EMAIL ===');
    console.error('Erro:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    
    try {
      await logErrors('ERROR', 'Erro na verificação de email', 'Erro interno durante processo de verificação', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        action: 'email_verification_error'
      });
    } catch (logError) {
      console.warn('Erro no logging final (não crítico):', logError);
    }
    
    return NextResponse.redirect(new URL('/auth/confirm-email?status=error', req.url));
  }
}