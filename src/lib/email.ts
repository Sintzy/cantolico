import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
}

// Função auxiliar para criar caixas de detalhes no estilo Tabular
function createDetailsBox(title: string, details: Array<{label: string, value: string}>): string {
  const detailsRows = details.map(detail => `
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
      <tr><td style="width:600px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
        <tr><td><p style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;"><span style="margin:0;Margin:0;font-weight:bold;mso-line-height-rule:exactly;">${detail.label}:</span> ${detail.value}</p></td></tr>
        </table>
      </td></tr></table>
    </td></tr>
    <tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:4px;line-height:4px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
  `).join('');

  return `
    <tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:4px;line-height:4px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
      <tr><td style="width:800px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
        <tr><td style="padding:30px 0 10px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;">
          <tr><td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
            <tr><td style="width:800px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
              <tr><td style="border:1px solid #E3E3E3;overflow:hidden;padding:30px 30px 30px 30px;border-radius:6px 6px 0 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;">
                <tr><td align="center">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
                  <tr><td style="width:600px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
                    <tr><td><p style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;"><span style="margin:0;Margin:0;font-weight:bold;mso-line-height-rule:exactly;">${title}</span></p></td></tr>
                    </table>
                  </td></tr></table>
                </td></tr></table>
              </td></tr></table>
            </td></tr></table>
          </td></tr>
          <tr><td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
            <tr><td style="width:800px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
              <tr><td style="border:1px solid #E3E3E3;padding:30px 30px 30px 30px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;">
                ${detailsRows}
                </table>
              </td></tr></table>
            </td></tr></table>
          </td></tr>
          </table>
        </td></tr></table>
      </td></tr></table>
    </td></tr>`;
}

// Função auxiliar para criar lista de itens simples
function createSimpleList(items: string[]): string {
  return items.map(item => `<p style="margin:4px 0;Margin:4px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">• ${item}</p>`).join('');
}

