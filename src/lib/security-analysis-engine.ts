import { supabase } from '@/lib/supabase-client';
import { createSecurityAlert } from '@/lib/logging-middleware';

// ================================================
// SISTEMA DE ANÁLISE DE SEGURANÇA AVANÇADA
// ================================================

interface SecurityPattern {
  id: string;
  name: string;
  description: string;
  severity: number;
  threshold: number;
  timeWindow: number; // em minutos
  conditions: SecurityCondition[];
}

interface SecurityCondition {
  field: string;
  operator: 'eq' | 'gt' | 'lt' | 'contains' | 'regex' | 'count';
  value: any;
  weight: number;
}

interface SecurityInsight {
  type: 'THREAT' | 'ANOMALY' | 'TREND' | 'RECOMMENDATION';
  severity: number;
  title: string;
  description: string;
  evidence: any[];
  recommendation: string;
  confidence: number; // 0-100
}

interface ThreatActor {
  id: string;
  ipAddresses: string[];
  userAgents: string[];
  countries: string[];
  firstSeen: Date;
  lastSeen: Date;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  activities: string[];
  patterns: string[];
}

class SecurityAnalysisEngine {
  private patterns: SecurityPattern[] = [];
  private threatActors: Map<string, ThreatActor> = new Map();

  constructor() {
    this.initializePatterns();
  }

  // ================================================
  // INICIALIZAÇÃO DOS PADRÕES
  // ================================================

  private initializePatterns() {
    this.patterns = [
      // Padrão: Ataques de força bruta distribuídos
      {
        id: 'distributed_bruteforce',
        name: 'Ataque de Força Bruta Distribuído',
        description: 'Múltiplos IPs tentando login na mesma conta',
        severity: 4,
        threshold: 80,
        timeWindow: 60,
        conditions: [
          { field: 'failed_logins', operator: 'count', value: 5, weight: 30 },
          { field: 'unique_ips', operator: 'gt', value: 3, weight: 25 },
          { field: 'user_agent_diversity', operator: 'gt', value: 2, weight: 20 },
          { field: 'geo_diversity', operator: 'gt', value: 1, weight: 25 }
        ]
      },

      // Padrão: Reconhecimento de sistema
      {
        id: 'system_reconnaissance',
        name: 'Reconhecimento de Sistema',
        description: 'Tentativas de descoberta de endpoints e vulnerabilidades',
        severity: 3,
        threshold: 70,
        timeWindow: 30,
        conditions: [
          { field: 'distinct_endpoints', operator: 'gt', value: 10, weight: 30 },
          { field: 'error_4xx_rate', operator: 'gt', value: 0.7, weight: 25 },
          { field: 'admin_endpoint_attempts', operator: 'gt', value: 3, weight: 35 },
          { field: 'suspicious_params', operator: 'count', value: 5, weight: 10 }
        ]
      },

      // Padrão: Exfiltração de dados
      {
        id: 'data_exfiltration',
        name: 'Possível Exfiltração de Dados',
        description: 'Padrões indicativos de extração massiva de dados',
        severity: 5,
        threshold: 85,
        timeWindow: 120,
        conditions: [
          { field: 'large_responses', operator: 'count', value: 10, weight: 30 },
          { field: 'api_calls_bulk', operator: 'gt', value: 100, weight: 25 },
          { field: 'off_hours_activity', operator: 'eq', value: true, weight: 20 },
          { field: 'privileged_access', operator: 'eq', value: true, weight: 25 }
        ]
      },

      // Padrão: Escalação de privilégios
      {
        id: 'privilege_escalation',
        name: 'Tentativa de Escalação de Privilégios',
        description: 'Comportamento indicativo de tentativa de obter acesso administrativo',
        severity: 5,
        threshold: 75,
        timeWindow: 60,
        conditions: [
          { field: 'admin_endpoint_access', operator: 'count', value: 3, weight: 40 },
          { field: 'role_enumeration', operator: 'count', value: 5, weight: 30 },
          { field: 'auth_bypass_attempts', operator: 'count', value: 2, weight: 30 }
        ]
      },

      // Padrão: Atividade bot maliciosa
      {
        id: 'malicious_bot',
        name: 'Atividade de Bot Malicioso',
        description: 'Comportamento automatizado suspeito',
        severity: 3,
        threshold: 70,
        timeWindow: 15,
        conditions: [
          { field: 'request_frequency', operator: 'gt', value: 10, weight: 25 },
          { field: 'user_agent_anomaly', operator: 'eq', value: true, weight: 20 },
          { field: 'no_referrer', operator: 'eq', value: true, weight: 15 },
          { field: 'pattern_repetition', operator: 'gt', value: 0.8, weight: 25 },
          { field: 'human_behavior_score', operator: 'lt', value: 0.3, weight: 15 }
        ]
      }
    ];
  }

