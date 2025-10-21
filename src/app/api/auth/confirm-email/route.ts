import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";
import { logQuickAction, getUserInfoFromRequest, USER_ACTIONS } from "@/lib/user-action-logger";
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

    // Buscar token na base de dados
    const { data: verificationData, error: tokenError } = await supabase
      .from('VerificationToken')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !verificationData) {
      console.error('Token não encontrado ou erro:', tokenError);
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
      return NextResponse.redirect(new URL('/auth/confirm-email?status=update-failed', req.url));
    }    // Remover token usado
    await supabase
      .from('VerificationToken')
      .delete()
      .eq('token', token);

    // Log successful email verification
    await logQuickAction(
      'VERIFY_EMAIL',
      {
        userId: user.id,
        userEmail: user.email,
        ipAddress: ip,
        userAgent: userAgent
      },
      true,
      {
        verifiedAt: new Date().toISOString(),
        name: user.name
      }
    );

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
    
    return NextResponse.redirect(new URL('/auth/confirm-email?status=error', req.url));
  }
}