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
    <!--
* This email was built using Tabular.
* For more information, visit https://tabular.email
-->
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
<title></title>
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
.t80,.t81{display:block!important}.t59,.t80,.t83{text-align:center!important}.t101{padding-left:30px!important;padding-right:30px!important}.t79{vertical-align:middle!important;display:inline-block!important;width:100%!important;max-width:800px!important}
}
</style>
<!--[if !mso]>-->
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;700&amp;family=Roboto:wght@400;700&amp;display=swap" rel="stylesheet" type="text/css" />
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
<body id="body" class="t107" style="min-width:100%;Margin:0px;padding:0px;background-color:#FAFAFA;"><div class="t106" style="background-color:#FAFAFA;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td class="t105" style="font-size:0;line-height:0;mso-line-height-rule:exactly;background-color:#FAFAFA;" valign="top" align="center">
<!--[if mso]>
<v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false">
<v:fill color="#FAFAFA"/>
</v:background>
<![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" id="innerTable"><tr><td align="center">
<table class="t104" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="630" class="t103" style="width:630px;">
<table class="t102" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t101" style="background-color:#FFFFFF;padding:40px 60px 40px 60px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;"><tr><td align="left">
<table class="t4" role="presentation" cellpadding="0" cellspacing="0" style="Margin-right:auto;"><tr><td width="40" class="t3" style="width:40px;">
<table class="t2" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t1"><div style="font-size:0px;"><img class="t0" style="display:block;border:0;height:auto;width:100%;Margin:0;max-width:100%;" width="40" height="40" alt="" src="https://cantolico.pt/cantolicoemail.png"/></div></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class="t5" style="mso-line-height-rule:exactly;mso-line-height-alt:40px;line-height:40px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align="center">
<table class="t10" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="510" class="t9" style="width:744px;">
<table class="t8" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t7"><h1 class="t6" style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:34px;font-weight:700;font-style:normal;font-size:29px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">A tua submissão foi recusada...</h1></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class="t11" style="mso-line-height-rule:exactly;mso-line-height-alt:11px;line-height:11px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align="center">
<table class="t16" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td class="t15">
<table class="t14" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t13"><p class="t12" style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Infelizmente, a tua submissão foi rejeitada pela nossa equipa de revisão.</p></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class="t17" style="mso-line-height-rule:exactly;mso-line-height-alt:4px;line-height:4px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align="center">
<table class="t57" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="510" class="t56" style="width:800px;">
<table class="t55" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t54" style="padding:30px 0 10px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;"><tr><td align="center">
<table class="t27" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="510" class="t26" style="width:800px;">
<table class="t25" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t24" style="border:1px solid #E3E3E3;overflow:hidden;padding:30px 30px 30px 30px;border-radius:6px 6px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;"><tr><td align="center">
<table class="t23" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="448" class="t22" style="width:600px;">
<table class="t21" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t20"><p class="t19" style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;"><span class="t18" style="margin:0;Margin:0;font-weight:bold;mso-line-height-rule:exactly;">Detalhes</span></p></td></tr></table>
</td></tr></table>
</td></tr></table></td></tr></table>
</td></tr></table>
</td></tr><tr><td align="center">
<table class="t53" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="510" class="t52" style="width:800px;">
<table class="t51" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t50" style="border:1px solid #E3E3E3;padding:30px 30px 30px 30px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;"><tr><td align="center">
<table class="t35" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="448" class="t34" style="width:600px;">
<table class="t33" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t32"><p class="t31" style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;"><span class="t28" style="margin:0;Margin:0;font-weight:bold;mso-line-height-rule:exactly;">Titulo: </span><span class="t30" style="margin:0;Margin:0;mso-line-height-rule:exactly;"><span class="t29" style="margin:0;Margin:0;font-weight:400;mso-line-height-rule:exactly;">${submissionTitle}</span></span></p></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class="t38" style="mso-line-height-rule:exactly;mso-line-height-alt:4px;line-height:4px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align="center">
<table class="t42" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="448" class="t41" style="width:600px;">
<table class="t40" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t39"><p class="t37" style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;"><span class="t36" style="margin:0;Margin:0;font-weight:bold;mso-line-height-rule:exactly;">Motivo da Rejeição: </span>${rejectionReason}</p></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class="t45" style="mso-line-height-rule:exactly;mso-line-height-alt:4px;line-height:4px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align="center">
<table class="t49" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="448" class="t48" style="width:600px;">
<table class="t47" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t46"><p class="t44" style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;"><span class="t43" style="margin:0;Margin:0;font-weight:bold;mso-line-height-rule:exactly;">Revisor: </span>${reviewerName}</p></td></tr></table>
</td></tr></table>
</td></tr></table></td></tr></table>
</td></tr></table>
</td></tr></table></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class="t84" style="mso-line-height-rule:exactly;mso-line-height-alt:40px;line-height:40px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align="center">
<table class="t88" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="510" class="t87" style="width:800px;">
<table class="t86" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t85" style="border-bottom:2px solid #EEEEEE;border-top:2px solid #EEEEEE;padding:25px 0 25px 0;"><div class="t83" style="width:100%;text-align:left;"><div class="t82" style="display:inline-block;"><table class="t81" role="presentation" cellpadding="0" cellspacing="0" align="left" valign="middle">
<tr class="t80"><td></td><td class="t79" width="510" valign="middle">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="t78" style="width:100%;"><tr><td class="t77"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;"><tr><td align="center">
<table class="t63" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="509.99999999999994" class="t62" style="width:600px;">
<table class="t61" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t60"><p class="t59" style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:700;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#454545;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;"><a class="t58" href="https://tabular.email" style="margin:0;Margin:0;font-weight:700;font-style:normal;text-decoration:none;direction:ltr;color:#454545;mso-line-height-rule:exactly;" target="_blank">Não desanimes!</a></p></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class="t66" style="mso-line-height-rule:exactly;mso-line-height-alt:16px;line-height:16px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align="center">
<table class="t70" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="509.99999999999994" class="t69" style="width:600px;">
<table class="t68" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t67"><p class="t65" style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Podes na mesma submeter outra musica, ou corrigir a antiga e tentar de novo!<a class="t64" href="https://tabular.email" style="margin:0;Margin:0;font-weight:700;font-style:normal;text-decoration:none;direction:ltr;color:#0000FF;mso-line-height-rule:exactly;" target="_blank"></a></p></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class="t72" style="mso-line-height-rule:exactly;mso-line-height-alt:16px;line-height:16px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align="center">
<table class="t76" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="509.99999999999994" class="t75" style="width:600px;">
<table class="t74" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t73" style="overflow:hidden;background-color:#FF595F;text-align:center;line-height:24px;mso-line-height-rule:exactly;mso-text-raise:2px;padding:18px 14px 18px 14px;border-radius:4px 4px 4px 4px;"><a class="t71" href="https://cantolico.pt/musics/create" style="display:block;margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:24px;font-weight:700;font-style:normal;font-size:16px;text-decoration:none;direction:ltr;color:#FFFFFF;text-align:center;mso-line-height-rule:exactly;mso-text-raise:2px;" target="_blank">Submeter musica!</a></td></tr></table>
</td></tr></table>
</td></tr></table></td></tr></table>
</td>
<td></td></tr>
</table></div></div></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class="t89" style="mso-line-height-rule:exactly;mso-line-height-alt:40px;line-height:40px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align="center">
<table class="t95" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td class="t94">
<table class="t93" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t92"><p class="t91" style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:13px;text-decoration:none;text-transform:none;direction:ltr;color:#949494;text-align:left;mso-line-height-rule:exactly;mso-text-raise:3px;">Enviado <span class="t90" style="margin:0;Margin:0;mso-line-height-rule:exactly;">automaticamente </span>pelo sistema interno do Cantólico</p></td></tr></table>
</td></tr></table>
</td></tr><tr><td align="center">
<table class="t100" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td class="t99">
<table class="t98" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t97"><p class="t96" style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:13px;text-decoration:none;text-transform:none;direction:ltr;color:#949494;text-align:left;mso-line-height-rule:exactly;mso-text-raise:3px;">Por favor não respondas a este email.</p></td></tr></table>
</td></tr></table>
</td></tr></table></td></tr></table>
</td></tr></table>
</td></tr></table></td></tr></table></div><div class="gmail-fix" style="display: none; white-space: nowrap; font: 15px courier; line-height: 0;">&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;</div></body>
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
    <!--
* This email was built using Tabular.
* For more information, visit https://tabular.email
-->
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
<title></title>
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
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;700&amp;family=Roboto:wght@400&amp;display=swap" rel="stylesheet" type="text/css" />
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
<body id="body" class="t107" style="min-width:100%;Margin:0px;padding:0px;background-color:#FAFAFA;"><div class="t106" style="background-color:#FAFAFA;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td class="t105" style="font-size:0;line-height:0;mso-line-height-rule:exactly;background-color:#FAFAFA;" valign="top" align="center">
<!--[if mso]>
<v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false">
<v:fill color="#FAFAFA"/>
</v:background>
<![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" id="innerTable"><tr><td align="center">
<table class="t104" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="630" class="t103" style="width:630px;">
<table class="t102" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t101" style="background-color:#FFFFFF;padding:40px 60px 40px 60px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;"><tr><td align="left">
<table class="t4" role="presentation" cellpadding="0" cellspacing="0" style="Margin-right:auto;"><tr><td width="40" class="t3" style="width:40px;">
<table class="t2" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t1"><div style="font-size:0px;"><img class="t0" style="display:block;border:0;height:auto;width:100%;Margin:0;max-width:100%;" width="40" height="40" alt="" src="https://cantolico.pt/cantolicoemail.png"/></div></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class="t5" style="mso-line-height-rule:exactly;mso-line-height-alt:40px;line-height:40px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align="center">
<table class="t10" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="510" class="t9" style="width:877px;">
<table class="t8" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t7"><h1 class="t6" style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:34px;font-weight:700;font-style:normal;font-size:29px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">A tua submissão foi aprovada!🥳</h1></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class="t11" style="mso-line-height-rule:exactly;mso-line-height-alt:11px;line-height:11px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align="center">
<table class="t16" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td class="t15">
<table class="t14" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t13"><p class="t12" style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Parabéns ${userName}! A tua submissão foi aprovada e já está disponível no Cantólico!</p></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class="t17" style="mso-line-height-rule:exactly;mso-line-height-alt:4px;line-height:4px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align="center">
<table class="t50" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="510" class="t49" style="width:800px;">
<table class="t48" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t47" style="padding:30px 0 10px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;"><tr><td align="center">
<table class="t27" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="510" class="t26" style="width:800px;">
<table class="t25" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t24" style="border:1px solid #E3E3E3;overflow:hidden;padding:30px 30px 30px 30px;border-radius:6px 6px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;"><tr><td align="center">
<table class="t23" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="448" class="t22" style="width:600px;">
<table class="t21" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t20"><p class="t19" style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;"><span class="t18" style="margin:0;Margin:0;font-weight:bold;mso-line-height-rule:exactly;">Detalhes</span></p></td></tr></table>
</td></tr></table>
</td></tr></table></td></tr></table>
</td></tr></table>
</td></tr><tr><td align="center">
<table class="t46" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="510" class="t45" style="width:800px;">
<table class="t44" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t43" style="border:1px solid #E3E3E3;padding:30px 30px 30px 30px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;"><tr><td align="center">
<table class="t35" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="448" class="t34" style="width:600px;">
<table class="t33" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t32"><p class="t31" style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;"><span class="t28" style="margin:0;Margin:0;font-weight:bold;mso-line-height-rule:exactly;">Titulo: </span><span class="t30" style="margin:0;Margin:0;mso-line-height-rule:exactly;"><span class="t29" style="margin:0;Margin:0;font-weight:400;mso-line-height-rule:exactly;">${submissionTitle}</span></span></p></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class="t38" style="mso-line-height-rule:exactly;mso-line-height-alt:4px;line-height:4px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align="center">
<table class="t42" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="448" class="t41" style="width:600px;">
<table class="t40" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t39"><p class="t37" style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;"><span class="t36" style="margin:0;Margin:0;font-weight:bold;mso-line-height-rule:exactly;">Aprovado por: </span>${reviewerName}</p></td></tr></table>
</td></tr></table>
</td></tr></table></td></tr></table>
</td></tr></table>
</td></tr></table></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class="t84" style="mso-line-height-rule:exactly;mso-line-height-alt:40px;line-height:40px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align="center">
<table class="t88" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="510" class="t87" style="width:800px;">
<table class="t86" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t85" style="border-bottom:2px solid #EEEEEE;border-top:2px solid #EEEEEE;padding:25px 0 25px 0;"><div class="t83" style="width:100%;text-align:left;"><div class="t82" style="display:inline-block;"><table class="t81" role="presentation" cellpadding="0" cellspacing="0" align="left" valign="middle">
<tr class="t80"><td></td><td class="t79" width="510" valign="middle">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="t78" style="width:100%;"><tr><td class="t77"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;"><tr><td align="center">
<table class="t55" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="509.99999999999994" class="t54" style="width:600px;">
<table class="t53" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t52"><p class="t51" style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">A tua música já pode ser vista e utilizada por toda a comunidade do&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;Cantólico. Obrigado pela tua valiosa contribuição!</p></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class="t72" style="mso-line-height-rule:exactly;mso-line-height-alt:16px;line-height:16px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align="center">
<table class="t76" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td width="509.99999999999994" class="t75" style="width:600px;">
<table class="t74" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t73"><div class="t71" style="width:100%;text-align:center;"><div class="t70" style="display:inline-block;"><table class="t69" role="presentation" cellpadding="0" cellspacing="0" align="center" valign="middle">
<tr class="t68"><td></td><td class="t61" valign="middle">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="t60" style="width:auto;"><tr><td class="t57" style="width:30px;" width="30"></td><td class="t58" style="overflow:hidden;background-color:#FF595F;text-align:center;line-height:24px;mso-line-height-rule:exactly;mso-text-raise:2px;padding:18px 14px 18px 14px;border-radius:4px 4px 4px 4px;"><a class="t56" href="https://cantolico.pt/musics/${songId}" style="display:block;margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:24px;font-weight:700;font-style:normal;font-size:16px;text-decoration:none;direction:ltr;color:#FFFFFF;text-align:center;mso-line-height-rule:exactly;mso-text-raise:2px;" target="_blank">Ver musica</a></td><td class="t59" style="width:30px;" width="30"></td></tr></table>
</td><td class="t67" valign="middle">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="t66" style="width:auto;"><tr><td class="t63" style="width:30px;" width="30"></td><td class="t64" style="overflow:hidden;background-color:#FF595F;text-align:center;line-height:24px;mso-line-height-rule:exactly;mso-text-raise:2px;padding:18px 14px 18px 14px;border-radius:4px 4px 4px 4px;"><a class="t62" href="https://cantolico.pt/musics/create" style="display:block;margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:24px;font-weight:700;font-style:normal;font-size:16px;text-decoration:none;direction:ltr;color:#FFFFFF;text-align:center;mso-line-height-rule:exactly;mso-text-raise:2px;" target="_blank">Submeter outra musica!</a></td><td class="t65" style="width:30px;" width="30"></td></tr></table>
</td>
<td></td></tr>
</table></div></div></td></tr></table>
</td></tr></table>
</td></tr></table></td></tr></table>
</td>
<td></td></tr>
</table></div></div></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class="t89" style="mso-line-height-rule:exactly;mso-line-height-alt:40px;line-height:40px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align="center">
<table class="t95" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td class="t94">
<table class="t93" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t92"><p class="t91" style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:13px;text-decoration:none;text-transform:none;direction:ltr;color:#949494;text-align:left;mso-line-height-rule:exactly;mso-text-raise:3px;">Enviado <span class="t90" style="margin:0;Margin:0;mso-line-height-rule:exactly;">automaticamente </span>pelo sistema interno do Cantólico</p></td></tr></table>
</td></tr></table>
</td></tr><tr><td align="center">
<table class="t100" role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;"><tr><td class="t99">
<table class="t98" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;"><tr><td class="t97"><p class="t96" style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:13px;text-decoration:none;text-transform:none;direction:ltr;color:#949494;text-align:left;mso-line-height-rule:exactly;mso-text-raise:3px;">Por favor não respondas a este email.</p></td></tr></table>
</td></tr></table>
</td></tr></table></td></tr></table>
</td></tr></table>
</td></tr></table></td></tr></table></div><div class="gmail-fix" style="display: none; white-space: nowrap; font: 15px courier; line-height: 0;">&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;</div></body>
</html>

  `;
}

export function createWarningEmailTemplate(
  userName: string,
  reason: string,
  moderatorName?: string
): string {
  return `
    <!--
* This email was built using Tabular.
* For more information, visit https://tabular.email
-->
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
<title></title>
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
<!--[if !mso]>-->
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;700&amp;family=Roboto:wght@400;700&amp;display=swap" rel="stylesheet" type="text/css" />
<!--<![endif]-->
</head>
<body id="body" style="min-width:100%;Margin:0px;padding:0px;background-color:#FAFAFA;">
<div style="background-color:#FAFAFA;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center">
<tr><td style="font-size:0;line-height:0;mso-line-height-rule:exactly;background-color:#FAFAFA;" valign="top" align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" id="innerTable">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td width="630" style="width:630px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td style="background-color:#FFFFFF;padding:40px 60px 40px 60px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;">
<tr><td align="left">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-right:auto;">
<tr><td width="40" style="width:40px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td><div style="font-size:0px;">
<img style="display:block;border:0;height:auto;width:100%;Margin:0;max-width:100%;" width="40" height="40" alt="" src="https://cantolico.pt/cantolicoemail.png"/>
</div></td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:40px;line-height:40px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td width="510" style="width:744px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<h1 style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:34px;font-weight:700;font-style:normal;font-size:29px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">⚠️ Advertência Recebida</h1>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:11px;line-height:11px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Olá ${userName}, recebeste uma advertência da administração do Cantólico.</p>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:20px;line-height:20px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td width="510" style="width:800px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td style="border:1px solid #FFA500;background-color:#FFF8DC;overflow:hidden;padding:30px 30px 30px 30px;border-radius:6px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td width="448" style="width:600px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<p style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">
<span style="margin:0;Margin:0;font-weight:bold;mso-line-height-rule:exactly;">Motivo da Advertência:</span><br>
${reason}
</p>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:20px;line-height:20px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<p style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">
Esta é uma advertência oficial. Por favor, revê os nossos <a href="https://cantolico.pt/terms" style="color:#FF595F;text-decoration:underline;">termos de utilização</a> e ajusta o teu comportamento em conformidade.<br><br>
<strong>Podes continuar a utilizar a plataforma normalmente.</strong>
</p>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:40px;line-height:40px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:13px;text-decoration:none;text-transform:none;direction:ltr;color:#949494;text-align:left;mso-line-height-rule:exactly;mso-text-raise:3px;">
Enviado automaticamente pelo sistema interno do Cantólico<br>
Por favor não respondas a este email.
</p>
</td></tr></table>
</td></tr></table>
</td></tr>
</table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</div>
</body>
</html>
  `;
}

export function createSuspensionEmailTemplate(
  userName: string,
  reason: string,
  expiresAt?: Date,
  moderatorName?: string
): string {
  return `
    <!--
* This email was built using Tabular.
* For more information, visit https://tabular.email
-->
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
<title></title>
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
<!--[if !mso]>-->
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;700&amp;family=Roboto:wght@400;700&amp;display=swap" rel="stylesheet" type="text/css" />
<!--<![endif]-->
</head>
<body id="body" style="min-width:100%;Margin:0px;padding:0px;background-color:#FAFAFA;">
<div style="background-color:#FAFAFA;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center">
<tr><td style="font-size:0;line-height:0;mso-line-height-rule:exactly;background-color:#FAFAFA;" valign="top" align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" id="innerTable">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td width="630" style="width:630px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td style="background-color:#FFFFFF;padding:40px 60px 40px 60px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;">
<tr><td align="left">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-right:auto;">
<tr><td width="40" style="width:40px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td><div style="font-size:0px;">
<img style="display:block;border:0;height:auto;width:100%;Margin:0;max-width:100%;" width="40" height="40" alt="" src="https://cantolico.pt/cantolicoemail.png"/>
</div></td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:40px;line-height:40px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td width="510" style="width:744px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<h1 style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:34px;font-weight:700;font-style:normal;font-size:29px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">⏸️ Conta Suspensa</h1>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:11px;line-height:11px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Olá ${userName}, a tua conta foi suspensa temporariamente.</p>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:20px;line-height:20px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td width="510" style="width:800px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td style="border:1px solid #FF6B35;background-color:#FFF0EB;overflow:hidden;padding:30px 30px 30px 30px;border-radius:6px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td width="448" style="width:600px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<p style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">
<span style="margin:0;Margin:0;font-weight:bold;mso-line-height-rule:exactly;">Motivo da Suspensão:</span><br>
${reason}
${expiresAt ? `<br><br><span style="margin:0;Margin:0;font-weight:bold;mso-line-height-rule:exactly;">Data de Reativação:</span><br>${expiresAt.toLocaleDateString('pt-PT')}` : ''}
</p>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:20px;line-height:20px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<p style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">
Durante este período, <strong>não poderás criar músicas ou playlists</strong>, mas podes continuar a visualizar conteúdo e aceder à sua conta.<br><br>
Para mais informações, consulta os nossos <a href="https://cantolico.pt/terms" style="color:#FF595F;text-decoration:underline;">termos de utilização</a>.
</p>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:40px;line-height:40px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:13px;text-decoration:none;text-transform:none;direction:ltr;color:#949494;text-align:left;mso-line-height-rule:exactly;mso-text-raise:3px;">
Enviado automaticamente pelo sistema interno do Cantólico<br>
Por favor não respondas a este email.
</p>
</td></tr></table>
</td></tr></table>
</td></tr>
</table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</div>
</body>
</html>
  `;
}

export function createBanEmailTemplate(
  userName: string,
  reason: string,
  moderatorName?: string
): string {
  return `
    <!--
* This email was built using Tabular.
* For more information, visit https://tabular.email
-->
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
<title></title>
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
<!--[if !mso]>-->
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;700&amp;family=Roboto:wght@400;700&amp;display=swap" rel="stylesheet" type="text/css" />
<!--<![endif]-->
</head>
<body id="body" style="min-width:100%;Margin:0px;padding:0px;background-color:#FAFAFA;">
<div style="background-color:#FAFAFA;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center">
<tr><td style="font-size:0;line-height:0;mso-line-height-rule:exactly;background-color:#FAFAFA;" valign="top" align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" id="innerTable">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td width="630" style="width:630px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td style="background-color:#FFFFFF;padding:40px 60px 40px 60px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;">
<tr><td align="left">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-right:auto;">
<tr><td width="40" style="width:40px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td><div style="font-size:0px;">
<img style="display:block;border:0;height:auto;width:100%;Margin:0;max-width:100%;" width="40" height="40" alt="" src="https://cantolico.pt/cantolicoemail.png"/>
</div></td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:40px;line-height:40px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td width="510" style="width:744px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<h1 style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:34px;font-weight:700;font-style:normal;font-size:29px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">🚫 Conta Banida Permanentemente</h1>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:11px;line-height:11px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Olá ${userName}, a tua conta foi permanentemente banida do Cantólico.</p>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:20px;line-height:20px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td width="510" style="width:800px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td style="border:1px solid #DC2626;background-color:#FEF2F2;overflow:hidden;padding:30px 30px 30px 30px;border-radius:6px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td width="448" style="width:600px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<p style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">
<span style="margin:0;Margin:0;font-weight:bold;mso-line-height-rule:exactly;">Motivo do Banimento:</span><br>
${reason}
</p>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:20px;line-height:20px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<p style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">
<strong>Não poderás mais aceder à plataforma.</strong><br><br>
Se consideras que esta decisão foi tomada por engano, podes contactar a administração através do email: <a href="mailto:miguel@cantolico.pt" style="color:#FF595F;text-decoration:underline;">miguel@cantolico.pt</a>
</p>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:40px;line-height:40px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:13px;text-decoration:none;text-transform:none;direction:ltr;color:#949494;text-align:left;mso-line-height-rule:exactly;mso-text-raise:3px;">
Enviado automaticamente pelo sistema interno do Cantólico<br>
Por favor não respondas a este email.
</p>
</td></tr></table>
</td></tr></table>
</td></tr>
</table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
    </div>
</body>
</html>

  `;
}

// ================================================
// ALERTAS DE SEGURANÇA - TEMPLATES ESPECÍFICOS
// ================================================

export function createSecurityAlertTemplate(
  alertType: string,
  severity: number,
  description: string,
  details: any
): string {
  const severityText = {
    1: 'Baixa',
    2: 'Média', 
    3: 'Alta',
    4: 'Crítica',
    5: 'Emergência'
  }[severity] || 'Desconhecida';

  const severityColor = {
    1: '#28a745',
    2: '#ffc107',
    3: '#fd7e14', 
    4: '#dc3545',
    5: '#6f42c1'
  }[severity] || '#6c757d';

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Alerta de Segurança - Cantólico</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #FF595F, #FF7B7F); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { padding: 30px; }
        .alert-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; color: white; background: ${severityColor}; }
        .details { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid ${severityColor}; }
        .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 12px; border-top: 1px solid #dee2e6; }
        .logo { width: 40px; height: 40px; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://cantolico.pt/cantolicoemail.png" alt="Cantólico" class="logo">
            <h1 style="margin: 0; font-size: 24px;">🔐 Alerta de Segurança</h1>
            <span class="alert-badge">Severidade: ${severityText}</span>
        </div>
        
        <div class="content">
            <h2 style="color: #333; margin-top: 0;">${alertType}</h2>
            <p style="color: #666; line-height: 1.6;">${description}</p>
            
            <div class="details">
                <h3 style="margin-top: 0; color: #333;">Detalhes do Evento:</h3>
                <ul style="color: #555;">
                    <li><strong>Timestamp:</strong> ${new Date().toLocaleString('pt-PT')}</li>
                    <li><strong>IP Address:</strong> ${details.ip || 'N/A'}</li>
                    <li><strong>User Agent:</strong> ${details.userAgent || 'N/A'}</li>
                    <li><strong>URL:</strong> ${details.url || 'N/A'}</li>
                    ${details.userId ? `<li><strong>User ID:</strong> ${details.userId}</li>` : ''}
                    ${details.email ? `<li><strong>Email:</strong> ${details.email}</li>` : ''}
                </ul>
            </div>
            
            <p style="color: #666;">
                <strong>Ação Recomendada:</strong><br>
                Por favor, revê este alerta e toma as medidas necessárias se aplicável.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://cantolico.pt/logs" 
                   style="background: #FF595F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                   Ver Logs Completos
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p>Este email foi enviado automaticamente pelo sistema de segurança do Cantólico.<br>
            Por favor, não responder a este email.</p>
        </div>
    </div>
</body>
</html>
  `;
}

export function createAdminLoginAlertTemplate(
  userEmail: string,
  ip: string,
  userAgent: string,
  timestamp: Date,
  location?: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Login de Administrador - Cantólico</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { padding: 30px; }
        .info-box { background: #e7f3ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #007bff; }
        .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 12px; border-top: 1px solid #dee2e6; }
        .logo { width: 40px; height: 40px; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://cantolico.pt/cantolicoemail.png" alt="Cantólico" class="logo">
            <h1 style="margin: 0; font-size: 24px;">👨‍💼 Login de Administrador Detectado</h1>
        </div>
        
        <div class="content">
            <p style="color: #333; line-height: 1.6;">
                Um login de administrador foi detectado no sistema Cantólico.
            </p>
            
            <div class="info-box">
                <h3 style="margin-top: 0; color: #007bff;">Informações do Login:</h3>
                <ul style="color: #333;">
                    <li><strong>Email:</strong> ${userEmail}</li>
                    <li><strong>Timestamp:</strong> ${timestamp.toLocaleString('pt-PT')}</li>
                    <li><strong>Endereço IP:</strong> ${ip}</li>
                    <li><strong>User Agent:</strong> ${userAgent}</li>
                    ${location ? `<li><strong>Localização:</strong> ${location}</li>` : ''}
                </ul>
            </div>
            
            <p style="color: #666;">
                Se este login não foi autorizado, por favor contacta imediatamente a equipa de segurança.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://cantolico.pt/admin" 
                   style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
                   Aceder ao Admin
                </a>
                <a href="https://cantolico.pt/logs" 
                   style="background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                   Ver Logs
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p>Este email foi enviado automaticamente pelo sistema de monitorização do Cantólico.<br>
            Por favor, não responder a este email.</p>
        </div>
    </div>
</body>
</html>
  `;
}

// ================================================
// FUNÇÕES DE ENVIO DE ALERTAS DE SEGURANÇA
// ================================================

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
      subject: `🔐 [${severity === 5 ? 'EMERGÊNCIA' : severity >= 4 ? 'CRÍTICO' : 'ALERTA'}] ${alertType} - Cantólico`,
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
    
    const template: EmailTemplate = {
      to: securityEmail,
      subject: `👨‍💼 Login de Administrador Detectado - ${userEmail}`,
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

// ================================================
// NOVOS TEMPLATES - BOAS-VINDAS E LOGIN
// ================================================

export function createWelcomeEmailTemplate(
  userName: string,
  userEmail: string,
  loginMethod: string // 'OAuth' ou 'Email/Password'
): string {
  return `
    <!--
* This email was built using Tabular.
* For more information, visit https://tabular.email
-->
<!DOCTYPE html PUBLIC="-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
<title></title>
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
<!--[if !mso]>-->
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;700&amp;family=Roboto:wght@400;700&amp;display=swap" rel="stylesheet" type="text/css" />
<!--<![endif]-->
</head>
<body id="body" style="min-width:100%;Margin:0px;padding:0px;background-color:#FAFAFA;">
<div style="background-color:#FAFAFA;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center">
<tr><td style="font-size:0;line-height:0;mso-line-height-rule:exactly;background-color:#FAFAFA;" valign="top" align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" id="innerTable">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td width="630" style="width:630px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td style="background-color:#FFFFFF;padding:40px 60px 40px 60px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;">
<tr><td align="left">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-right:auto;">
<tr><td width="40" style="width:40px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td><div style="font-size:0px;">
<img style="display:block;border:0;height:auto;width:100%;Margin:0;max-width:100%;" width="40" height="40" alt="" src="https://cantolico.pt/cantolicoemail.png"/>
</div></td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:40px;line-height:40px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td width="510" style="width:744px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<h1 style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:34px;font-weight:700;font-style:normal;font-size:29px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">🎵 Bem-vindo ao Cantólico!</h1>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:11px;line-height:11px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Olá ${userName}! É um prazer ter-te connosco na nossa comunidade de música católica.</p>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:20px;line-height:20px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td width="510" style="width:800px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td style="border:1px solid #28a745;background-color:#d4edda;overflow:hidden;padding:30px 30px 30px 30px;border-radius:6px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td width="448" style="width:600px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<p style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">
<span style="margin:0;Margin:0;font-weight:bold;mso-line-height-rule:exactly;">Detalhes da Conta:</span><br>
📧 Email: ${userEmail}<br>
🔐 Método de Registo: ${loginMethod === 'OAuth' ? 'Google/OAuth' : 'Email e Password'}
</p>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:20px;line-height:20px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<p style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">
<strong>🎶 O que podes fazer no Cantólico:</strong><br>
• Explorar centenas de músicas católicas com acordes<br>
• Criar e gerir as tuas próprias playlists<br>
• Submeter novas músicas para a comunidade<br>
• Dar estrelas às tuas músicas favoritas<br>
• Participar numa comunidade de fé e música
</p>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:30px;line-height:30px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td style="overflow:hidden;background-color:#FF595F;text-align:center;line-height:24px;mso-line-height-rule:exactly;mso-text-raise:2px;padding:18px 14px 18px 14px;border-radius:4px 4px 4px 4px;">
<a href="https://cantolico.pt/musics" style="display:block;margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:24px;font-weight:700;font-style:normal;font-size:16px;text-decoration:none;direction:ltr;color:#FFFFFF;text-align:center;mso-line-height-rule:exactly;mso-text-raise:2px;" target="_blank">Explorar Músicas</a>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:40px;line-height:40px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:13px;text-decoration:none;text-transform:none;direction:ltr;color:#949494;text-align:left;mso-line-height-rule:exactly;mso-text-raise:3px;">
Enviado automaticamente pelo sistema interno do Cantólico<br>
Por favor não respondas a este email.
</p>
</td></tr></table>
</td></tr></table>
</td></tr>
</table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</div>
</body>
</html>
  `;
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
  const deviceInfo = userAgent.includes('Mobile') ? '📱 Dispositivo Móvel' : '💻 Computador';
  const browserInfo = userAgent.includes('Chrome') ? 'Chrome' : 
                      userAgent.includes('Firefox') ? 'Firefox' : 
                      userAgent.includes('Safari') ? 'Safari' : 'Outro';

  return `
    <!--
* This email was built using Tabular.
* For more information, visit https://tabular.email
-->
<!DOCTYPE html PUBLIC="-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
<title></title>
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
<!--[if !mso]>-->
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;700&amp;family=Roboto:wght@400;700&amp;display=swap" rel="stylesheet" type="text/css" />
<!--<![endif]-->
</head>
<body id="body" style="min-width:100%;Margin:0px;padding:0px;background-color:#FAFAFA;">
<div style="background-color:#FAFAFA;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center">
<tr><td style="font-size:0;line-height:0;mso-line-height-rule:exactly;background-color:#FAFAFA;" valign="top" align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" id="innerTable">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td width="630" style="width:630px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td style="background-color:#FFFFFF;padding:40px 60px 40px 60px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;">
<tr><td align="left">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-right:auto;">
<tr><td width="40" style="width:40px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td><div style="font-size:0px;">
<img style="display:block;border:0;height:auto;width:100%;Margin:0;max-width:100%;" width="40" height="40" alt="" src="https://cantolico.pt/cantolicoemail.png"/>
</div></td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:40px;line-height:40px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td width="510" style="width:744px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<h1 style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:34px;font-weight:700;font-style:normal;font-size:29px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">${isAdmin ? '🛡️ Login de Administrador' : '🔐 Novo Login Detectado'}</h1>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:11px;line-height:11px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">${isAdmin ? `Detectámos um login de administrador no Cantólico.` : `Olá ${userName}! Foi detectado um novo login na tua conta.`}</p>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:20px;line-height:20px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td width="510" style="width:800px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td style="border:1px solid ${isAdmin ? '#dc3545' : '#007bff'};background-color:${isAdmin ? '#f8d7da' : '#e7f3ff'};overflow:hidden;padding:30px 30px 30px 30px;border-radius:6px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100% !important;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td width="448" style="width:600px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<p style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">
<span style="margin:0;Margin:0;font-weight:bold;mso-line-height-rule:exactly;">Detalhes do Login:</span><br><br>
👤 <strong>Utilizador:</strong> ${userName} (${userEmail})<br>
🕒 <strong>Data/Hora:</strong> ${timestamp.toLocaleString('pt-PT')}<br>
🌍 <strong>Localização:</strong> ${location}<br>
📍 <strong>Endereço IP:</strong> ${ip}<br>
${deviceInfo} <strong>Dispositivo:</strong> ${browserInfo}<br>
${isAdmin ? '⚠️ <strong>Tipo:</strong> Acesso Administrativo' : ''}
</p>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:20px;line-height:20px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<p style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">
${isAdmin ? 
  '<strong>⚠️ Se este login não foi autorizado, contacta imediatamente a equipa de segurança.</strong>' : 
  'Se este login não foste tu, recomendamos que alteres a tua password imediatamente e contactes o nosso suporte.'
}<br><br>
Para mais informações sobre segurança, consulta a nossa <a href="https://cantolico.pt/privacy-policy" style="color:#FF595F;text-decoration:underline;">política de privacidade</a>.
</p>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td><div style="mso-line-height-rule:exactly;mso-line-height-alt:40px;line-height:40px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
<tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
<tr><td>
<p style="margin:0;Margin:0;font-family:Poppins,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:500;font-style:normal;font-size:13px;text-decoration:none;text-transform:none;direction:ltr;color:#949494;text-align:left;mso-line-height-rule:exactly;mso-text-raise:3px;">
Enviado automaticamente pelo sistema de segurança do Cantólico<br>
Por favor não respondas a este email.
</p>
</td></tr></table>
</td></tr></table>
</td></tr>
</table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr></table>
</div>
</body>
</html>
  `;
}

// ================================================
// FUNÇÕES DE ENVIO DOS NOVOS EMAILS
// ================================================

export async function sendWelcomeEmail(
  userName: string,
  userEmail: string,
  loginMethod: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const template: EmailTemplate = {
      to: userEmail,
      subject: '🎵 Bem-vindo ao Cantólico! - A tua jornada musical começa aqui',
      html: createWelcomeEmailTemplate(userName, userEmail, loginMethod)
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
      subject: isAdmin ? '🛡️ Login de Administrador Detectado - Cantólico' : '🔐 Novo Login na Tua Conta - Cantólico',
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