  // ================================================
  // ANÁLISE PRINCIPAL
  // ================================================

  async analyzeSecurityEvents(): Promise<SecurityInsight[]> {
    try {
      const insights: SecurityInsight[] = [];
      
      // Executar análise de padrões
      const patternInsights = await this.analyzePatterns();
      insights.push(...patternInsights);

      // Análise de anomalias comportamentais
      const anomalyInsights = await this.detectAnomalies();
      insights.push(...anomalyInsights);

      // Análise de tendências de segurança
      const trendInsights = await this.analyzeTrends();
      insights.push(...trendInsights);

      // Análise de atores de ameaça
      const threatInsights = await this.analyzeThreatActors();
      insights.push(...threatInsights);

      // Gerar recomendações
      const recommendations = await this.generateRecommendations(insights);
      insights.push(...recommendations);

      return insights.sort((a, b) => b.severity - a.severity);

    } catch (error) {
      console.error('Erro na análise de segurança:', error);
      return [];
    }
  }

  // ================================================
  // ANÁLISE DE PADRÕES
  // ================================================

  private async analyzePatterns(): Promise<SecurityInsight[]> {
    const insights: SecurityInsight[] = [];

    for (const pattern of this.patterns) {
      try {
        const score = await this.calculatePatternScore(pattern);
        
        if (score >= pattern.threshold) {
          const evidence = await this.gatherPatternEvidence(pattern);
          
          insights.push({
            type: 'THREAT',
            severity: pattern.severity,
            title: pattern.name,
            description: `${pattern.description} (Score: ${score}/${pattern.threshold})`,
            evidence,
            recommendation: this.getPatternRecommendation(pattern.id),
            confidence: Math.min(95, Math.floor((score / pattern.threshold) * 85) + 10)
          });

          // Criar alerta de segurança se severidade alta
          if (pattern.severity >= 4) {
            await createSecurityAlert(
              `PATTERN_${pattern.id.toUpperCase()}`,
              pattern.name,
              {
                score,
                threshold: pattern.threshold,
                evidence: evidence.slice(0, 5), // Limitar evidências no alerta
                confidence: Math.floor((score / pattern.threshold) * 100)
              },
              pattern.severity
            );
          }
        }
      } catch (error) {
        console.error(`Erro ao analisar padrão ${pattern.id}:`, error);
      }
    }

    return insights;
  }

  private async calculatePatternScore(pattern: SecurityPattern): Promise<number> {
    let totalScore = 0;
    const timeWindow = new Date(Date.now() - pattern.timeWindow * 60 * 1000);

    for (const condition of pattern.conditions) {
      const conditionScore = await this.evaluateCondition(condition, timeWindow);
      totalScore += conditionScore * condition.weight;
    }

    return Math.floor(totalScore);
  }