// Template base moderno e profissional baseado no design Tabular
function createModernEmailTemplate(
  title: string,
  content: string,
  actionButton?: { text: string; url: string; color?: string },
  secondButton?: { text: string; url: string; color?: string }
): string {
  // Gerar botões baseado nos parâmetros
  let buttonsHtml = '';
  
  if (actionButton && secondButton) {
    // Dois botões lado a lado
    buttonsHtml = `
      <tr><td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td style="width:600px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td>
            <div style="width:100%;text-align:center;"><div style="display:inline-block;">
              <table role="presentation" cellpadding="0" cellspacing="0" align="center" valign="middle">
                <tr><td></td><td valign="middle">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:auto;">
                    <tr><td style="width:30px;" width="30"></td>
                    <td style="overflow:hidden;background-color:${actionButton.color || '#FF595F'};text-align:center;line-height:24px;mso-line-height-rule:exactly;mso-text-raise:2px;padding:18px 14px 18px 14px;border-radius:6px 6px 6px 6px;">
                      <a href="${actionButton.url}" style="display:block;margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:24px;font-weight:700;font-style:normal;font-size:16px;text-decoration:none;direction:ltr;color:#FFFFFF;text-align:center;mso-line-height-rule:exactly;mso-text-raise:2px;" target="_blank">${actionButton.text}</a>
                    </td><td style="width:30px;" width="30"></td></tr>
                  </table>
                </td><td valign="middle">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:auto;">
                    <tr><td style="width:30px;" width="30"></td>
                    <td style="overflow:hidden;background-color:${secondButton.color || '#FF595F'};text-align:center;line-height:24px;mso-line-height-rule:exactly;mso-text-raise:2px;padding:18px 14px 18px 14px;border-radius:6px 6px 6px 6px;">
                      <a href="${secondButton.url}" style="display:block;margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:24px;font-weight:700;font-style:normal;font-size:16px;text-decoration:none;direction:ltr;color:#FFFFFF;text-align:center;mso-line-height-rule:exactly;mso-text-raise:2px;" target="_blank">${secondButton.text}</a>
                    </td><td style="width:30px;" width="30"></td></tr>
                  </table>
                </td><td></td></tr>
              </table>
            </div></div>
          </td></tr></table>
        </td></tr></table>
      </td></tr>`;
  } else if (actionButton) {
    // Um botão apenas
    buttonsHtml = `
      <tr><td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td style="width:600px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td>
            <div style="width:100%;text-align:center;"><div style="display:inline-block;">
              <table role="presentation" cellpadding="0" cellspacing="0" align="center" valign="middle">
                <tr><td></td><td valign="middle">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:auto;">
                    <tr><td style="width:30px;" width="30"></td>
                    <td style="overflow:hidden;background-color:${actionButton.color || '#FF595F'};text-align:center;line-height:24px;mso-line-height-rule:exactly;mso-text-raise:2px;padding:18px 14px 18px 14px;border-radius:6px 6px 6px 6px;">
                      <a href="${actionButton.url}" style="display:block;margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:24px;font-weight:700;font-style:normal;font-size:16px;text-decoration:none;direction:ltr;color:#FFFFFF;text-align:center;mso-line-height-rule:exactly;mso-text-raise:2px;" target="_blank">${actionButton.text}</a>
                    </td><td style="width:30px;" width="30"></td></tr>
                  </table>
                </td><td></td></tr>
              </table>
            </div></div>
          </td></tr></table>
        </td></tr></table>
      </td></tr>`;
  }

  return `<!--
* Template baseado em Tabular Email Builder
* Para mais informações, visite https://tabular.email
-->
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="pt">
<head>
<title>${title} - Cantólico</title>
<meta charset="UTF-8" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<!--[if !mso]>-->
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<!--<![endif]-->
<meta name="x-apple-disable-message-reformatting" content="" />
<meta content="target-densitydpi=device-dpi" name="viewport" />
<meta content="true" name="HandheldFriendly" />
<meta content="width=device-width" name="viewport" />
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no" />
<style type="text/css">
table {
border-collapse: separate;
table-layout: fixed;
mso-table-lspace: 0pt;
mso-table-rspace: 0pt
}
table td {
border-collapse: collapse
}
.ExternalClass {
width: 100%
}
.ExternalClass,
.ExternalClass p,
.ExternalClass span,
.ExternalClass font,
.ExternalClass td,
.ExternalClass div {
line-height: 100%
}
body, a, li, p, h1, h2, h3 {
-ms-text-size-adjust: 100%;
-webkit-text-size-adjust: 100%;
}
html {
-webkit-text-size-adjust: none !important
}
body {
min-width: 100%;
Margin: 0px;
padding: 0px;
}
body, #innerTable {
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale
}
#innerTable img+div {
display: none;
display: none !important
}
img {
Margin: 0;
padding: 0;
-ms-interpolation-mode: bicubic
}
h1, h2, h3, p, a {
line-height: inherit;
overflow-wrap: normal;
white-space: normal;
word-break: break-word
}
a {
text-decoration: none
}
h1, h2, h3, p {
min-width: 100%!important;
width: 100%!important;
max-width: 100%!important;
display: inline-block!important;
border: 0;
padding: 0;
margin: 0
}
a[x-apple-data-detectors] {
color: inherit !important;
text-decoration: none !important;
font-size: inherit !important;
font-family: inherit !important;
font-weight: inherit !important;
line-height: inherit !important
}
u + #body a {
color: inherit;
text-decoration: none;
font-size: inherit;
font-family: inherit;
font-weight: inherit;
line-height: inherit;
}
a[href^="mailto"],
a[href^="tel"],
a[href^="sms"] {
color: inherit;
text-decoration: none
}
</style>
<style type="text/css">
@media (min-width: 481px) {
.hd { display: none!important }
}
</style>
<style type="text/css">
@media (max-width: 480px) {
.hm { display: none!important }
}
</style>
<style type="text/css">
@media (max-width: 480px) {
.t80,.t81{display:block!important}.t68,.t80,.t83{text-align:center!important}.t61,.t67,.t79{vertical-align:middle!important}.t101{padding-left:30px!important;padding-right:30px!important}.t79{display:inline-block!important;width:100%!important;max-width:800px!important}.t57,.t59,.t63,.t65{display:revert!important}.t61,.t67{width:auto!important;max-width:100%!important}
}
</style>
<!--[if !mso]>-->
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&amp;family=Roboto:wght@400&amp;display=swap" rel="stylesheet" type="text/css" />
<!--<![endif]-->
<!--[if mso]>
<xml>
<o:OfficeDocumentSettings>
<o:AllowPNG/>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
<![endif]-->
</head>
<body id="body" style="min-width:100%;Margin:0px;padding:0px;background-color:#FAFAFA;">
<div style="background-color:#FAFAFA;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center">
<tr><td style="font-size:0;line-height:0;mso-line-height-rule:exactly;background-color:#FAFAFA;" valign="top" align="center">
<!--[if mso]>
<v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false">
<v:fill color="#FAFAFA"/>
</v:background>
<![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" id="innerTable">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td width="630" style="width:630px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td style="background-color:#FFFFFF;padding:40px 60px 40px 60px;" class="t101">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;">
<tr><td align="left">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-right:auto;">
<tr><td width="40" style="width:40px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td><div style="font-size:0px;"><img style="display:block;border:0;height:auto;width:100%;Margin:0;max-width:100%;" width="40" height="40" alt="Cantólico" src="https://cantolico.pt/cantolicoemail.png"/></div></td></tr>
</table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:40px;line-height:40px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td style="width:877px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td><h1 style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:34px;font-weight:700;font-style:normal;font-size:29px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">${title}</h1></td></tr>
</table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:11px;line-height:11px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td><div style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">${content}</div></td></tr>
</table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:40px;line-height:40px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td style="width:800px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td style="border-bottom:2px solid #EEEEEE;border-top:2px solid #EEEEEE;padding:25px 0 25px 0;">
<div style="width:100%;text-align:left;"><div style="display:inline-block;">
<table role="presentation" cellpadding="0" cellspacing="0" align="left" valign="middle">
<tr><td></td><td width="510" valign="middle">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td style="width:600px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td><p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Se precisares de assistência ou tiveres alguma questão, não hesites em contactar a nossa equipa de apoio.</p></td></tr>
</table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:41px;line-height:41px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
${buttonsHtml}
</table></td></tr></table>
</td><td></td></tr>
</table></div></div>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:40px;line-height:40px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td><p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:13px;text-decoration:none;text-transform:none;direction:ltr;color:#949494;text-align:left;mso-line-height-rule:exactly;mso-text-raise:3px;">Enviado automaticamente pelo sistema interno do Cantólico</p></td></tr>
</table>
</td></tr></table>
</td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td><p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:13px;text-decoration:none;text-transform:none;direction:ltr;color:#949494;text-align:left;mso-line-height-rule:exactly;mso-text-raise:3px;">Por favor não respondas a este email.</p></td></tr>
</table>
</td></tr></table>
</td></tr>
</table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</div>
<div class="gmail-fix" style="display: none; white-space: nowrap; font: 15px courier; line-height: 0;">&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;</div>
</body>
</html>`;
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
  const reviewerInfo = reviewerName ? [
    {label: 'Revisor Responsável', value: reviewerName}
  ] : [];

  const content = `
    <p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Olá <strong>${userName}</strong>,</p>
    <p style="margin:8px 0;Margin:8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Infelizmente, a tua submissão musical não foi aprovada para publicação na plataforma Cantólico após uma revisão cuidadosa.</p>
    
    ${createDetailsBox('Detalhes da Submissão', [
      {label: 'Título da Música', value: submissionTitle},
      {label: 'Motivo da Rejeição', value: rejectionReason},
      {label: 'Data da Revisão', value: new Date().toLocaleString('pt-PT')},
      ...reviewerInfo
    ])}
    
    <p style="margin:20px 0 8px 0;Margin:20px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:600;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">💪 Não desanimes! Esta rejeição é uma oportunidade de melhoramento.</p>
    
    <p style="margin:16px 0 8px 0;Margin:16px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Próximos Passos:</p>
    ${createSimpleList([
      'Consulta as diretrizes de submissão atualizadas',
      'Corrige os pontos mencionados na rejeição',
      'Submete uma nova versão melhorada',
      'Contacta a equipa se tiveres dúvidas'
    ])}
    
    <p style="margin:16px 0 8px 0;Margin:16px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">A qualidade da nossa plataforma depende do empenho de todos. Estamos aqui para te ajudar a criar conteúdo que inspire a comunidade Cantólico!</p>
  `;

  return createModernEmailTemplate(
    '❌ Submissão Musical Rejeitada',
    content,
    {
      text: 'Submeter Nova Música',
      url: 'https://cantolico.pt/musics/create',
      color: '#dc3545'
    },
    {
      text: 'Ver Diretrizes',
      url: 'https://cantolico.pt/guide',
      color: '#6c757d'
    }
  );
}

