import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { supabase } from '@/lib/supabase-client';

// ================================================
// API PARA ENVIO DE EMAILS DE SEGURANÇA
// ================================================

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { to, subject, alert, logId } = await req.json();

    // Validações básicas
    if (!to || !subject || !alert) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios em falta' },
        { status: 400 }
      );
    }

    // Preparar HTML do email
    const emailHtml = generateSecurityEmailHtml(alert, session);

    // Enviar email usando a lib existente
    const emailResult = await sendEmail({
      to,
      subject,
      html: emailHtml
    });

    // Atualizar alerta se logId fornecido
    if (logId) {
      // Atualizar o log correspondente para marcar email enviado
      await supabase
        .from('logs')
        .update({ email_sent: true, email_sent_at: new Date().toISOString(), email_recipients: [to] })
        .eq('id', logId)
        .contains('tags', ['security']);
    }

    // Log do envio
    await supabase.from('logs').insert([{
      level: 'INFO',
      category: 'EMAIL',
      message: `Email de segurança enviado para ${to}`,
      details: {
        subject,
        alertType: alert.alertType,
        severity: alert.severity,
        emailResult
      },
      user_id: session?.user?.id,
      user_email: session?.user?.email
    }]);

    return NextResponse.json({
      success: true,
      emailResult
    });

  } catch (error) {
    console.error('Erro ao enviar email de segurança:', error);
    
    // Log do erro
    await supabase.from('logs').insert([{
      level: 'ERROR',
      category: 'EMAIL',
      message: 'Falha no envio de email de segurança',
      details: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    }]);

    return NextResponse.json(
      { error: 'Erro ao enviar email de segurança' },
      { status: 500 }
    );
  }
}

// ================================================
// FUNÇÕES PARA GERAR CONTEÚDO DO EMAIL
// ================================================

function generateSecurityEmailHtml(alert: any, session: any) {
  const timestamp = new Date().toLocaleString('pt-PT');
  
  return `
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚨 Alerta de Segurança - Cantolico</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #dc3545;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .alert-title {
            color: #dc3545;
            font-size: 24px;
            font-weight: bold;
            margin: 0;
        }
        .severity {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 12px;
            margin: 15px 0;
        }
        .severity-1, .severity-2 { background: #d4edda; color: #155724; }
        .severity-3 { background: #fff3cd; color: #856404; }
        .severity-4 { background: #f8d7da; color: #721c24; }
        .severity-5 { background: #721c24; color: white; }
        .details {
            background: #f8f9fa;
            border-left: 4px solid #dc3545;
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 5px 5px 0;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
        }
        .info-item {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 5px;
            border: 1px solid #e9ecef;
        }
        .info-label {
            font-weight: bold;
            color: #6c757d;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .info-value {
            color: #333;
            font-size: 14px;
        }
        .actions {
            background: #e7f3ff;
            border: 1px solid #b8daff;
            border-radius: 5px;
            padding: 20px;
            margin: 25px 0;
        }
        .actions h4 {
            color: #004085;
            margin-top: 0;
        }
        .actions ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .actions li {
            margin: 8px 0;
        }
        .footer {
            text-align: center;
            border-top: 1px solid #e9ecef;
            padding-top: 20px;
            margin-top: 30px;
            color: #6c757d;
            font-size: 12px;
        }
        .timestamp {
            background: #495057;
            color: white;
            padding: 10px;
            border-radius: 5px;
            text-align: center;
            font-family: monospace;
            margin: 20px 0;
        }
        @media (max-width: 480px) {
            .info-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎵 Cantolico</div>
            <h1 class="alert-title">🚨 ALERTA DE SEGURANÇA</h1>
            <div class="severity severity-${alert.severity}">
                Severidade: ${getSeverityText(alert.severity)}
            </div>
        </div>

        <div class="details">
            <h3>${alert.title}</h3>
            <p>${alert.description}</p>
        </div>

        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Tipo de Alerta</div>
                <div class="info-value">${alert.alertType}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Timestamp</div>
                <div class="info-value">${timestamp}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Utilizador</div>
                <div class="info-value">${session?.user?.email || 'Sistema'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">IP Address</div>
                <div class="info-value">${alert.details?.ip || 'N/A'}</div>
            </div>
        </div>

        ${alert.details ? `
        <div class="details">
            <h4>Detalhes Técnicos:</h4>
            <pre style="background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px;">${JSON.stringify(alert.details, null, 2)}</pre>
        </div>
        ` : ''}

        <div class="actions">
            <h4>🔧 Ações Recomendadas:</h4>
            <ul>
                ${getRecommendedActions(alert.alertType).map(action => `<li>${action}</li>`).join('')}
            </ul>
        </div>

        <div class="timestamp">
            📅 Alerta gerado em: ${timestamp}
        </div>

        <div class="footer">
            <p><strong>Sistema de Logs Cantolico</strong></p>
            <p>Este é um email automático do sistema de segurança.</p>
            <p>Para mais informações, acesse: <a href="https://cantolico.pt/logs">cantolico.pt/logs</a></p>
            <p>© ${new Date().getFullYear()} Cantolico - Todos os direitos reservados</p>
        </div>
    </div>
</body>
</html>
  `;
}