  private async evaluateCondition(condition: SecurityCondition, since: Date): Promise<number> {
    try {
      switch (condition.field) {
        case 'failed_logins':
          return await this.countFailedLogins(since);
          
        case 'unique_ips':
          return await this.countUniqueIPs(since);
          
        case 'distinct_endpoints':
          return await this.countDistinctEndpoints(since);
          
        case 'error_4xx_rate':
          return await this.calculate4xxErrorRate(since);
          
        case 'admin_endpoint_attempts':
          return await this.countAdminEndpointAttempts(since);
          
        default:
          return 0;
      }
    } catch (error) {
      console.error(`Erro ao avaliar condição ${condition.field}:`, error);
      return 0;
    }
  }

  // ================================================
  // MÉTRICAS ESPECÍFICAS
  // ================================================

  private async countFailedLogins(since: Date): Promise<number> {
    const { count } = await supabase
      .from('logs')
      .select('id', { count: 'exact' })
      .eq('category', 'AUTHENTICATION')
      .eq('level', 'WARNING')
      .gte('created_at', since.toISOString());
    
    return count || 0;
  }

  private async countUniqueIPs(since: Date): Promise<number> {
    const { data } = await supabase
      .from('logs')
      .select('ip_address')
      .gte('created_at', since.toISOString())
      .not('ip_address', 'is', null);
    
    const uniqueIPs = new Set(data?.map(log => log.ip_address));
    return uniqueIPs.size;
  }

  private async countDistinctEndpoints(since: Date): Promise<number> {
    const { data } = await supabase
      .from('logs')
      .select('url')
      .gte('created_at', since.toISOString())
      .not('url', 'is', null);
    
    const uniqueEndpoints = new Set(data?.map(log => {
      try {
        return new URL(log.url).pathname;
      } catch {
        return log.url;
      }
    }));
    
    return uniqueEndpoints.size;
  }

  private async calculate4xxErrorRate(since: Date): Promise<number> {
    const { count: totalRequests } = await supabase
      .from('logs')
      .select('id', { count: 'exact' })
      .gte('created_at', since.toISOString())
      .not('status_code', 'is', null);

    const { count: errorRequests } = await supabase
      .from('logs')
      .select('id', { count: 'exact' })
      .gte('created_at', since.toISOString())
      .gte('status_code', 400)
      .lt('status_code', 500);

    if (!totalRequests || totalRequests === 0) return 0;
    return (errorRequests || 0) / totalRequests;
  }

  private async countAdminEndpointAttempts(since: Date): Promise<number> {
    const { count } = await supabase
      .from('logs')
      .select('id', { count: 'exact' })
      .gte('created_at', since.toISOString())
      .or('url.ilike.%/admin%,url.ilike.%/api/admin%');
    
    return count || 0;
  }

  // ================================================
  // DETECÇÃO DE ANOMALIAS
  // ================================================

  private async detectAnomalies(): Promise<SecurityInsight[]> {
    const insights: SecurityInsight[] = [];

    try {
      // Anomalia: Pico súbito de tráfego
      const trafficAnomaly = await this.detectTrafficAnomaly();
      if (trafficAnomaly) insights.push(trafficAnomaly);

      // Anomalia: Padrões de acesso incomuns
      const accessAnomaly = await this.detectAccessPatternAnomaly();
      if (accessAnomaly) insights.push(accessAnomaly);

      // Anomalia: Geolocalização suspeita
      const geoAnomaly = await this.detectGeolocationAnomaly();
      if (geoAnomaly) insights.push(geoAnomaly);

    } catch (error) {
      console.error('Erro na detecção de anomalias:', error);
    }

    return insights;
  }

