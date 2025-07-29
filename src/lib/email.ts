import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
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
  return `
    <!DOCTYPE html>
<html lang="pt">
  <head>
    <meta charset="UTF-8" />
    <title>Submissão Rejeitada - Cantólico</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          "Helvetica Neue", Arial, sans-serif;
        background-color: #f4f4f5;
        color: #111827;
        padding: 40px 20px;
        max-width: 640px;
        margin: 0 auto;
      }

      .card {
        background-color: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
        border: 1px solid #e5e7eb;
      }

      .card-header {
        background-color: #ef4444;
        color: #ffffff;
        padding: 24px;
        text-align: center;
      }

      .card-header h1 {
        font-size: 20px;
        margin: 0;
      }

      .card-header p {
        margin-top: 6px;
        font-size: 14px;
        opacity: 0.9;
      }

      .card-body {
        padding: 24px;
        background-color: #f9fafb;
        border-top: 1px solid #e5e7eb;
      }

      .submission-info {
        background-color: #ffffff;
        padding: 16px;
        border-left: 4px solid #ef4444;
        margin: 24px 0;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }

      .submission-info h3 {
        margin: 0 0 8px;
        font-size: 16px;
        font-weight: 600;
      }

      .submission-info p {
        margin: 4px 0;
        font-size: 14px;
      }

      .reason-box {
        background-color: #fef2f2;
        border: 1px solid #fecaca;
        padding: 16px;
        border-radius: 8px;
        margin: 24px 0;
      }

      .reason-box h3 {
        margin-top: 0;
        font-size: 16px;
        color: #991b1b;
      }

      .reason-box p {
        font-size: 14px;
        margin: 8px 0 0;
      }

      .action-buttons {
        text-align: center;
        margin: 32px 0 24px;
      }

      .btn {
        display: inline-block;
        background-color: #2563eb;
        color: #ffffff;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        text-decoration: none;
        margin: 0 10px;
        transition: background-color 0.2s ease-in-out;
      }

      .btn:hover {
        background-color: #1d4ed8;
      }

      .footer {
        text-align: center;
        font-size: 12px;
        color: #6b7280;
        margin-top: 40px;
      }

      .footer a {
        color: #2563eb;
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="card-header">
        <h1>Submissão Rejeitada</h1>
        <p>Cantólico — Cancioneiro Digital</p>
      </div>

      <div class="card-body">
        <p>Olá <strong>${userName}</strong>,</p>
        <p>
          Infelizmente, a tua submissão foi rejeitada pela nossa equipa de
          revisão.
        </p>

        <div class="submission-info">
          <h3>Detalhes da Submissão:</h3>
          <p><strong>Título:</strong> ${submissionTitle}</p>
          ${reviewerName ? `<p><strong>Revisado por:</strong> ${reviewerName}</p>` : ''}
        </div>

        <div class="reason-box">
          <h3>Motivo da Rejeição:</h3>
          <p>${rejectionReason}</p>
        </div>

        <p>
          Não desanimes! Podes fazer as correções necessárias e submeter
          novamente a tua música. A nossa equipa está sempre disponível para te
          ajudar a melhorar as tuas submissões.
        </p>

        <div class="action-buttons">
          <a
            href="${process.env.NEXT_PUBLIC_APP_URL || 'https://cantolico.pt'}/musics/create"
            class="btn"
          >
            Nova Submissão
          </a>
          <a
            href="${process.env.NEXT_PUBLIC_APP_URL || 'https://cantolico.pt'}/guide"
            class="btn"
          >
            Guia de Submissão
          </a>
        </div>

        <p>
          Se tiveres alguma dúvida sobre este feedback, não hesites em
          contactar-nos.
        </p>

        <p>
          Obrigado pela tua contribuição para o Cantólico!<br />
          Com os melhores cumprimentos,<br />
          <strong>Equipa Cantólico</strong>
        </p>
      </div>
    </div>

    <div class="footer">
      <p>Este email foi enviado automaticamente pelo sistema Cantólico.</p>
      <p>
        Para mais informações, visita
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://cantolico.pt'}"
          >cantolico.pt</a
        >
      </p>
    </div>
  </body>
</html>
  `;
}

