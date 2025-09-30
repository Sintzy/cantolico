import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { EmailVerificationMaintenanceService } from "@/lib/email-verification-maintenance";
import { logGeneral, logErrors } from "@/lib/logs";

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação de admin
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      await logErrors('WARN', 'Acesso negado à manutenção', 'Tentativa de acesso não autorizado', {
        userId: session?.user?.id || 'unknown',
        ip: req.headers.get('x-forwarded-for') || 'unknown',
        action: 'email_maintenance_unauthorized'
      });
      
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem executar manutenção.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'full';

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

    await logGeneral('INFO', 'Manutenção de email executada', `Ação: ${action}`, {
      adminId: session.user.id,
      action: `email_maintenance_${action}`,
      success: result.success,
      timestamp: new Date().toISOString()
    });

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
    
    await logErrors('ERROR', 'Erro na API de manutenção', 'Falha na execução da manutenção', {
      error: errorMessage,
      action: 'email_maintenance_api_error',
      stack: error instanceof Error ? error.stack : undefined
    });

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