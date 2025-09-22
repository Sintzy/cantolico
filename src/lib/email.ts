import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
}

// Template base moderno e profissional
function createModernEmailTemplate(
  title: string,
  content: string,
  actionButton?: { text: string; url: string; color?: string }
): string {
  const buttonHtml = actionButton ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${actionButton.url}" 
         style="display: inline-block; 
                padding: 14px 28px; 
                background-color: ${actionButton.color || '#FF595F'}; 
                color: white; 
                text-decoration: none; 
                border-radius: 6px; 
                font-weight: 600; 
                font-size: 16px; 
                border: none; 
                cursor: pointer;">
        ${actionButton.text}
      </a>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Cantólico</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #FF595F 0%, #FF414B 100%);
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            color: white;
            font-size: 28px;
            font-weight: 700;
        }
        .header .subtitle {
            margin: 8px 0 0 0;
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            font-weight: 400;
        }
        .content {
            padding: 40px 30px;
        }
        .content h2 {
            color: #2c3e50;
            font-size: 22px;
            margin: 0 0 20px 0;
            font-weight: 600;
        }
        .content p {
            margin: 0 0 16px 0;
            color: #555555;
            font-size: 16px;
            line-height: 1.6;
        }
        .details-box {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .details-box h3 {
            margin: 0 0 12px 0;
            color: #2c3e50;
            font-size: 18px;
            font-weight: 600;
        }
        .detail-item {
            margin: 8px 0;
            font-size: 14px;
        }
        .detail-label {
            font-weight: 600;
            color: #2c3e50;
            display: inline-block;
            min-width: 120px;
        }
        .detail-value {
            color: #555555;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        .footer p {
            margin: 0;
            color: #888888;
            font-size: 14px;
        }
        .logo {
            color: white;
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 4px;
        }
        @media only screen and (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            .header, .content, .footer {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Cantólico</div>
            <h1>${title}</h1>
            <p class="subtitle">Sistema de Gestão Musical</p>
        </div>
        <div class="content">
            ${content}
            ${buttonHtml}
        </div>
        <div class="footer">
            <p>Este email foi enviado automaticamente pelo sistema Cantólico.</p>
            <p>Por favor, não responda a este email.</p>
            <p>&copy; ${new Date().getFullYear()} Cantólico. Todos os direitos reservados.</p>
        </div>
    </div>
</body>
</html>
  `;
}

export async function sendEmail(template: EmailTemplate): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY não configurado. Email não será enviado.');
      return { success: false, error: 'Serviço de email não configurado' };
    }

    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'cantolico@cantolico.pt',
      to: template.to,
      subject: template.subject,
      html: template.html,
    });

    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

export function createRejectionEmailTemplate(
  userName: string,
  submissionTitle: string,
  rejectionReason: string,
  reviewerName?: string
): string {
  const content = `
    <h2>Submissão Não Aprovada</h2>
    <p>Olá <strong>${userName}</strong>,</p>
    <p>Infelizmente, a tua submissão musical não foi aprovada para publicação na plataforma Cantólico.</p>
    
    <div class="details-box">
      <h3>Detalhes da Submissão</h3>
      <div class="detail-item">
        <span class="detail-label">Título:</span>
        <span class="detail-value">${submissionTitle}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Motivo:</span>
        <span class="detail-value">${rejectionReason}</span>
      </div>
      ${reviewerName ? `
      <div class="detail-item">
        <span class="detail-label">Revisor:</span>
        <span class="detail-value">${reviewerName}</span>
      </div>
      ` : ''}
    </div>
    
    <p>Não desanimes! Podes submeter uma nova música ou corrigir a atual e tentar novamente. Consulta as nossas diretrizes de submissão para garantir que a próxima música cumpre todos os requisitos.</p>
  `;

  return createModernEmailTemplate(
    'Submissão Musical Rejeitada',
    content,
    {
      text: 'Submeter Nova Música',
      url: 'https://cantolico.pt/musics/create',
      color: '#FF595F'
    }
  );
}

export function createApprovalEmailTemplate(
  userName: string,
  submissionTitle: string,
  songId: string,
  reviewerName?: string
): string {
  const content = `
    <h2>Submissão Aprovada</h2>
    <p>Olá <strong>${userName}</strong>,</p>
    <p>Temos o prazer de informar que a tua submissão musical foi aprovada e já está disponível na plataforma Cantólico!</p>
    
    <div class="details-box">
      <h3>Detalhes da Submissão</h3>
      <div class="detail-item">
        <span class="detail-label">Título:</span>
        <span class="detail-value">${submissionTitle}</span>
      </div>
      ${reviewerName ? `
      <div class="detail-item">
        <span class="detail-label">Revisor:</span>
        <span class="detail-value">${reviewerName}</span>
      </div>
      ` : ''}
    </div>
    
    <p>A tua música foi aprovada e já pode ser acedida por todos os utilizadores da plataforma. Obrigado por contribuíres para a comunidade Cantólico!</p>
  `;

  return createModernEmailTemplate(
    'Submissão Musical Aprovada',
    content,
    {
      text: 'Ver Música Publicada',
      url: `https://cantolico.pt/musics/${songId}`,
      color: '#28a745'
    }
  );
}