export function createApprovalEmailTemplate(
  userName: string,
  submissionTitle: string,
  songId: string,
  reviewerName?: string
): string {
  return `
    <!DOCTYPE html>
<html lang="pt">
  <head>
    <meta charset="UTF-8" />
    <title>Submissão Aprovada - Cantólico</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          "Helvetica Neue", Arial, sans-serif;
        background-color: #f4f4f5;
        color: #111827;
        padding: 40px 20px;
        max-width: 640px;
        margin: 0 auto;
      }

      .card {
        background-color: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
        border: 1px solid #e5e7eb;
      }

      .card-header {
        background-color: #16a34a;
        color: #ffffff;
        padding: 24px;
        text-align: center;
      }

      .card-header h1 {
        font-size: 20px;
        margin: 0;
      }

      .card-header p {
        margin-top: 6px;
        font-size: 14px;
        opacity: 0.9;
      }

      .card-body {
        padding: 24px;
        background-color: #f9fafb;
        border-top: 1px solid #e5e7eb;
      }

      .submission-info {
        background-color: #ffffff;
        padding: 16px;
        border-left: 4px solid #16a34a;
        margin: 24px 0;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }

      .submission-info h3 {
        margin: 0 0 8px;
        font-size: 16px;
        font-weight: 600;
      }

      .submission-info p {
        margin: 4px 0;
        font-size: 14px;
      }

      .action-buttons {
        text-align: center;
        margin: 32px 0 24px;
      }

      .btn {
        display: inline-block;
        background-color: #16a34a;
        color: #ffffff;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        text-decoration: none;
        margin: 0 10px;
        transition: background-color 0.2s ease-in-out;
      }

      .btn:hover {
        background-color: #15803d;
      }

      .footer {
        text-align: center;
        font-size: 12px;
        color: #6b7280;
        margin-top: 40px;
      }

      .footer a {
        color: #2563eb;
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="card-header">
        <h1>🎉 Submissão Aprovada!</h1>
        <p>Cantólico — Cancioneiro Digital</p>
      </div>

      <div class="card-body">
        <p>Parabéns <strong>${userName}</strong>!</p>
        <p>
          A tua submissão foi aprovada e já está disponível no Cantólico!
        </p>

        <div class="submission-info">
          <h3>Detalhes da Submissão:</h3>
          <p><strong>Título:</strong> ${submissionTitle}</p>
          ${reviewerName ? `<p><strong>Aprovado por:</strong> ${reviewerName}</p>` : ''}
        </div>

        <p>
          A tua música já pode ser vista e utilizada por toda a comunidade do
          Cantólico. Obrigado pela tua valiosa contribuição!
        </p>

        <div class="action-buttons">
          <a
            href="${process.env.NEXT_PUBLIC_APP_URL || 'https://cantolico.pt'}/musics/${songId}"
            class="btn"
          >
            Ver Música
          </a>
          <a
            href="${process.env.NEXT_PUBLIC_APP_URL || 'https://cantolico.pt'}/musics/create"
            class="btn"
          >
            Submeter Outra
          </a>
        </div>

        <p>Continua a partilhar a tua paixão pela música litúrgica connosco!</p>

        <p>
          Com os melhores cumprimentos,<br />
          <strong>Equipa Cantólico</strong>
        </p>
      </div>
    </div>

    <div class="footer">
      <p>Este email foi enviado automaticamente pelo sistema Cantólico.</p>
      <p>
        Para mais informações, visita
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://cantolico.pt'}"
          >cantolico.pt</a
        >
      </p>
    </div>
  </body>
</html>

  `;
}
