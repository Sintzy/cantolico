import { createClient } from '@supabase/supabase-js';
import { createSecurityAlert } from '@/lib/logging-middleware';
import { sendSecurityAlert, sendAdminLoginAlert } from '@/lib/email';

// ================================================
// SISTEMA DE ALERTAS EM TEMPO REAL
// ================================================

interface RealTimeAlert {
  id: string;
  type: 'SECURITY' | 'PERFORMANCE' | 'ERROR' | 'SYSTEM';
  severity: 1 | 2 | 3 | 4 | 5;
  title: string;
  message: string;
  details: any;
  timestamp: Date;
  resolved: boolean;
}

interface AlertRule {
  id: string;
  name: string;
  condition: (event: any) => boolean;
  severity: number;
  cooldown: number; // minutos
  emailAlert: boolean;
  slackAlert?: boolean;
}

class RealTimeAlertSystem {
  private alerts: Map<string, RealTimeAlert> = new Map();
  private lastAlertTime: Map<string, Date> = new Map();
  private rules: AlertRule[] = [];
  private isInitialized = false;

  constructor() {
    this.initializeRules();
  }

  // ================================================
  // INICIALIZAÇÃO
  // ================================================

  private initializeRules() {
    this.rules = [
      // Regra: Múltiplos logins falhados em sequência
      {
        id: 'multiple_failed_logins',
        name: 'Múltiplos Logins Falhados',
        condition: (event) => {
          return event.type === 'failed_login' && event.consecutiveFailures >= 3;
        },
        severity: 4,
        cooldown: 5,
        emailAlert: true
      },

      // Regra: Login de administrador fora do horário comercial
      {
        id: 'admin_login_off_hours',
        name: 'Login Admin Fora de Horas',
        condition: (event) => {
          if (event.type !== 'admin_login') return false;
          const hour = new Date().getHours();
          return hour < 8 || hour > 20; // Fora das 8h-20h
        },
        severity: 3,
        cooldown: 30,
        emailAlert: true
      },

      // Regra: Alto número de requests de uma única IP
      {
        id: 'high_request_rate',
        name: 'Taxa de Requests Elevada',
        condition: (event) => {
          return event.type === 'high_traffic' && event.requestsPerMinute > 100;
        },
        severity: 3,
        cooldown: 10,
        emailAlert: false
      },

      // Regra: Erro crítico no servidor
      {
        id: 'critical_server_error',
        name: 'Erro Crítico do Servidor',
        condition: (event) => {
          return event.type === 'server_error' && event.statusCode >= 500;
        },
        severity: 5,
        cooldown: 1,
        emailAlert: true
      },

      // Regra: Tentativa de acesso a endpoints administrativos por utilizador não autorizado
      {
        id: 'unauthorized_admin_access',
        name: 'Acesso Admin Não Autorizado',
        condition: (event) => {
          return event.type === 'unauthorized_access' && 
                 event.endpoint && 
                 event.endpoint.includes('/admin');
        },
        severity: 4,
        cooldown: 5,
        emailAlert: true
      },

      // Regra: Performance degradada
      {
        id: 'performance_degradation',
        name: 'Degradação de Performance',
        condition: (event) => {
          return event.type === 'slow_response' && event.responseTime > 5000;
        },
        severity: 2,
        cooldown: 15,
        emailAlert: false
      },

      // Regra: Possível ataque DDoS
      {
        id: 'potential_ddos',
        name: 'Possível Ataque DDoS',
        condition: (event) => {
          return event.type === 'high_traffic' && 
                 event.uniqueIPs < 10 && 
                 event.totalRequests > 1000;
        },
        severity: 5,
        cooldown: 5,
        emailAlert: true
      }
    ];
  }

  // ================================================
  // PROCESSAMENTO DE EVENTOS
  // ================================================

  async processEvent(event: any) {
    try {
      for (const rule of this.rules) {
        if (rule.condition(event)) {
          await this.triggerAlert(rule, event);
        }
      }
    } catch (error) {
      console.error('Erro ao processar evento de alerta:', error);
    }
  }

  private async triggerAlert(rule: AlertRule, event: any) {
    try {
      // Verificar cooldown
      const lastAlert = this.lastAlertTime.get(rule.id);
      const now = new Date();
      
      if (lastAlert) {
        const timeDiff = now.getTime() - lastAlert.getTime();
        const cooldownMs = rule.cooldown * 60 * 1000;
        
        if (timeDiff < cooldownMs) {
          return; // Ainda em cooldown
        }
      }

      // Criar alerta
      const alert: RealTimeAlert = {
        id: `${rule.id}_${Date.now()}`,
        type: this.determineAlertType(rule),
        severity: rule.severity as any,
        title: rule.name,
        message: this.generateAlertMessage(rule, event),
        details: event,
        timestamp: now,
        resolved: false
      };

      // Armazenar alerta
      this.alerts.set(alert.id, alert);
      this.lastAlertTime.set(rule.id, now);

      // Enviar notificações
      await this.sendNotifications(alert, rule);

      console.log(`🚨 ALERTA GERADO: ${alert.title} - Severidade ${alert.severity}`);

    } catch (error) {
      console.error('Erro ao disparar alerta:', error);
    }
  }

  private determineAlertType(rule: AlertRule): RealTimeAlert['type'] {
    if (rule.id.includes('login') || rule.id.includes('admin') || rule.id.includes('unauthorized')) {
      return 'SECURITY';
    }
    if (rule.id.includes('performance') || rule.id.includes('slow')) {
      return 'PERFORMANCE';
    }
    if (rule.id.includes('error')) {
      return 'ERROR';
    }
    return 'SYSTEM';
  }

