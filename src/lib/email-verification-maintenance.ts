import { supabase } from "@/lib/supabase-client";
import { logGeneral, logErrors } from "@/lib/logs";

/**
 * Tarefa de limpeza automática do sistema de verificação de email
 * Remove tokens expirados e verifica consistência dos dados
 */
export class EmailVerificationMaintenanceService {
  
  /**
   * Executa limpeza de tokens expirados
   */
  static async cleanupExpiredTokens(): Promise<{
    success: boolean;
    deletedCount: number;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('VerificationToken')
        .delete()
        .lt('expires', new Date().toISOString())
        .select('count');

      if (error) {
        throw new Error(`Erro na limpeza: ${error.message}`);
      }

      const deletedCount = Array.isArray(data) ? data.length : 0;

      await logGeneral('INFO', 'Limpeza automática de tokens', 'Tokens expirados removidos', {
        deletedTokens: deletedCount,
        cleanupTime: new Date().toISOString(),
        action: 'maintenance_cleanup'
      });

      return {
        success: true,
        deletedCount
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      await logErrors('ERROR', 'Erro na limpeza de tokens', 'Falha ao remover tokens expirados', {
        error: errorMessage,
        action: 'maintenance_cleanup_failed'
      });

      return {
        success: false,
        deletedCount: 0,
        error: errorMessage
      };
    }
  }