export function createApprovalEmailTemplate(
  userName: string,
  submissionTitle: string,
  songId: string,
  reviewerName?: string
): string {
  const reviewerInfo = reviewerName ? [
    {label: 'Revisor Responsável', value: reviewerName}
  ] : [];

  const content = `
    <p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Olá <strong>${userName}</strong>,</p>
    <p style="margin:8px 0;Margin:8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Temos o imenso prazer de informar que a tua submissão musical foi aprovada após uma revisão rigorosa e já está disponível para toda a comunidade Cantólico!</p>
    
    ${createDetailsBox('Detalhes da Submissão Aprovada', [
      {label: 'Título da Música', value: submissionTitle},
      {label: 'ID da Música', value: songId},
      {label: 'Data de Aprovação', value: new Date().toLocaleString('pt-PT')},
      ...reviewerInfo
    ])}
    
    <p style="margin:20px 0 8px 0;Margin:20px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:600;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">🎉 Parabéns! A tua contribuição musical enriquece a nossa plataforma e inspira outros membros da comunidade.</p>
    
    <p style="margin:16px 0 8px 0;Margin:16px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">O que acontece agora:</p>
    ${createSimpleList([
      'A música está disponível publicamente na plataforma',
      'Outros utilizadores podem aceder e apreciar o teu trabalho',
      'Podes partilhar o link da música nas redes sociais',
      'Continua a submeter mais músicas para crescer o teu catálogo'
    ])}
    
    <p style="margin:16px 0 8px 0;Margin:16px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Obrigado por contribuíres para a comunidade Cantólico e por partilhares o teu talento musical connosco!</p>
  `;

  return createModernEmailTemplate(
    '🎉 Submissão Musical Aprovada',
    content,
    {
      text: 'Ver Música Publicada',
      url: `https://cantolico.pt/musics/${songId}`,
      color: '#28a745'
    },
    {
      text: 'Submeter Nova Música',
      url: 'https://cantolico.pt/musics/create',
      color: '#17a2b8'
    }
  );
}