export function createWarningEmailTemplate(
  userName: string,
  warningReason: string,
  adminName?: string
): string {
  const content = `
    <h2>Aviso Importante</h2>
    <p>Olá <strong>${userName}</strong>,</p>
    <p>Este email serve para te informar que foi emitido um aviso para a tua conta na plataforma Cantólico.</p>
    
    <div class="details-box">
      <h3>Detalhes do Aviso</h3>
      <div class="detail-item">
        <span class="detail-label">Motivo:</span>
        <span class="detail-value">${warningReason}</span>
      </div>
      ${adminName ? `
      <div class="detail-item">
        <span class="detail-label">Administrador:</span>
        <span class="detail-value">${adminName}</span>
      </div>
      ` : ''}
      <div class="detail-item">
        <span class="detail-label">Data:</span>
        <span class="detail-value">${new Date().toLocaleDateString('pt-PT')}</span>
      </div>
    </div>
    
    <p>Por favor, revê os termos de utilização da plataforma e certifica-te de que cumpres todas as regras para evitar futuras sanções.</p>
  `;

  return createModernEmailTemplate(
    'Aviso de Conduta',
    content,
    {
      text: 'Ler Termos de Utilização',
      url: 'https://cantolico.pt/terms',
      color: '#ffc107'
    }
  );
}

export function createSuspensionEmailTemplate(
  userName: string,
  suspensionReason: string,
  suspensionDuration: string,
  adminName?: string
): string {
  const content = `
    <h2>Conta Suspensa</h2>
    <p>Olá <strong>${userName}</strong>,</p>
    <p>Informamos que a tua conta foi temporariamente suspensa na plataforma Cantólico.</p>
    
    <div class="details-box">
      <h3>Detalhes da Suspensão</h3>
      <div class="detail-item">
        <span class="detail-label">Motivo:</span>
        <span class="detail-value">${suspensionReason}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Duração:</span>
        <span class="detail-value">${suspensionDuration}</span>
      </div>
      ${adminName ? `
      <div class="detail-item">
        <span class="detail-label">Administrador:</span>
        <span class="detail-value">${adminName}</span>
      </div>
      ` : ''}
      <div class="detail-item">
        <span class="detail-label">Data:</span>
        <span class="detail-value">${new Date().toLocaleDateString('pt-PT')}</span>
      </div>
    </div>
    
    <p>Durante este período, não poderás aceder à tua conta. Se considerares que esta suspensão foi injusta, podes contactar o suporte técnico.</p>
  `;

  return createModernEmailTemplate(
    'Conta Suspensa',
    content,
    {
      text: 'Contactar Suporte',
      url: 'mailto:suporte@cantolico.pt',
      color: '#dc3545'
    }
  );
}

export function createBanEmailTemplate(
  userName: string,
  banReason: string,
  adminName?: string
): string {
  const content = `
    <h2>Conta Banida</h2>
    <p>Olá <strong>${userName}</strong>,</p>
    <p>Informamos que a tua conta foi permanentemente banida da plataforma Cantólico.</p>
    
    <div class="details-box">
      <h3>Detalhes do Banimento</h3>
      <div class="detail-item">
        <span class="detail-label">Motivo:</span>
        <span class="detail-value">${banReason}</span>
      </div>
      ${adminName ? `
      <div class="detail-item">
        <span class="detail-label">Administrador:</span>
        <span class="detail-value">${adminName}</span>
      </div>
      ` : ''}
      <div class="detail-item">
        <span class="detail-label">Data:</span>
        <span class="detail-value">${new Date().toLocaleDateString('pt-PT')}</span>
      </div>
    </div>
    
    <p>Esta decisão é permanente e não poderás mais aceder à plataforma. Se considerares que este banimento foi injusto, podes contactar o suporte técnico.</p>
  `;

  return createModernEmailTemplate(
    'Conta Banida',
    content,
    {
      text: 'Contactar Suporte',
      url: 'mailto:suporte@cantolico.pt',
      color: '#dc3545'
    }
  );
}

