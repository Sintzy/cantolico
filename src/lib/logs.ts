// lib/logs.ts

// Configuração de webhooks para diferentes tipos de logs
const WEBHOOKS = {
  GENERAL: process.env.DISCORD_LOG_WEBHOOK_GENERAL,
  ADMIN: process.env.DISCORD_LOG_WEBHOOK_ADMIN,
  SUBMISSIONS: process.env.DISCORD_LOG_WEBHOOK_SUBMISSIONS,
  EMAILS: process.env.DISCORD_LOG_WEBHOOK_EMAILS,
  ERRORS: process.env.DISCORD_LOG_WEBHOOK_ERRORS,
  AUDIT: process.env.DISCORD_LOG_WEBHOOK_AUDIT,
  SYSTEM: process.env.DISCORD_LOG_WEBHOOK_SYSTEM,
} as const;

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'SUCCESS';
type LogChannel = keyof typeof WEBHOOKS;

// Configuração para cada canal/categoria
const channelConfig: Record<LogChannel, { name: string; defaultColor: number }> = {
  GENERAL: { name: 'Geral', defaultColor: 0x3498db },
  ADMIN: { name: 'Administração', defaultColor: 0x9b59b6 },
  SUBMISSIONS: { name: 'Submissões', defaultColor: 0x2ecc71 },
  EMAILS: { name: 'E-mails', defaultColor: 0xf39c12 },
  ERRORS: { name: 'Erros', defaultColor: 0xe74c3c },
  AUDIT: { name: 'Auditoria', defaultColor: 0x34495e },
  SYSTEM: { name: 'Sistema', defaultColor: 0x95a5a6 },
};

const levelConfig: Record<LogLevel, { emoji: string; color: number }> = {
  INFO: { emoji: 'ℹ️', color: 0x3498db },
  WARN: { emoji: '⚠️', color: 0xf1c40f },
  ERROR: { emoji: '❌', color: 0xe74c3c },
  DEBUG: { emoji: '🐛', color: 0x95a5a6 },
  SUCCESS: { emoji: '✅', color: 0x2ecc71 },
};

function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

export async function log(
  level: LogLevel,
  title: string,
  data?: Record<string, any>,
  channel: LogChannel = 'GENERAL',
  description?: string
): Promise<void> {
  const webhookUrl = WEBHOOKS[channel];
  
  if (!webhookUrl) {
    console.warn(`Webhook não configurado para o canal ${channel}`);
    // Fallback para log geral se configurado
    if (channel !== 'GENERAL' && WEBHOOKS.GENERAL) {
      return log(level, `[${channel}] ${title}`, data, 'GENERAL', description);
    }
    return;
  }

  const { emoji } = levelConfig[level];
  const channelInfo = channelConfig[channel];
  const timestamp = formatDate(new Date());

  // Usa a cor do nível se for ERROR, senão usa a cor do canal
  const color = level === 'ERROR' ? levelConfig.ERROR.color : 
                level === 'SUCCESS' ? levelConfig.SUCCESS.color :
                channelInfo.defaultColor;

  const embed = {
    title: `${emoji} [${level}] ${title}`,
    description: description || (data ? `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`` : undefined),
    color,
    timestamp: new Date().toISOString(),
    footer: {
      text: `${channelInfo.name} - ${timestamp}`,
    },
    fields: data ? [
      ...(data.userId ? [{ name: 'Utilizador ID', value: String(data.userId), inline: true }] : []),
      ...(data.action ? [{ name: 'Ação', value: data.action, inline: true }] : []),
      ...(data.entity ? [{ name: 'Entidade', value: data.entity, inline: true }] : []),
      ...(data.submissionTitle ? [{ name: 'Submissão', value: data.submissionTitle, inline: true }] : []),
      ...(data.emailType ? [{ name: 'Tipo de Email', value: data.emailType, inline: true }] : []),
      ...(data.error ? [{ name: 'Erro', value: data.error, inline: false }] : []),
    ] : undefined,
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch (err) {
    console.error(`Erro ao enviar log para o Discord (${channel}):`, err);
  }
}

// Funções de conveniência para cada canal
export const logGeneral = (level: LogLevel, title: string, description?: string, data?: Record<string, any>) => 
  log(level, title, data, 'GENERAL', description);

export const logAdmin = (level: LogLevel, title: string, description?: string, data?: Record<string, any>) => 
  log(level, title, data, 'ADMIN', description);

export const logSubmissions = (level: LogLevel, title: string, description?: string, data?: Record<string, any>) => 
  log(level, title, data, 'SUBMISSIONS', description);

export const logEmails = (level: LogLevel, title: string, description?: string, data?: Record<string, any>) => 
  log(level, title, data, 'EMAILS', description);

export const logErrors = (level: LogLevel, title: string, description?: string, data?: Record<string, any>) => 
  log(level, title, data, 'ERRORS', description);

export const logAudit = (level: LogLevel, title: string, description?: string, data?: Record<string, any>) => 
  log(level, title, data, 'AUDIT', description);

export const logSystem = (level: LogLevel, title: string, description?: string, data?: Record<string, any>) => 
  log(level, title, data, 'SYSTEM', description);