function generateSecurityEmailText(alert: any) {
  return `
🚨 ALERTA DE SEGURANÇA - CANTOLICO

Tipo: ${alert.alertType}
Severidade: ${getSeverityText(alert.severity)}
Título: ${alert.title}
Descrição: ${alert.description}

Timestamp: ${new Date().toLocaleString('pt-PT')}

Detalhes: ${alert.details ? JSON.stringify(alert.details, null, 2) : 'N/A'}

Acesse https://cantolico.pt/logs para mais informações.

---
Este é um email automático do sistema de segurança Cantolico.
  `;
}

function getSeverityText(severity: number): string {
  const severityMap = {
    1: 'Baixa',
    2: 'Média',
    3: 'Alta',
    4: 'Crítica',
    5: 'Emergência'
  };
  return severityMap[severity as keyof typeof severityMap] || 'Desconhecida';
}

function getRecommendedActions(alertType: string): string[] {
  const actionsMap: Record<string, string[]> = {
    'ADMIN_LOGIN': [
      'Verificar se o login foi autorizado',
      'Confirmar a identidade do utilizador',
      'Verificar atividades recentes do admin',
      'Considerar ativar 2FA se não estiver ativo'
    ],
    'MULTIPLE_FAILED_LOGINS': [
      'Verificar tentativas de acesso não autorizadas',
      'Considerar bloquear temporariamente o IP',
      'Notificar o utilizador se for conta conhecida',
      'Revisar logs de segurança para padrões suspeitos'
    ],
    'SUSPICIOUS_IP': [
      'Investigar origem do IP suspeito',
      'Verificar geolocalização do acesso',
      'Considerar adicionar IP à lista de bloqueio',
      'Monitorar atividades futuras deste IP'
    ],
    'DATA_BREACH_ATTEMPT': [
      '🚨 AÇÃO IMEDIATA REQUERIDA',
      'Investigar tentativa de violação de dados',
      'Verificar integridade dos dados',
      'Considerar resetar senhas de contas sensíveis',
      'Notificar autoridades se necessário'
    ],
    'SYSTEM_ERROR': [
      'Verificar logs detalhados do sistema',
      'Monitorar performance e disponibilidade',
      'Considerar reiniciar serviços se necessário',
      'Verificar integridade da base de dados'
    ]
  };

  return actionsMap[alertType] || [
    'Revisar logs detalhados do sistema',
    'Investigar causa raiz do alerta',
    'Tomar medidas preventivas adequadas',
    'Monitorar situação de perto'
  ];
}