  private async detectTrafficAnomaly(): Promise<SecurityInsight | null> {
    // Comparar última hora com média das últimas 24 horas
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const { count: recentTraffic } = await supabase
      .from('logs')
      .select('id', { count: 'exact' })
      .gte('created_at', lastHour.toISOString());

    const { count: historicalTraffic } = await supabase
      .from('logs')
      .select('id', { count: 'exact' })
      .gte('created_at', last24Hours.toISOString())
      .lt('created_at', lastHour.toISOString());

    const avgHourlyTraffic = (historicalTraffic || 0) / 23;
    const currentTraffic = recentTraffic || 0;

    // Se tráfego atual é 3x maior que a média
    if (currentTraffic > avgHourlyTraffic * 3 && currentTraffic > 100) {
      return {
        type: 'ANOMALY',
        severity: 3,
        title: 'Pico Anômalo de Tráfego',
        description: `Tráfego atual (${currentTraffic} req/h) é ${Math.floor(currentTraffic / avgHourlyTraffic)}x maior que a média (${Math.floor(avgHourlyTraffic)} req/h)`,
        evidence: [
          { metric: 'current_traffic', value: currentTraffic },
          { metric: 'average_traffic', value: Math.floor(avgHourlyTraffic) },
          { metric: 'multiplier', value: Math.floor(currentTraffic / avgHourlyTraffic) }
        ],
        recommendation: 'Verificar origem do tráfego e considerar implementar rate limiting',
        confidence: 85
      };
    }

    return null;
  }

  private async detectAccessPatternAnomaly(): Promise<SecurityInsight | null> {
    // Detectar acessos em horários incomuns para utilizadores administrativos
    const hour = new Date().getHours();
    const isOffHours = hour < 6 || hour > 22;

    if (isOffHours) {
      const since = new Date(Date.now() - 60 * 60 * 1000); // Última hora
      
      const { count: adminAccess } = await supabase
        .from('logs')
        .select('id', { count: 'exact' })
        .gte('created_at', since.toISOString())
        .eq('user_role', 'ADMIN');

      if (adminAccess && adminAccess > 0) {
        return {
          type: 'ANOMALY',
          severity: 2,
          title: 'Acesso Administrativo Fora de Horas',
          description: `${adminAccess} acessos administrativos detectados às ${hour}h`,
          evidence: [
            { metric: 'admin_accesses', value: adminAccess },
            { metric: 'hour', value: hour },
            { metric: 'off_hours', value: true }
          ],
          recommendation: 'Verificar legitimidade dos acessos administrativos fora do horário comercial',
          confidence: 70
        };
      }
    }

    return null;
  }

  private async detectGeolocationAnomaly(): Promise<SecurityInsight | null> {
    // Esta função seria implementada com dados de geolocalização
    // Por simplicidade, retorna null por agora
    return null;
  }

  // ================================================
  // ANÁLISE DE TENDÊNCIAS
  // ================================================

  private async analyzeTrends(): Promise<SecurityInsight[]> {
    const insights: SecurityInsight[] = [];

    try {
      // Tendência: Aumento de tentativas de login falhadas
      const loginTrend = await this.analyzeLoginFailureTrend();
      if (loginTrend) insights.push(loginTrend);

      // Tendência: Aumento de erros de servidor
      const errorTrend = await this.analyzeErrorTrend();
      if (errorTrend) insights.push(errorTrend);

    } catch (error) {
      console.error('Erro na análise de tendências:', error);
    }

    return insights;
  }

  private async analyzeLoginFailureTrend(): Promise<SecurityInsight | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [todayFailures, yesterdayFailures, weekFailures] = await Promise.all([
      this.countFailedLogins(today),
      this.countFailedLogins(yesterday),
      this.countFailedLogins(weekAgo)
    ]);

    const avgWeeklyFailures = weekFailures / 7;
    
    if (todayFailures > avgWeeklyFailures * 2 && todayFailures > 10) {
      return {
        type: 'TREND',
        severity: 2,
        title: 'Tendência de Aumento em Falhas de Login',
        description: `Falhas de login hoje (${todayFailures}) são ${Math.floor(todayFailures / avgWeeklyFailures)}x maior que a média semanal`,
        evidence: [
          { metric: 'today_failures', value: todayFailures },
          { metric: 'yesterday_failures', value: yesterdayFailures },
          { metric: 'weekly_average', value: Math.floor(avgWeeklyFailures) }
        ],
        recommendation: 'Monitorar tentativas de login e considerar implementar CAPTCHA',
        confidence: 75
      };
    }

