import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";
import bcrypt from "bcryptjs";
import { logGeneral, logErrors } from "@/lib/logs";

export async function POST(req: NextRequest) {
  let email: string = '';
  let name: string = '';
  
  try {
    const requestData = await req.json();
    email = requestData.email;
    const password = requestData.password;
    name = requestData.name;

    await logGeneral('INFO', 'Tentativa de registo de utilizador', 'Novo utilizador a tentar registar-se', {
      email,
      name,
      action: 'user_registration_attempt'
    });

    // Teste de conectividade com Supabase
    const { data: testConnection, error: connectionError } = await supabase
      .from('User')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('Supabase connection test failed:', connectionError);
      await logErrors('ERROR', 'Erro de conectividade Supabase', 'Falha na conexão com a base de dados', {
        error: connectionError.message,
        action: 'supabase_connection_test_failed'
      });
      throw new Error(`Database connection failed: ${connectionError.message}`);
    }

    const { data: existing } = await supabase
      .from('User')
      .select('id')
      .eq('email', email)
      .single();
      
    if (existing) {
      await logGeneral('WARN', 'Registo falhado - Email já existe', 'Tentativa de registo com email já existente', {
        email,
        action: 'registration_failed_existing_email'
      });
      return NextResponse.json({ error: "Email já usado" }, { status: 400 });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    
    const { data: user, error: createError } = await supabase
      .from('User')
      .insert({ email, name, passwordHash })
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
      
      await logErrors('ERROR', 'Erro Supabase ao criar utilizador', 'Erro detalhado da base de dados', {
        error: createError?.message || 'Erro desconhecido',
        details: createError?.details,
        hint: createError?.hint,
        code: createError?.code,
        email,
        name,
        action: 'supabase_user_creation_error'
      });
      
      throw new Error(`Supabase error: ${createError?.message || 'Unknown error'}`);
    }

    await logGeneral('SUCCESS', 'Utilizador registado com sucesso', 'Novo utilizador criado no sistema', {
      userId: user.id,
      email: user.email,
      name: user.name,
      action: 'user_registered',
      entity: 'user'
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    console.error('Registration error details:', error);
    
    await logErrors('ERROR', 'Erro no registo de utilizador', 'Erro interno durante o processo de registo', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
      email,
      name,
      action: 'user_registration_error'
    });
    
    return NextResponse.json({ 
      error: "Erro interno do servidor",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