  private generateAlertMessage(rule: AlertRule, event: any): string {
    switch (rule.id) {
      case 'multiple_failed_logins':
        return `${event.consecutiveFailures} tentativas de login falhadas detectadas para ${event.email || 'utilizador desconhecido'}`;
      
      case 'admin_login_off_hours':
        return `Login de administrador detectado fora do horário comercial: ${event.email}`;
      
      case 'high_request_rate':
        return `Taxa elevada de requests detectada: ${event.requestsPerMinute} req/min do IP ${event.ip}`;
      
      case 'critical_server_error':
        return `Erro crítico do servidor: ${event.error} (Status ${event.statusCode})`;
      
      case 'unauthorized_admin_access':
        return `Tentativa de acesso não autorizado ao endpoint administrativo: ${event.endpoint}`;
      
      case 'performance_degradation':
        return `Response time elevado detectado: ${event.responseTime}ms no endpoint ${event.endpoint}`;
      
      case 'potential_ddos':
        return `Possível ataque DDoS detectado: ${event.totalRequests} requests de ${event.uniqueIPs} IPs únicos`;
      
      default:
        return `Evento de segurança detectado: ${rule.name}`;
    }
  }

  // ================================================
  // NOTIFICAÇÕES
  // ================================================

  private async sendNotifications(alert: RealTimeAlert, rule: AlertRule) {
    try {
      // Email alert
      if (rule.emailAlert && alert.severity >= 3) {
        await this.sendEmailAlert(alert);
      }

      // Slack alert (se configurado)
      if (rule.slackAlert && alert.severity >= 4) {
        await this.sendSlackAlert(alert);
      }

      // Persistir na base de dados
      await this.persistAlert(alert);

    } catch (error) {
      console.error('Erro ao enviar notificações:', error);
    }
  }

  private async sendEmailAlert(alert: RealTimeAlert) {
    try {
      // Enviar alerta de segurança usando o novo sistema de email
      await sendSecurityAlert(
        alert.title,
        alert.severity,
        alert.message,
        {
          ...alert.details,
          alertId: alert.id,
          timestamp: alert.timestamp.toISOString(),
          type: alert.type
        }
      );

      // Também criar entrada no sistema de alertas de segurança (base de dados)
      await createSecurityAlert(
        `REALTIME_${alert.type}`,
        alert.title,
        {
          ...alert.details,
          severity: alert.severity,
          timestamp: alert.timestamp,
          alertId: alert.id
        },
        alert.severity
      );
    } catch (error) {
      console.error('Erro ao enviar email de alerta:', error);
    }
  }

  private async sendSlackAlert(alert: RealTimeAlert) {
    // Implementar integração com Slack se necessário
    console.log('Slack alert enviado:', alert.title);
  }

  private async persistAlert(alert: RealTimeAlert) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      await supabase.from('security_alerts').insert([{
        alert_type: `REALTIME_${alert.type}`,
        severity: alert.severity,
        title: alert.title,
        description: alert.message,
        details: alert.details,
        status: 'OPEN',
        email_recipients: ['sintzyy@gmail.com']
      }]);

    } catch (error) {
      console.error('Erro ao persistir alerta:', error);
    }
  }

  // ================================================
  // GESTÃO DE ALERTAS
  // ================================================

  getActiveAlerts(): RealTimeAlert[] {
    return Array.from(this.alerts.values()).filter(a => !a.resolved);
  }

  getAlertsByType(type: RealTimeAlert['type']): RealTimeAlert[] {
    return Array.from(this.alerts.values()).filter(a => a.type === type);
  }

  resolveAlert(alertId: string) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.alerts.set(alertId, alert);
    }
  }

  getAlertStats() {
    const alerts = Array.from(this.alerts.values());
    return {
      total: alerts.length,
      active: alerts.filter(a => !a.resolved).length,
      byType: {
        SECURITY: alerts.filter(a => a.type === 'SECURITY').length,
        PERFORMANCE: alerts.filter(a => a.type === 'PERFORMANCE').length,
        ERROR: alerts.filter(a => a.type === 'ERROR').length,
        SYSTEM: alerts.filter(a => a.type === 'SYSTEM').length
      },
      bySeverity: {
        critical: alerts.filter(a => a.severity >= 4).length,
        warning: alerts.filter(a => a.severity === 3).length,
        info: alerts.filter(a => a.severity <= 2).length
      }
    };
  }
}

// ================================================
// INSTÂNCIA SINGLETON
// ================================================

export const alertSystem = new RealTimeAlertSystem();

// ================================================
// FUNÇÕES DE CONVENIÊNCIA
// ================================================

export async function triggerSecurityEvent(type: string, data: any) {
  await alertSystem.processEvent({
    type,
    ...data,
    timestamp: new Date()
  });
}

export async function triggerPerformanceEvent(responseTime: number, endpoint: string) {
  await alertSystem.processEvent({
    type: 'slow_response',
    responseTime,
    endpoint,
    timestamp: new Date()
  });
}

export async function triggerFailedLoginEvent(email: string, consecutiveFailures: number) {
  await alertSystem.processEvent({
    type: 'failed_login',
    email,
    consecutiveFailures,
    timestamp: new Date()
  });
}

export async function triggerAdminLoginEvent(email: string, ip?: string, userAgent?: string, location?: string) {
  // Enviar email de alerta imediatamente
  try {
    await sendAdminLoginAlert(email, ip || 'N/A', userAgent || 'N/A', location);
  } catch (error) {
    console.error('Erro ao enviar alerta de login admin:', error);
  }

  // Processar no sistema de alertas em tempo real
  await alertSystem.processEvent({
    type: 'admin_login',
    email,
    ip,
    userAgent,
    location,
    timestamp: new Date()
  });
}