import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase-client";
import { logSystemEvent } from "@/lib/enhanced-logging";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Apenas admins podem executar este script
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ 
        success: false, 
        error: "Apenas administradores podem executar este script" 
      }, { status: 403 });
    }

    console.log('🔧 [OAUTH FIX] Iniciando correção de contas OAuth...');

    // 1. Buscar todas as contas que têm Account (OAuth) mas emailVerified = null
    const { data: oauthAccounts, error: accountsError } = await supabase
      .from('Account')
      .select(`
        userId,
        provider,
        User!inner(
          id,
          email,
          name,
          emailVerified
        )
      `)
      .eq('User.emailVerified', null);

    if (accountsError) {
      throw new Error(`Erro ao buscar contas OAuth: ${accountsError.message}`);
    }

    if (!oauthAccounts || oauthAccounts.length === 0) {
      console.log('✅ [OAUTH FIX] Nenhuma conta OAuth precisa de correção');
      return NextResponse.json({
        success: true,
        message: "Nenhuma conta OAuth precisa de correção",
        fixedCount: 0
      });
    }

    console.log(`🔍 [OAUTH FIX] Encontradas ${oauthAccounts.length} contas OAuth para corrigir:`);
    
    const fixedUsers: any[] = [];
    const errors: any[] = [];

    // 2. Corrigir cada conta OAuth
    for (const account of oauthAccounts) {
      const user = (account as any).User;
      
      try {
        console.log(`🔄 [OAUTH FIX] Corrigindo ${user.email} (${account.provider})...`);
        
        // Definir emailVerified para agora
        const { data: updatedUser, error: updateError } = await supabase
          .from('User')
          .update({
            emailVerified: new Date().toISOString()
          })
          .eq('id', user.id)
          .select('id, email, name, emailVerified')
          .single();

        if (updateError) {
          throw updateError;
        }

        fixedUsers.push({
          id: user.id,
          email: user.email,
          name: user.name,
          provider: account.provider,
          fixedAt: updatedUser.emailVerified
        });

        console.log(`✅ [OAUTH FIX] ${user.email} corrigido com sucesso`);

      } catch (error) {
        console.error(`❌ [OAUTH FIX] Erro ao corrigir ${user.email}:`, error);
        errors.push({
          email: user.email,
          provider: account.provider,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    // 3. Log do sistema
    await logSystemEvent(
      'oauth_email_verification_fix',
      'Correção em lote de verificação de email OAuth',
      {
        performedBy: session.user.id,
        performedByEmail: session.user.email,
        totalFound: oauthAccounts.length,
        totalFixed: fixedUsers.length,
        totalErrors: errors.length,
        fixedUsers: fixedUsers.map(u => ({ id: u.id, email: u.email, provider: u.provider })),
        errors: errors,
        timestamp: new Date().toISOString()
      }
    );

    console.log(`🎉 [OAUTH FIX] Correção concluída: ${fixedUsers.length} contas corrigidas, ${errors.length} erros`);

    return NextResponse.json({
      success: true,
      message: `Correção concluída com sucesso`,
      fixedCount: fixedUsers.length,
      errorCount: errors.length,
      fixedUsers: fixedUsers,
      errors: errors
    });

  } catch (error) {
    console.error('❌ [OAUTH FIX] Erro crítico:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}