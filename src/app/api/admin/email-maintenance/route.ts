import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { EmailVerificationMaintenanceService } from "@/lib/email-verification-maintenance";

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação de admin
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      console.warn(`⚠️  [EMAIL MAINTENANCE] Unauthorized access attempt by: ${session?.user?.email || 'unknown'}`);
      
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem executar manutenção.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'full';

    console.log(`🔧 [EMAIL MAINTENANCE] Running ${action} maintenance by admin: ${session.user.email}`);

    let result;

    switch (action) {
      case 'cleanup':
        result = await EmailVerificationMaintenanceService.cleanupExpiredTokens();
        break;
        
      case 'check':
        result = await EmailVerificationMaintenanceService.checkDataConsistency();
        break;
        
      case 'repair':
        result = await EmailVerificationMaintenanceService.repairConsistencyIssues();
        break;
        
      case 'stats':
        result = await EmailVerificationMaintenanceService.getSystemStats();
        break;
        
      case 'full':
      default:
        result = await EmailVerificationMaintenanceService.runFullMaintenance();
        break;
    }

    console.log(`✅ [EMAIL MAINTENANCE] ${action} completed successfully by admin: ${session.user.email}`);

    return NextResponse.json({
      success: result.success,
      action,
      result,
      message: result.success ? 
        `Manutenção '${action}' executada com sucesso` : 
        `Erro na manutenção '${action}': ${result.error}`
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ [EMAIL MAINTENANCE] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno na manutenção',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação de admin
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    // Apenas estatísticas para GET
    const result = await EmailVerificationMaintenanceService.getSystemStats();

    return NextResponse.json({
      success: result.success,
      stats: result.stats,
      error: result.error
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao obter estatísticas',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}