  /**
   * Verifica consistência dos dados de verificação
   */
  static async checkDataConsistency(): Promise<{
    success: boolean;
    issues: Array<{
      type: string;
      count: number;
      description: string;
      users?: string[];
    }>;
    error?: string;
  }> {
    try {
      const issues: Array<{
        type: string;
        count: number;
        description: string;
        users?: string[];
      }> = [];

      // 1. Verificar utilizadores verificados com tokens ainda válidos
      const { data: activeTokensData } = await supabase
        .from('VerificationToken')
        .select('identifier')
        .gt('expires', new Date().toISOString());

      const activeTokenEmails = activeTokensData?.map(t => t.identifier) || [];

      const { data: verifiedWithTokens, error: error1 } = await supabase
        .from('User')
        .select('id, email')
        .not('emailVerified', 'is', null)
        .in('email', activeTokenEmails.length > 0 ? activeTokenEmails : ['__no_matches__']);

      if (!error1 && verifiedWithTokens && verifiedWithTokens.length > 0) {
        issues.push({
          type: 'verified_users_with_active_tokens',
          count: verifiedWithTokens.length,
          description: 'Utilizadores verificados com tokens ainda ativos',
          users: verifiedWithTokens.map(u => u.email)
        });
      }

      // 2. Verificar tokens órfãos
      const { data: allUsers } = await supabase
        .from('User')
        .select('email');

      const userEmails = allUsers?.map(u => u.email) || [];

      const { data: orphanedTokens, error: error2 } = await supabase
        .from('VerificationToken')
        .select('identifier, token')
        .not('identifier', 'in', userEmails.length > 0 ? userEmails : ['__no_matches__']);

      if (!error2 && orphanedTokens && orphanedTokens.length > 0) {
        issues.push({
          type: 'orphaned_tokens',
          count: orphanedTokens.length,
          description: 'Tokens sem utilizador correspondente',
          users: orphanedTokens.map(t => t.identifier)
        });
      }

      // 3. Verificar utilizadores não verificados há mais de 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: oldUnverified, error: error3 } = await supabase
        .from('User')
        .select('id, email, createdAt')
        .is('emailVerified', null)
        .lt('createdAt', thirtyDaysAgo.toISOString());

      if (!error3 && oldUnverified && oldUnverified.length > 0) {
        issues.push({
          type: 'old_unverified_users',
          count: oldUnverified.length,
          description: 'Utilizadores não verificados há mais de 30 dias',
          users: oldUnverified.map(u => u.email)
        });
      }

      await logGeneral('INFO', 'Verificação de consistência', 'Verificação de dados de email concluída', {
        issuesFound: issues.length,
        totalProblems: issues.reduce((sum, issue) => sum + issue.count, 0),
        checkTime: new Date().toISOString(),
        action: 'consistency_check'
      });

      return {
        success: true,
        issues
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      await logErrors('ERROR', 'Erro na verificação de consistência', 'Falha ao verificar dados', {
        error: errorMessage,
        action: 'consistency_check_failed'
      });

      return {
        success: false,
        issues: [],
        error: errorMessage
      };
    }
  }

  /**
   * Repara problemas de consistência automaticamente
   */
  static async repairConsistencyIssues(): Promise<{
    success: boolean;
    repaired: number;
    error?: string;
  }> {
    try {
      let totalRepaired = 0;

      // 1. Remover tokens de utilizadores já verificados
      const { data: verifiedUsersData } = await supabase
        .from('User')
        .select('email')
        .not('emailVerified', 'is', null);

      const verifiedEmails = verifiedUsersData?.map(u => u.email) || [];

      const { count: tokensRemoved, error: error1 } = await supabase
        .from('VerificationToken')
        .delete()
        .in('identifier', verifiedEmails.length > 0 ? verifiedEmails : ['__no_matches__']);

      if (!error1 && tokensRemoved) {
        totalRepaired += tokensRemoved;
      }

      // 2. Remover tokens órfãos
      const { data: allUsersForRepair } = await supabase
        .from('User')
        .select('email');

      const allUserEmails = allUsersForRepair?.map(u => u.email) || [];

      const { count: orphansRemoved, error: error2 } = await supabase
        .from('VerificationToken')
        .delete()
        .not('identifier', 'in', allUserEmails.length > 0 ? allUserEmails : ['__no_matches__']);

      if (!error2 && orphansRemoved) {
        totalRepaired += orphansRemoved;
      }

      await logGeneral('INFO', 'Reparação automática', 'Problemas de consistência reparados', {
        tokensRemoved: tokensRemoved || 0,
        orphansRemoved: orphansRemoved || 0,
        totalRepaired,
        repairTime: new Date().toISOString(),
        action: 'auto_repair'
      });

      return {
        success: true,
        repaired: totalRepaired
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      await logErrors('ERROR', 'Erro na reparação automática', 'Falha ao reparar problemas', {
        error: errorMessage,
        action: 'auto_repair_failed'
      });

      return {
        success: false,
        repaired: 0,
        error: errorMessage
      };
    }
  }

  /**
   * Executa manutenção completa do sistema
   */
  static async runFullMaintenance(): Promise<{
    success: boolean;
    results: {
      cleanup: any;
      consistency: any;
      repair: any;
    };
    error?: string;
  }> {
    try {
      console.log('🔧 Iniciando manutenção completa do sistema de verificação de email...');

      // 1. Limpeza de tokens expirados
      const cleanupResult = await this.cleanupExpiredTokens();
      console.log(`✅ Limpeza: ${cleanupResult.deletedCount} tokens removidos`);

      // 2. Verificação de consistência
      const consistencyResult = await this.checkDataConsistency();
      console.log(`🔍 Consistência: ${consistencyResult.issues.length} tipos de problemas encontrados`);

      // 3. Reparação automática se necessário
      const repairResult = await this.repairConsistencyIssues();
      console.log(`🔨 Reparação: ${repairResult.repaired} problemas reparados`);

      const results = {
        cleanup: cleanupResult,
        consistency: consistencyResult,
        repair: repairResult
      };

      await logGeneral('INFO', 'Manutenção completa concluída', 'Sistema de verificação otimizado', {
        tokensRemoved: cleanupResult.deletedCount,
        issuesFound: consistencyResult.issues.length,
        problemsRepaired: repairResult.repaired,
        maintenanceTime: new Date().toISOString(),
        action: 'full_maintenance'
      });

      console.log('✅ Manutenção completa concluída com sucesso!');

      return {
        success: true,
        results
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      await logErrors('ERROR', 'Erro na manutenção completa', 'Falha durante manutenção do sistema', {
        error: errorMessage,
        action: 'full_maintenance_failed'
      });

      console.error('❌ Erro na manutenção completa:', errorMessage);

      return {
        success: false,
        results: {
          cleanup: { success: false, deletedCount: 0 },
          consistency: { success: false, issues: [] },
          repair: { success: false, repaired: 0 }
        },
        error: errorMessage
      };
    }
  }

  /**
   * Obtém estatísticas do sistema de verificação
   */
  static async getSystemStats(): Promise<{
    success: boolean;
    stats: {
      totalUsers: number;
      verifiedUsers: number;
      pendingVerification: number;
      activeTokens: number;
      expiredTokens: number;
      verificationRate: number;
    };
    error?: string;
  }> {
    try {
      // Total de utilizadores
      const { count: totalUsers } = await supabase
        .from('User')
        .select('*', { count: 'exact', head: true });

      // Utilizadores verificados
      const { count: verifiedUsers } = await supabase
        .from('User')
        .select('*', { count: 'exact', head: true })
        .not('emailVerified', 'is', null);

      // Tokens ativos
      const { count: activeTokens } = await supabase
        .from('VerificationToken')
        .select('*', { count: 'exact', head: true })
        .gt('expires', new Date().toISOString());

      // Tokens expirados
      const { count: expiredTokens } = await supabase
        .from('VerificationToken')
        .select('*', { count: 'exact', head: true })
        .lt('expires', new Date().toISOString());

      const pendingVerification = (totalUsers || 0) - (verifiedUsers || 0);
      const verificationRate = totalUsers ? ((verifiedUsers || 0) / totalUsers) * 100 : 0;

      return {
        success: true,
        stats: {
          totalUsers: totalUsers || 0,
          verifiedUsers: verifiedUsers || 0,
          pendingVerification,
          activeTokens: activeTokens || 0,
          expiredTokens: expiredTokens || 0,
          verificationRate: Math.round(verificationRate * 100) / 100
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      return {
        success: false,
        stats: {
          totalUsers: 0,
          verifiedUsers: 0,
          pendingVerification: 0,
          activeTokens: 0,
          expiredTokens: 0,
          verificationRate: 0
        },
        error: errorMessage
      };
    }
  }
}