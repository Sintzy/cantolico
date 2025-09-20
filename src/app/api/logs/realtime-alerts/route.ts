import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { alertSystem } from '@/lib/realtime-alerts';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    
    if (!token || (token.role !== 'ADMIN' && token.role !== 'REVIEWER')) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'active-alerts':
        return NextResponse.json({
          success: true,
          data: alertSystem.getActiveAlerts()
        });

      case 'stats':
        return NextResponse.json({
          success: true,
          data: alertSystem.getAlertStats()
        });

      case 'security-alerts':
        return NextResponse.json({
          success: true,
          data: alertSystem.getAlertsByType('SECURITY')
        });

      case 'performance-alerts':
        return NextResponse.json({
          success: true,
          data: alertSystem.getAlertsByType('PERFORMANCE')
        });

      default:
        return NextResponse.json({
          success: true,
          data: {
            activeAlerts: alertSystem.getActiveAlerts(),
            stats: alertSystem.getAlertStats()
          }
        });
    }

  } catch (error) {
    console.error('Erro na API de alertas em tempo real:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });
    
    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, alertId } = body;

    switch (action) {
      case 'resolve':
        if (!alertId) {
          return NextResponse.json(
            { error: 'ID do alerta é obrigatório' },
            { status: 400 }
          );
        }
        
        alertSystem.resolveAlert(alertId);
        
        return NextResponse.json({
          success: true,
          message: 'Alerta resolvido com sucesso'
        });

      case 'test-alert':
        // Para testar o sistema
        await alertSystem.processEvent({
          type: 'admin_login',
          email: 'test@example.com',
          timestamp: new Date()
        });
        
        return NextResponse.json({
          success: true,
          message: 'Alerta de teste criado'
        });

      default:
        return NextResponse.json(
          { error: 'Ação não reconhecida' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Erro no POST da API de alertas:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}