export function createPasswordResetEmailTemplate(
  userName: string,
  resetToken: string,
  expirationTime: string = '24 horas'
): string {
  const resetUrl = `https://cantolico.pt/auth/reset-password?token=${resetToken}`;
  
  const content = `
    <p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Olá <strong>${userName}</strong>,</p>
    <p style="margin:8px 0;Margin:8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Recebemos um pedido para redefinir a palavra-passe da tua conta Cantólico. Se não fizeste este pedido, podes ignorar este email em segurança.</p>
    
    ${createDetailsBox('Informações da Recuperação', [
      {label: 'Conta', value: userName},
      {label: 'Data do Pedido', value: new Date().toLocaleString('pt-PT')},
      {label: 'Validade do Link', value: expirationTime}
    ])}
    
    <p style="margin:20px 0 8px 0;Margin:20px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:600;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">⚠️ Instruções de Segurança:</p>
    ${createSimpleList([
      `Este link é válido apenas por ${expirationTime}`,
      'Só pode ser usado uma única vez',
      'Nunca partilhes este link com terceiros',
      'Se não solicitaste esta recuperação, contacta-nos imediatamente'
    ])}
    
    <p style="margin:16px 0 8px 0;Margin:16px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Se o botão não funcionar, podes copiar e colar o seguinte link no teu navegador:</p>
    <div style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: 'Courier New', Courier, monospace; font-size: 14px; border: 1px solid #e9ecef; margin: 10px 0;">${resetUrl}</div>
  `;

  return createModernEmailTemplate(
    '🔐 Recuperação de Palavra-passe',
    content,
    {
      text: 'Redefinir Palavra-passe',
      url: resetUrl,
      color: '#ffc107'
    }
  );
}

export function createEmailConfirmationTemplate(
  userName: string,
  confirmationToken: string,
  expirationTime: string = '48 horas'
): string {
  const confirmationUrl = `https://cantolico.pt/auth/confirm-email?token=${confirmationToken}`;
  
  const content = `
    <p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Olá <strong>${userName}</strong>,</p>
    <p style="margin:8px 0;Margin:8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Obrigado por te registares no Cantólico! Para completar o processo de registo e garantir a segurança da tua conta, é necessário confirmar o teu endereço de email.</p>
    
    ${createDetailsBox('Detalhes da Confirmação', [
      {label: 'Nome de Utilizador', value: userName},
      {label: 'Data de Registo', value: new Date().toLocaleString('pt-PT')},
      {label: 'Validade do Link', value: expirationTime}
    ])}
    
    <p style="margin:20px 0 8px 0;Margin:20px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">🎯 Próximos Passos:</p>
    ${createSimpleList([
      'Clica no botão de confirmação abaixo',
      'Serás redirecionado para a plataforma',
      'A tua conta ficará totalmente ativa',
      'Poderás começar a explorar e submeter músicas'
    ])}
    
    <p style="margin:16px 0 8px 0;Margin:16px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Se o botão não funcionar, podes copiar e colar o seguinte link no teu navegador:</p>
    <div style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: 'Courier New', Courier, monospace; font-size: 14px; border: 1px solid #e9ecef; margin: 10px 0;">${confirmationUrl}</div>
    
    <p style="margin:16px 0 8px 0;Margin:16px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;"><em>Se não criaste uma conta no Cantólico, podes ignorar este email.</em></p>
  `;

  return createModernEmailTemplate(
    '✉️ Confirmação de Email',
    content,
    {
      text: 'Confirmar Email',
      url: confirmationUrl,
      color: '#17a2b8'
    }
  );
}