export function createSecurityAlertTemplate(
  alertType: string,
  severity: number,
  description: string,
  details: any
): string {
  const severityText = severity === 5 ? 'EMERGÊNCIA' : severity >= 4 ? 'CRÍTICO' : severity >= 3 ? 'ALTO' : severity >= 2 ? 'MÉDIO' : 'BAIXO';
  const severityColor = severity === 5 ? '#dc3545' : severity >= 4 ? '#fd7e14' : severity >= 3 ? '#ffc107' : severity >= 2 ? '#17a2b8' : '#28a745';

  const content = `
    <h2>Alerta de Segurança</h2>
    <p>Foi detectado um evento de segurança que requer a tua atenção.</p>
    
    <div class="details-box">
      <h3>Detalhes do Alerta</h3>
      <div class="detail-item">
        <span class="detail-label">Tipo:</span>
        <span class="detail-value">${alertType}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Severidade:</span>
        <span class="detail-value" style="color: ${severityColor}; font-weight: 600;">${severityText}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Descrição:</span>
        <span class="detail-value">${description}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Data:</span>
        <span class="detail-value">${new Date().toLocaleString('pt-PT')}</span>
      </div>
      ${details.ip ? `
      <div class="detail-item">
        <span class="detail-label">IP:</span>
        <span class="detail-value">${details.ip}</span>
      </div>
      ` : ''}
      ${details.userAgent ? `
      <div class="detail-item">
        <span class="detail-label">User Agent:</span>
        <span class="detail-value">${details.userAgent}</span>
      </div>
      ` : ''}
    </div>
    
    <p>Este alerta foi gerado automaticamente pelo sistema de segurança. Se necessário, toma as medidas apropriadas para resolver esta situação.</p>
  `;

  return createModernEmailTemplate(
    'Alerta de Segurança',
    content,
    {
      text: 'Ver Logs de Segurança',
      url: 'https://cantolico.pt/logs/security-alerts',
      color: '#dc3545'
    }
  );
}

export function createAdminLoginAlertTemplate(
  userEmail: string,
  ip: string,
  userAgent: string,
  timestamp: Date,
  location?: string
): string {
  const content = `
    <h2>Login de Administrador Detectado</h2>
    <p>Foi detectado um login de administrador no sistema Cantólico.</p>
    
    <div class="details-box">
      <h3>Detalhes do Login</h3>
      <div class="detail-item">
        <span class="detail-label">Email:</span>
        <span class="detail-value">${userEmail}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Endereço IP:</span>
        <span class="detail-value">${ip}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Data/Hora:</span>
        <span class="detail-value">${timestamp.toLocaleString('pt-PT')}</span>
      </div>
      ${location ? `
      <div class="detail-item">
        <span class="detail-label">Localização:</span>
        <span class="detail-value">${location}</span>
      </div>
      ` : ''}
      <div class="detail-item">
        <span class="detail-label">Navegador:</span>
        <span class="detail-value">${userAgent}</span>
      </div>
    </div>
    
    <p>Se este login não foi autorizado, toma imediatamente as medidas necessárias para proteger o sistema.</p>
  `;

  return createModernEmailTemplate(
    'Login de Administrador',
    content,
    {
      text: 'Ver Dashboard Admin',
      url: 'https://cantolico.pt/admin',
      color: '#dc3545'
    }
  );
}

export function createWelcomeEmailTemplate(userName: string): string {
  const content = `
    <h2>Bem-vindo à Família Cantólico</h2>
    <p>Olá <strong>${userName}</strong>,</p>
    <p>É com grande prazer que te damos as boas-vindas à comunidade Cantólico! Agora fazes parte de uma plataforma dedicada à partilha e celebração da música.</p>
    
    <div class="details-box">
      <h3>O que podes fazer agora</h3>
      <div class="detail-item">• Explorar o vasto catálogo de músicas</div>
      <div class="detail-item">• Submeter as tuas próprias composições</div>
      <div class="detail-item">• Criar e partilhar playlists personalizadas</div>
      <div class="detail-item">• Interagir com outros membros da comunidade</div>
    </div>
    
    <p>Esperamos que tenhas uma excelente experiência na nossa plataforma. Se tiveres alguma dúvida, não hesites em contactar o nosso suporte.</p>
  `;

  return createModernEmailTemplate(
    'Bem-vindo ao Cantólico',
    content,
    {
      text: 'Explorar Plataforma',
      url: 'https://cantolico.pt/musics',
      color: '#28a745'
    }
  );
}

