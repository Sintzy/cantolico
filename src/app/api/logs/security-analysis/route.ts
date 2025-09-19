import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { generateSecurityReport, getSecurityMetrics } from '@/lib/security-analysis-engine';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    
    if (!token || (token.role !== 'ADMIN' && token.role !== 'REVIEWER')) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar análises de segurança.' },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'full';

    switch (type) {
      case 'report':
        const insights = await generateSecurityReport();
        return NextResponse.json({
          success: true,
          data: insights,
          timestamp: new Date().toISOString()
        });

      case 'metrics':
        const metrics = await getSecurityMetrics();
        return NextResponse.json({
          success: true,
          data: metrics,
          timestamp: new Date().toISOString()
        });

      case 'threats':
        const allInsights = await generateSecurityReport();
        const threats = allInsights.filter(i => i.type === 'THREAT');
        return NextResponse.json({
          success: true,
          data: threats,
          count: threats.length,
          timestamp: new Date().toISOString()
        });

      case 'anomalies':
        const allAnomalies = await generateSecurityReport();
        const anomalies = allAnomalies.filter(i => i.type === 'ANOMALY');
        return NextResponse.json({
          success: true,
          data: anomalies,
          count: anomalies.length,
          timestamp: new Date().toISOString()
        });

      case 'recommendations':
        const allRecommendations = await generateSecurityReport();
        const recommendations = allRecommendations.filter(i => i.type === 'RECOMMENDATION');
        return NextResponse.json({
          success: true,
          data: recommendations,
          count: recommendations.length,
          timestamp: new Date().toISOString()
        });

      default:
        // Relatório completo
        const fullReport = await generateSecurityReport();
        const fullMetrics = await getSecurityMetrics();
        
        return NextResponse.json({
          success: true,
          data: {
            insights: fullReport,
            metrics: fullMetrics,
            summary: {
              total: fullReport.length,
              threats: fullReport.filter(i => i.type === 'THREAT').length,
              anomalies: fullReport.filter(i => i.type === 'ANOMALY').length,
              trends: fullReport.filter(i => i.type === 'TREND').length,
              recommendations: fullReport.filter(i => i.type === 'RECOMMENDATION').length,
              critical: fullReport.filter(i => i.severity >= 4).length,
              avgConfidence: Math.floor(fullReport.reduce((sum, i) => sum + i.confidence, 0) / fullReport.length) || 0
            }
          },
          timestamp: new Date().toISOString()
        });
    }

  } catch (error) {
    console.error('Erro na API de análise de segurança:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
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
        { error: 'Acesso negado. Apenas administradores podem executar análises.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'run-analysis':
        // Executar análise manual
        const insights = await generateSecurityReport();
        const metrics = await getSecurityMetrics();
        
        return NextResponse.json({
          success: true,
          message: 'Análise executada com sucesso',
          data: {
            insights,
            metrics,
            executedAt: new Date().toISOString(),
            executedBy: token.email
          }
        });

      case 'schedule-analysis':
        // Agendar análises automáticas (implementar com cron job)
        return NextResponse.json({
          success: true,
          message: 'Análise agendada com sucesso',
          data: {
            scheduled: true,
            frequency: body.frequency || 'daily',
            nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
        });

      default:
        return NextResponse.json(
          { error: 'Ação não reconhecida' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Erro no POST da API de análise:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}