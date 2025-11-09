import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';

// Endpoint temporário para criar a tabela logs
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Verificar se é admin
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado - apenas admins' }, { status: 403 });
    }

    // SQL para criar a tabela
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        level TEXT NOT NULL,
        category TEXT NOT NULL,
        message TEXT NOT NULL,
        details JSONB,
        user_id INTEGER,
        user_email TEXT,
        user_role TEXT,
        ip_address TEXT,
        user_agent TEXT,
        url TEXT,
        method TEXT,
        correlation_id TEXT,
        request_id TEXT,
        parent_log_id UUID,
        server_instance TEXT,
        environment TEXT,
        tags TEXT[],
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    // Executar SQL usando RPC
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: createTableSQL 
    });

    if (error) {
      console.error('Erro ao criar tabela:', error);
      return NextResponse.json({ 
        error: 'Erro ao criar tabela', 
        details: error,
        message: 'Execute o SQL manualmente no Supabase Dashboard'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Tabela logs criada com sucesso',
      data
    });

  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      message: 'Execute o SQL manualmente no Supabase Dashboard'
    }, { status: 500 });
  }
}