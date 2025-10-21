import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";
import bcrypt from "bcryptjs";
import { logQuickAction, getUserInfoFromRequest, USER_ACTIONS } from "@/lib/user-action-logger";
import { logSystemEvent, logDatabaseError } from "@/lib/enhanced-logging";
import { sendWelcomeEmail, sendEmailConfirmation, generateEmailVerificationToken, createEmailVerificationData } from "@/lib/email";

export async function POST(req: NextRequest) {
  let email: string = '';
  let name: string = '';
  
  try {
    const requestData = await req.json();
    email = requestData.email;
    const password = requestData.password;
    name = requestData.name;

    const userInfo = getUserInfoFromRequest(req);
    
    // Log registration attempt
    await logQuickAction(
      'REGISTER_EMAIL',
      userInfo,
      false, // Will be updated to true if successful
      {
        email,
        name,
        registrationMethod: 'email_password',
        stage: 'attempt'
      }
    );

    // Teste de conectividade com Supabase
    const { data: testConnection, error: connectionError } = await supabase
      .from('User')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('Supabase connection test failed:', connectionError);
      await logDatabaseError(
        'connection_test',
        'User',
        connectionError,
        'SELECT count FROM User LIMIT 1'
      );
      throw new Error(`Database connection failed: ${connectionError.message}`);
    }

    const { data: existing } = await supabase
      .from('User')
      .select('id')
      .eq('email', email)
      .single();
      
    if (existing) {
      await logQuickAction(
        'REGISTER_EMAIL',
        userInfo,
        false,
        {
          email,
          reason: 'email_already_exists',
          stage: 'blocked'
        }
      );
      return NextResponse.json({ error: "Email já usado" }, { status: 400 });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    
    // Criar conta sem email verificado (emailVerified = null)
    const { data: user, error: createError } = await supabase
      .from('User')
      .insert({ 
        email, 
        name, 
        passwordHash,
        emailVerified: null // Conta não verificada inicialmente
      })
      .select('id, email, name')
      .single();

    if (createError || !user) {
      console.error('Supabase error details:', {
        error: createError,
        message: createError?.message,
        details: createError?.details,
        hint: createError?.hint,
        code: createError?.code
      });
      
      await logDatabaseError(
        'insert',
        'User',
        createError,
        `INSERT INTO User (email, name, passwordHash) VALUES (${email}, ${name}, [REDACTED])`
      );
      
      throw new Error(`Supabase error: ${createError?.message || 'Unknown error'}`);
    }

    // Gerar token de verificação de email
    const verificationToken = generateEmailVerificationToken();
    const verificationData = createEmailVerificationData(user.email, verificationToken);
    
    // Armazenar token na base de dados
    const { error: tokenError } = await supabase
      .from('VerificationToken')
      .insert({
        identifier: user.email,
        token: verificationToken,
        expires: verificationData.expiresAt
      });
    
    if (tokenError) {
      console.error('Erro ao criar token de verificação:', tokenError);
      // Não falhar o registro, mas logar o erro
      await logQuickAction(
        'REQUEST_EMAIL_VERIFICATION',
        { ...userInfo, userId: user.id, userEmail: user.email },
        false,
        {
          error: tokenError.message,
          stage: 'token_creation_failed'
        }
      );
    }

    // Log de evento crítico do sistema
    await logSystemEvent(
      'user_registered',
      'Novo utilizador registado no sistema',
      {
        ...userInfo,
        userId: user.id,
        email: user.email,
        name: user.name,
        registrationMethod: 'email_password',
        emailVerified: false
      }
    );

    // Enviar email de verificação
    try {
      await sendEmailConfirmation(
        user.email || email,
        user.name || 'Utilizador',
        verificationToken
      );
      console.log('✅ Email de verificação enviado para:', user.email);
    } catch (emailError) {
      console.error('❌ Erro ao enviar email de verificação:', emailError);
      // Não falhar o registo se o email falhar
      await logQuickAction(
        'REQUEST_EMAIL_VERIFICATION',
        { ...userInfo, userId: user.id, userEmail: user.email },
        false,
        {
          error: emailError instanceof Error ? emailError.message : 'Erro desconhecido',
          stage: 'email_send_failed'
        }
      );
    }

    // Log successful registration
    await logQuickAction(
      'REGISTER_EMAIL',
      { ...userInfo, userId: user.id, userEmail: user.email },
      true,
      {
        name: user.name,
        registrationMethod: 'email_password',
        stage: 'completed'
      }
    );

    return NextResponse.json({ 
      success: true, 
      userId: user.id,
      message: 'Conta criada com sucesso! Verifica o teu email para ativar a conta.'
    });
  } catch (error) {
    console.error('Registration error details:', error);
    
    const userInfo = getUserInfoFromRequest(req);
    await logQuickAction(
      'REGISTER_EMAIL',
      userInfo,
      false,
      {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        email,
        name,
        stage: 'error'
      }
    );
    
    return NextResponse.json({ 
      error: "Erro interno do servidor",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