export function createLoginAlertEmailTemplate(
  userName: string,
  userEmail: string,
  ip: string,
  userAgent: string,
  location: string,
  timestamp: Date,
  isAdmin: boolean = false
): string {
  const title = isAdmin ? 'Login de Administrador' : 'Novo Login Detectado';
  const message = isAdmin ? 
    'Foi detectado um login de administrador no sistema Cantólico.' :
    `Olá ${userName}! Foi detectado um novo login na tua conta.`;

  const content = `
    <h2>${title}</h2>
    <p>${message}</p>
    
    <div class="details-box">
      <h3>Detalhes do Login</h3>
      <div class="detail-item">
        <span class="detail-label">Email:</span>
        <span class="detail-value">${userEmail}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Endereço IP:</span>
        <span class="detail-value">${ip}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Data/Hora:</span>
        <span class="detail-value">${timestamp.toLocaleString('pt-PT')}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Localização:</span>
        <span class="detail-value">${location}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Navegador:</span>
        <span class="detail-value">${userAgent}</span>
      </div>
    </div>
    
    <p>${isAdmin ? 
      'Se este login não foi autorizado, toma imediatamente as medidas necessárias para proteger o sistema.' :
      'Se não foste tu que fizeste este login, recomendamos que alterou a tua palavra-passe imediatamente.'
    }</p>
  `;

  return createModernEmailTemplate(
    title,
    content,
    {
      text: isAdmin ? 'Ver Dashboard Admin' : 'Alterar Palavra-passe',
      url: isAdmin ? 'https://cantolico.pt/admin' : 'https://cantolico.pt/users/profile',
      color: isAdmin ? '#dc3545' : '#ffc107'
    }
  );
}

export async function sendSecurityAlert(
  alertType: string,
  severity: number,
  description: string,
  details: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const securityEmail = process.env.SECURITY_EMAIL || 'sintzyy@gmail.com';
    
    const template: EmailTemplate = {
      to: securityEmail,
      subject: `[${severity === 5 ? 'EMERGÊNCIA' : severity >= 4 ? 'CRÍTICO' : 'ALERTA'}] ${alertType} - Cantólico`,
      html: createSecurityAlertTemplate(alertType, severity, description, details)
    };

    return await sendEmail(template);
  } catch (error) {
    console.error('Erro ao enviar alerta de segurança:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

export async function sendAdminLoginAlert(
  userEmail: string,
  ip: string,
  userAgent: string,
  location?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const securityEmail = process.env.SECURITY_EMAIL || 'sintzyy@gmail.com';
    
    // Importar função de segurança dinamicamente para evitar dependências circulares
    const { createSecurityAlert } = await import('@/lib/logging-middleware');
    
    // Criar log de segurança quando email é enviado
    await createSecurityAlert(
      'ADMIN_EMAIL_ALERT', 
      'Email de alerta de login admin enviado', 
      {
        adminEmail: userEmail,
        ip,
        userAgent,
        location,
        timestamp: new Date().toISOString(),
        alertRecipient: securityEmail,
        reason: 'Admin login detected - email notification sent'
      },
      4 // Severidade alta para login admin
    );
    
    const template: EmailTemplate = {
      to: securityEmail,
      subject: `Login de Administrador Detectado - ${userEmail}`,
      html: createAdminLoginAlertTemplate(userEmail, ip, userAgent, new Date(), location)
    };

    return await sendEmail(template);
  } catch (error) {
    console.error('Erro ao enviar alerta de login admin:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

export async function sendWelcomeEmail(
  userEmail: string,
  userName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const template: EmailTemplate = {
      to: userEmail,
      subject: 'Bem-vindo ao Cantólico - Começar a Explorar',
      html: createWelcomeEmailTemplate(userName)
    };

    return await sendEmail(template);
  } catch (error) {
    console.error('Erro ao enviar email de boas-vindas:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

export async function sendLoginAlert(
  userName: string,
  userEmail: string,
  ip: string,
  userAgent: string,
  location: string,
  isAdmin: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const template: EmailTemplate = {
      to: userEmail,
      subject: isAdmin ? 'Login de Administrador Detectado - Cantólico' : 'Novo Login na Tua Conta - Cantólico',
      html: createLoginAlertEmailTemplate(userName, userEmail, ip, userAgent, location, new Date(), isAdmin)
    };

    return await sendEmail(template);
  } catch (error) {
    console.error('Erro ao enviar alerta de login:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}