    return null;
  }

  private async analyzeErrorTrend(): Promise<SecurityInsight | null> {
    // Implementação similar à tendência de login
    return null;
  }

  // ================================================
  // ANÁLISE DE ATORES DE AMEAÇA
  // ================================================

  private async analyzeThreatActors(): Promise<SecurityInsight[]> {
    const insights: SecurityInsight[] = [];

    try {
      // Identificar IPs suspeitos
      const suspiciousIPs = await this.identifySuspiciousIPs();
      
      for (const ip of suspiciousIPs) {
        const actor = await this.analyzeThreatActor(ip);
        if (actor) {
          insights.push({
            type: 'THREAT',
            severity: this.getThreatActorSeverity(actor.threatLevel),
            title: `Ator de Ameaça Identificado: ${ip}`,
            description: `IP suspeito com nível de ameaça ${actor.threatLevel}`,
            evidence: [
              { metric: 'ip_address', value: ip },
              { metric: 'threat_level', value: actor.threatLevel },
              { metric: 'activities', value: actor.activities },
              { metric: 'first_seen', value: actor.firstSeen },
              { metric: 'last_seen', value: actor.lastSeen }
            ],
            recommendation: this.getThreatActorRecommendation(actor.threatLevel),
            confidence: 80
          });
        }
      }

    } catch (error) {
      console.error('Erro na análise de atores de ameaça:', error);
    }

    return insights;
  }

  private async identifySuspiciousIPs(): Promise<string[]> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // Últimas 24 horas

    const { data } = await supabase
      .from('logs')
      .select('ip_address')
      .gte('created_at', since.toISOString())
      .in('level', ['WARNING', 'ERROR'])
      .not('ip_address', 'is', null);

    // Contar ocorrências por IP
    const ipCounts = new Map<string, number>();
    data?.forEach(log => {
      const ip = log.ip_address;
      ipCounts.set(ip, (ipCounts.get(ip) || 0) + 1);
    });

    // Retornar IPs com mais de 10 eventos suspeitos
    return Array.from(ipCounts.entries())
      .filter(([_, count]) => count >= 10)
      .map(([ip, _]) => ip);
  }

  private async analyzeThreatActor(ip: string): Promise<ThreatActor | null> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Última semana

    const { data } = await supabase
      .from('logs')
      .select('*')
      .eq('ip_address', ip)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true });

    if (!data || data.length === 0) return null;

    const userAgents = new Set(data.map(log => log.user_agent).filter(Boolean));
    const activities = data.map(log => log.category).filter(Boolean);
    const firstSeen = new Date(data[0].created_at);
    const lastSeen = new Date(data[data.length - 1].created_at);

    // Calcular nível de ameaça baseado em atividades
    const threatLevel = this.calculateThreatLevel(data);

    return {
      id: ip,
      ipAddresses: [ip],
      userAgents: Array.from(userAgents),
      countries: [], // Seria obtido de serviço de geolocalização
      firstSeen,
      lastSeen,
      threatLevel,
      activities: Array.from(new Set(activities)),
      patterns: [] // Seria análise mais avançada
    };
  }

  private calculateThreatLevel(logs: any[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    let score = 0;

    // Fatores de scoring
    const errorCount = logs.filter(l => l.level === 'ERROR').length;
    const warningCount = logs.filter(l => l.level === 'WARNING').length;
    const adminAttempts = logs.filter(l => l.url?.includes('/admin')).length;
    const authAttempts = logs.filter(l => l.category === 'AUTHENTICATION').length;

    score += errorCount * 3;
    score += warningCount * 2;
    score += adminAttempts * 5;
    score += authAttempts * 2;

    if (score >= 50) return 'CRITICAL';
    if (score >= 25) return 'HIGH';
    if (score >= 10) return 'MEDIUM';
    return 'LOW';
  }

  private getThreatActorSeverity(threatLevel: string): number {
    switch (threatLevel) {
      case 'CRITICAL': return 5;
      case 'HIGH': return 4;
      case 'MEDIUM': return 3;
      case 'LOW': return 2;
      default: return 1;
    }
  }

  private getThreatActorRecommendation(threatLevel: string): string {
    switch (threatLevel) {
      case 'CRITICAL': return 'Bloquear IP imediatamente e investigar todos os acessos';
      case 'HIGH': return 'Monitorar intensivamente e considerar bloqueio temporário';
      case 'MEDIUM': return 'Adicionar à lista de observação e aumentar monitoramento';
      case 'LOW': return 'Continuar monitoramento normal';
      default: return 'Nenhuma ação necessária';
    }
  }

  // ================================================
  // RECOMENDAÇÕES
  // ================================================

  private async generateRecommendations(insights: SecurityInsight[]): Promise<SecurityInsight[]> {
    const recommendations: SecurityInsight[] = [];

    // Analisar padrões nos insights para gerar recomendações
    const securityInsights = insights.filter(i => i.type === 'THREAT');
    const anomalies = insights.filter(i => i.type === 'ANOMALY');

    if (securityInsights.length > 3) {
      recommendations.push({
        type: 'RECOMMENDATION',
        severity: 3,
        title: 'Múltiplas Ameaças Detectadas',
        description: `${securityInsights.length} ameaças ativas identificadas`,
        evidence: securityInsights.map(i => ({ threat: i.title, severity: i.severity })),
        recommendation: 'Implementar monitoramento intensivo e considerar medidas de segurança adicionais',
        confidence: 90
      });
    }

    if (anomalies.length > 2) {
      recommendations.push({
        type: 'RECOMMENDATION',
        severity: 2,
        title: 'Padrões Anômalos Detectados',
        description: `${anomalies.length} anomalias comportamentais identificadas`,
        evidence: anomalies.map(a => ({ anomaly: a.title, confidence: a.confidence })),
        recommendation: 'Revisar configurações de segurança e atualizar baselines de comportamento normal',
        confidence: 85
      });
    }

    return recommendations;
  }

  // ================================================
  // HELPERS
  // ================================================

  private async gatherPatternEvidence(pattern: SecurityPattern): Promise<any[]> {
    const evidence: any[] = [];
    const timeWindow = new Date(Date.now() - pattern.timeWindow * 60 * 1000);

    // Buscar logs relevantes para o padrão
    const { data } = await supabase
      .from('logs')
      .select('*')
      .gte('created_at', timeWindow.toISOString())
      .limit(10);

    return data || [];
  }

  private getPatternRecommendation(patternId: string): string {
    const recommendations: Record<string, string> = {
      'distributed_bruteforce': 'Implementar rate limiting baseado em IP e email, considerar CAPTCHA após 3 tentativas',
      'system_reconnaissance': 'Implementar WAF (Web Application Firewall) e bloquear IPs suspeitos',
      'data_exfiltration': 'Investigar imediatamente, revisar logs de acesso a dados sensíveis',
      'privilege_escalation': 'Auditoria completa de permissões e logs de acesso administrativo',
      'malicious_bot': 'Implementar detecção de bots e CAPTCHA para requests suspeitos'
    };

    return recommendations[patternId] || 'Investigar atividade suspeita e implementar contramedidas apropriadas';
  }
}

// ================================================
// INSTÂNCIA SINGLETON
// ================================================

export const securityAnalysisEngine = new SecurityAnalysisEngine();

// ================================================
// FUNÇÕES DE API
// ================================================

export async function generateSecurityReport(): Promise<SecurityInsight[]> {
  return await securityAnalysisEngine.analyzeSecurityEvents();
}

export async function getSecurityMetrics() {
  const insights = await generateSecurityReport();
  
  return {
    totalThreats: insights.filter(i => i.type === 'THREAT').length,
    totalAnomalies: insights.filter(i => i.type === 'ANOMALY').length,
    criticalInsights: insights.filter(i => i.severity >= 4).length,
    avgConfidence: Math.floor(insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length) || 0,
    recommendations: insights.filter(i => i.type === 'RECOMMENDATION').length
  };
}