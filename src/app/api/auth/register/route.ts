import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail, sendEmailConfirmation, generateEmailVerificationToken, createEmailVerificationData } from "@/lib/email";
import { logApiRequestError, toErrorContext } from "@/lib/logging-helpers";

export async function POST(req: NextRequest) {
  let email: string = '';
  let name: string = '';
  
  try {
    const requestData = await req.json();
    email = requestData.email;
    const password = requestData.password;
    name = requestData.name;

    console.log(`🆕 [REGISTER] Registration attempt for: ${email}`);

    // Teste de conectividade com Supabase
    const { data: testConnection, error: connectionError } = await supabase
      .from('User')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('Supabase connection test failed:', connectionError);
      logApiRequestError({
        method: req.method,
        url: req.url,
        path: '/api/auth/register',
        status_code: 500,
        error: toErrorContext(connectionError)
      });
      throw new Error(`Database connection failed: ${connectionError.message}`);
    }

    const { data: existing } = await supabase
      .from('User')
      .select('id')
      .eq('email', email)
      .single();
      
    if (existing) {
      console.warn(`⚠️  [REGISTER] Email already exists: ${email}`);
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
      console.error('Supabase error details:', createError);
      
      logApiRequestError({
        method: req.method,
        url: req.url,
        path: '/api/auth/register',
        status_code: 500,
        error: toErrorContext(createError || new Error('User creation failed'))
      });
      
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
    }

    console.log(`🎉 [REGISTER] User registered: ${user.email} (ID: ${user.id})`);

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
    }

    return NextResponse.json({ 
      success: true, 
      userId: user.id,
      message: 'Conta criada com sucesso! Verifica o teu email para ativar a conta.'
    });
  } catch (error) {
    console.error('Registration error details:', error);
    
    logApiRequestError({
      method: req.method,
      url: req.url,
      path: '/api/auth/register',
      status_code: 500,
      error: toErrorContext(error)
    });
    
    return NextResponse.json({ 
      error: "Erro interno do servidor",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