export function createWarningEmailTemplate(
  userName: string,
  warningReason: string,
  adminName?: string
): string {
  const adminInfo = adminName ? [
    {label: 'Administrador Responsável', value: adminName}
  ] : [];

  const content = `
    <p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Olá <strong>${userName}</strong>,</p>
    <p style="margin:8px 0;Margin:8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Este email serve para te informar que foi emitido um aviso para a tua conta na plataforma Cantólico.</p>
    
    ${createDetailsBox('Detalhes do Aviso', [
      {label: 'Motivo', value: warningReason},
      {label: 'Data', value: new Date().toLocaleDateString('pt-PT')},
      ...adminInfo
    ])}
    
    <p style="margin:20px 0 8px 0;Margin:20px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">⚠️ Importante:</p>
    ${createSimpleList([
      'Revê os termos de utilização da plataforma',
      'Certifica-te de que cumpres todas as regras',
      'Evita comportamentos similares no futuro',
      'Contacta o suporte se tiveres dúvidas'
    ])}
    
    <p style="margin:16px 0 8px 0;Margin:16px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Por favor, toma nota deste aviso para evitar futuras sanções na tua conta.</p>
  `;

  return createModernEmailTemplate(
    '⚠️ Aviso de Conduta',
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
  const adminInfo = adminName ? [
    {label: 'Administrador Responsável', value: adminName}
  ] : [];

  const content = `
    <p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Olá <strong>${userName}</strong>,</p>
    <p style="margin:8px 0;Margin:8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Informamos que a tua conta foi temporariamente suspensa na plataforma Cantólico devido a uma violação dos nossos termos de utilização.</p>
    
    ${createDetailsBox('Detalhes da Suspensão', [
      {label: 'Motivo', value: suspensionReason},
      {label: 'Duração', value: suspensionDuration},
      {label: 'Data de Suspensão', value: new Date().toLocaleDateString('pt-PT')},
      ...adminInfo
    ])}
    
    <p style="margin:20px 0 8px 0;Margin:20px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">🔒 Durante a suspensão:</p>
    ${createSimpleList([
      'Não poderás aceder à tua conta',
      'Todas as atividades estão temporariamente bloqueadas',
      'O teu conteúdo permanece na plataforma',
      'A suspensão será levantada automaticamente após o período indicado'
    ])}
    
    <p style="margin:16px 0 8px 0;Margin:16px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Se acreditas que esta suspensão foi aplicada incorretamente, podes contactar o nosso suporte para revisão.</p>
  `;

  return createModernEmailTemplate(
    '🔒 Conta Suspensa Temporariamente',
    content,
    {
      text: 'Contactar Suporte',
      url: 'https://cantolico.pt/contact',
      color: '#fd7e14'
    }
  );
}

export function createBanEmailTemplate(
  userName: string,
  banReason: string,
  adminName?: string
): string {
  const adminInfo = adminName ? [
    {label: 'Administrador Responsável', value: adminName}
  ] : [];

  const content = `
    <p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Olá <strong>${userName}</strong>,</p>
    <p style="margin:8px 0;Margin:8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Informamos que a tua conta foi permanentemente banida da plataforma Cantólico devido a uma violação grave dos nossos termos de utilização.</p>
    
    ${createDetailsBox('Detalhes do Banimento', [
      {label: 'Motivo', value: banReason},
      {label: 'Data do Banimento', value: new Date().toLocaleDateString('pt-PT')},
      {label: 'Tipo', value: 'Banimento Permanente'},
      ...adminInfo
    ])}
    
    <p style="margin:20px 0 8px 0;Margin:20px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">🚫 Consequências do banimento:</p>
    ${createSimpleList([
      'Acesso permanentemente revogado à plataforma',
      'Não é possível criar novas contas com os mesmos dados',
      'Todo o conteúdo associado pode ser removido',
      'Esta decisão é final e irreversível'
    ])}
    
    <p style="margin:16px 0 8px 0;Margin:16px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Se acreditas que existe um erro nesta decisão, podes submeter um recurso através do nosso processo de apelo.</p>
  `;

  return createModernEmailTemplate(
    '🚫 Conta Banida Permanentemente',
    content,
    {
      text: 'Processo de Apelo',
      url: 'https://cantolico.pt/appeal',
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
  const severityIcon = severity === 5 ? '🚨' : severity >= 4 ? '⚠️' : severity >= 3 ? '⚡' : severity >= 2 ? '💡' : '✅';

  const alertDetails = [
    {label: 'Tipo de Evento', value: alertType},
    {label: 'Nível de Severidade', value: `${severityIcon} ${severityText}`},
    {label: 'Descrição', value: description},
    {label: 'Data e Hora', value: new Date().toLocaleString('pt-PT')}
  ];

  if (details.ip) alertDetails.push({label: 'Endereço IP', value: details.ip});
  if (details.userAgent) alertDetails.push({label: 'User Agent', value: details.userAgent});
  if (details.userId) alertDetails.push({label: 'ID do Utilizador', value: details.userId});

  const urgentActions = severity >= 4 ? [
    '🚨 URGENTE: Contacta a equipa de segurança imediatamente'
  ] : [];

  const content = `
    <p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Foi detectado um evento de segurança no sistema Cantólico que requer a tua atenção ${severity >= 4 ? 'imediata' : ''}.</p>
    
    ${createDetailsBox('Detalhes do Alerta', alertDetails)}
    
    <p style="margin:20px 0 8px 0;Margin:20px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">🛡️ Ações Recomendadas:</p>
    ${createSimpleList([
      'Verifica os logs de segurança detalhados na plataforma',
      'Analisa se este evento representa uma ameaça real',
      'Toma as medidas apropriadas conforme o protocolo de segurança',
      'Monitoriza eventos subsequentes relacionados',
      ...urgentActions
    ])}
    
    <p style="margin:16px 0 8px 0;Margin:16px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Este alerta foi gerado automaticamente pelo sistema de monitorização de segurança do Cantólico. ${severity >= 4 ? '<strong>Devido à severidade deste alerta, requer ação imediata.</strong>' : 'Recomenda-se uma revisão dentro de 24 horas.'}</p>
  `;

  return createModernEmailTemplate(
    `${severityIcon} Alerta de Segurança`,
    content,
    {
      text: 'Ver Logs de Segurança',
      url: 'https://cantolico.pt/logs/security-alerts',
      color: severityColor
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
  const loginDetails = [
    {label: 'Email do Administrador', value: userEmail},
    {label: 'Endereço IP', value: ip},
    {label: 'Data e Hora', value: timestamp.toLocaleString('pt-PT')},
    {label: 'Navegador/Dispositivo', value: userAgent}
  ];

  if (location) {
    loginDetails.splice(3, 0, {label: 'Localização Estimada', value: location});
  }

  const content = `
    <p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Foi detectado e registado um login de administrador no sistema Cantólico. Este alerta é enviado por razões de segurança e monitorização.</p>
    
    ${createDetailsBox('Informações do Login', loginDetails)}
    
    <p style="margin:20px 0 8px 0;Margin:20px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">🛡️ Verificações de Segurança:</p>
    ${createSimpleList([
      'Confirma se este login foi autorizado e legítimo',
      'Verifica se o IP e localização correspondem ao esperado',
      'Monitoriza atividades subsequentes no painel admin',
      'Revê os logs de ações administrativas recentes'
    ])}
    
    <p style="margin:16px 0 8px 0;Margin:16px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:600;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Se este login não foi autorizado:</p>
    ${createSimpleList([
      'Altera imediatamente as palavras-passe de administrador',
      'Revê e revoga sessões ativas suspeitas',
      'Verifica logs de alterações recentes no sistema',
      'Contacta a equipa de segurança para investigação'
    ])}
  `;

  return createModernEmailTemplate(
    '🔐 Login de Administrador Detectado',
    content,
    {
      text: 'Aceder ao Dashboard Admin',
      url: 'https://cantolico.pt/admin',
      color: '#dc3545'
    },
    {
      text: 'Ver Logs de Segurança',
      url: 'https://cantolico.pt/logs/security-alerts',
      color: '#6c757d'
    }
  );
}

export function createPlaylistInviteEmailTemplate(
  invitedUserName: string,
  playlistName: string,
  playlistDescription: string | null,
  inviterName: string,
  inviteToken: string,
  playlistId: string
): string {
  const content = `
    <p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Olá <strong>${invitedUserName}</strong>,</p>
    
    <p style="margin:16px 0 8px 0;Margin:16px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Tens um convite especial esperando por ti! <strong>${inviterName}</strong> convidou-te para colaborares na playlist <strong>"${playlistName}"</strong> no Cantólico.</p>
    
    ${createDetailsBox('Detalhes do Convite', [
      {label: '🎵 Playlist', value: playlistName},
      {label: '👤 Convidado por', value: inviterName},
      {label: '🎯 Papel', value: 'Editor - Podes adicionar e organizar músicas'},
      ...(playlistDescription ? [{label: '📝 Descrição', value: playlistDescription}] : []),
      {label: '⏰ Validade', value: '7 dias'}
    ])}
    
    <p style="margin:20px 0 8px 0;Margin:20px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">🎼 Como Editor, poderás:</p>
    ${createSimpleList([
      'Adicionar novas músicas à playlist',
      'Remover músicas existentes',
      'Reorganizar a ordem das músicas',
      'Ver estatísticas da playlist',
      'Colaborar com outros editores'
    ])}
    
    <p style="margin:16px 0 8px 0;Margin:16px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Este convite é uma oportunidade única para partilhares o teu gosto musical e criares algo incrível em colaboração!</p>
  `;

  return createModernEmailTemplate(
    '🎵 Convite para Colaborar numa Playlist',
    content,
    {
      text: 'Aceitar Convite',
      url: `https://cantolico.pt/playlists/invite/accept?token=${inviteToken}`,
      color: '#28a745'
    },
    {
      text: 'Ver Playlist',
      url: `https://cantolico.pt/playlists/${playlistId}`,
      color: '#17a2b8'
    }
  );
}

export function createWelcomeEmailTemplate(userName: string): string {
  const content = `
    <p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Olá <strong>${userName}</strong>,</p>
    <p style="margin:8px 0;Margin:8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">É com grande alegria e entusiasmo que te damos as boas-vindas à comunidade Cantólico! Acabaste de te juntar a uma plataforma inovadora dedicada à partilha, celebração e descoberta da música.</p>
    
    ${createDetailsBox('Descobre o que podes fazer na plataforma', [
      {label: '🎼 Explorar Músicas', value: 'Navega pelo nosso vasto catálogo de composições musicais'},
      {label: '📝 Submeter Criações', value: 'Partilha as tuas próprias composições com a comunidade'},
      {label: '🎯 Criar Playlists', value: 'Organiza as tuas músicas favoritas em listas personalizadas'},
      {label: '👥 Interagir', value: 'Conecta-te com outros amantes da música e artistas'},
      {label: '⭐ Avaliar Conteúdo', value: 'Ajuda a destacar as melhores músicas da plataforma'}
    ])}
  
    
    <p style="margin:16px 0 8px 0;Margin:16px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Esperamos que tenhas uma experiência extraordinária na Cantólico e que encontres inspiração musical todos os dias!</p>
  `;

  return createModernEmailTemplate(
    '🎵 Bem-vindo ao Cantólico',
    content,
    {
      text: 'Começar a Explorar',
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
  const title = isAdmin ? '🔐 Login de Administrador Detectado' : '🔐 Novo Acesso à Tua Conta';
  const greeting = isAdmin ? 
    'Foi detectado e registado um login de administrador no sistema Cantólico. Este alerta é enviado por razões de segurança e monitorização.' :
    `Olá ${userName}! Detectámos um novo acesso à tua conta no Cantólico. Se foste tu, podes ignorar este email. Caso contrário, recomendamos que tomes medidas de segurança imediatamente.`;

  const loginDetails = [
    {label: isAdmin ? 'Email do Administrador' : 'Email da Conta', value: userEmail},
    {label: 'Endereço IP', value: ip},
    {label: 'Data e Hora', value: timestamp.toLocaleString('pt-PT')},
    {label: 'Localização Estimada', value: location},
    {label: 'Navegador/Dispositivo', value: userAgent}
  ];

  const content = `
    <p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">${greeting}</p>
    
    ${createDetailsBox('Informações do Login', loginDetails)}
    
    ${isAdmin ? `
    <p style="margin:20px 0 8px 0;Margin:20px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">🛡️ Verificações de Segurança:</p>
    ${createSimpleList([
      'Confirma se este login foi autorizado e legítimo',
      'Verifica se o IP e localização correspondem ao esperado',
      'Monitoriza atividades subsequentes no painel admin',
      'Revê os logs de ações administrativas recentes'
    ])}
    
    <p style="margin:16px 0 8px 0;Margin:16px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:600;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Se este login não foi autorizado:</p>
    ${createSimpleList([
      'Altera imediatamente as palavras-passe de administrador',
      'Revê e revoga sessões ativas suspeitas',
      'Verifica logs de alterações recentes no sistema',
      'Contacta a equipa de segurança para investigação'
    ])}` : `
    <p style="margin:20px 0 8px 0;Margin:20px 0 8px 0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">🔍 Se este acesso não foi autorizado por ti:</p>
    ${createSimpleList([
      'Altera imediatamente a tua palavra-passe',
      'Verifica as definições de segurança da conta',
      'Revê atividades recentes no teu perfil',
      'Contacta-nos se suspeitares de atividade maliciosa'
    ])}`}
  `;

  const primaryButton = {
    text: isAdmin ? 'Aceder ao Dashboard Admin' : 'Aceder à Minha Conta',
    url: isAdmin ? 'https://cantolico.pt/admin' : 'https://cantolico.pt/users/profile',
    color: isAdmin ? '#dc3545' : '#FF595F'
  };

  const secondaryButton = isAdmin ? {
    text: 'Ver Logs de Segurança',
    url: 'https://cantolico.pt/logs/security-alerts',
    color: '#6c757d'
  } : {
    text: 'Alterar Palavra-passe',
    url: 'https://cantolico.pt/login?reset=true',
    color: '#6c757d'
  };

  return createModernEmailTemplate(
    title,
    content,
    primaryButton,
    secondaryButton
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

export async function sendPasswordResetEmail(
  userEmail: string,
  userName: string,
  resetToken: string,
  expirationTime: string = '24 horas'
): Promise<{ success: boolean; error?: string }> {
  try {
    const template: EmailTemplate = {
      to: userEmail,
      subject: 'Recuperação de Palavra-passe - Cantólico',
      html: createPasswordResetEmailTemplate(userName, resetToken, expirationTime)
    };

    return await sendEmail(template);
  } catch (error) {
    console.error('Erro ao enviar email de recuperação de palavra-passe:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

export async function sendEmailConfirmation(
  userEmail: string,
  userName: string,
  confirmationToken: string,
  expirationTime: string = '48 horas'
): Promise<{ success: boolean; error?: string }> {
  try {
    const template: EmailTemplate = {
      to: userEmail,
      subject: 'Confirma o teu Email - Cantólico',
      html: createEmailConfirmationTemplate(userName, confirmationToken, expirationTime)
    };

    return await sendEmail(template);
  } catch (error) {
    console.error('Erro ao enviar email de confirmação:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

// Funções para gestão de tokens de verificação de email
export function generateEmailVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function createEmailVerificationData(email: string, token: string) {
  const expirationTime = new Date();
  expirationTime.setHours(expirationTime.getHours() + 48); // 48 horas de validade
  
  return {
    email,
    token,
    expiresAt: expirationTime.toISOString(),
    createdAt: new Date().toISOString()
  };
}

// Função para verificar se um usuário tem email verificado
export async function isEmailVerified(userId: number): Promise<boolean> {
  try {
    const { supabase } = await import('@/lib/supabase-client');
    
    const { data: user, error } = await supabase
      .from('User')
      .select('emailVerified')
      .eq('id', userId)
      .single();
    
    if (error || !user) {
      console.error('Erro ao verificar status de email:', error);
      return false;
    }
    
    return user.emailVerified !== null;
  } catch (error) {
    console.error('Erro ao verificar email:', error);
    return false;
  }
}

// Função para verificar verificação de email e retornar resposta padronizada
export async function requireEmailVerification(userId: number): Promise<{ success: boolean; error?: string }> {
  const verified = await isEmailVerified(userId);
  
  if (!verified) {
    return {
      success: false,
      error: "Email não verificado. Verifica o teu email antes de realizar esta ação."
    };
  }
  
  return { success: true };
}