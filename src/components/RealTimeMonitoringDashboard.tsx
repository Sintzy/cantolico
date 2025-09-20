'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Clock, 
  CheckCircle,
  XCircle,
  Bell,
  BarChart3,
  RefreshCw
} from 'lucide-react';

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

interface AlertStats {
  total: number;
  active: number;
  byType: {
    SECURITY: number;
    PERFORMANCE: number;
    ERROR: number;
    SYSTEM: number;
  };
  bySeverity: {
    critical: number;
    warning: number;
    info: number;
  };
}

export default function RealTimeMonitoringDashboard() {
  const [alerts, setAlerts] = useState<RealTimeAlert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // ================================================
  // EFEITOS
  // ================================================

  useEffect(() => {
    loadData();
    
    // Auto-refresh a cada 30 segundos
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadData, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  // ================================================
  // FUNÇÕES
  // ================================================

  const loadData = async () => {
    try {
      const [alertsRes, statsRes] = await Promise.all([
        fetch('/api/logs/realtime-alerts?action=active-alerts'),
        fetch('/api/logs/realtime-alerts?action=stats')
      ]);

      if (alertsRes.ok && statsRes.ok) {
        const alertsData = await alertsRes.json();
        const statsData = await statsRes.json();
        
        setAlerts(alertsData.data);
        setStats(statsData.data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/logs/realtime-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', alertId })
      });

      if (response.ok) {
        await loadData(); // Recarregar dados
      }
    } catch (error) {
      console.error('Erro ao resolver alerta:', error);
    }
  };

  const testAlert = async () => {
    try {
      await fetch('/api/logs/realtime-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-alert' })
      });
      
      setTimeout(loadData, 1000); // Recarregar após 1 segundo
    } catch (error) {
      console.error('Erro ao criar alerta de teste:', error);
    }
  };

  // ================================================
  // HELPERS
  // ================================================

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 5: return 'destructive';
      case 4: return 'destructive';
      case 3: return 'warning';
      case 2: return 'secondary';
      case 1: return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityText = (severity: number) => {
    switch (severity) {
      case 5: return 'Crítico';
      case 4: return 'Alto';
      case 3: return 'Médio';
      case 2: return 'Baixo';
      case 1: return 'Info';
      default: return 'Desconhecido';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SECURITY': return <Shield className="w-4 h-4" />;
      case 'PERFORMANCE': return <Activity className="w-4 h-4" />;
      case 'ERROR': return <XCircle className="w-4 h-4" />;
      case 'SYSTEM': return <BarChart3 className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleString('pt-PT');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Carregando dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monitoramento em Tempo Real</h1>
          <p className="text-sm text-muted-foreground">
            Última atualização: {formatTime(lastUpdate)}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Pausar' : 'Iniciar'} Auto-refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={testAlert}
          >
            Testar Alerta
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas Ativos</CardTitle>
              <Bell className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground">
                de {stats.total} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Segurança</CardTitle>
              <Shield className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.byType.SECURITY}</div>
              <p className="text-xs text-muted-foreground">
                alertas de segurança
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              <Activity className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.byType.PERFORMANCE}</div>
              <p className="text-xs text-muted-foreground">
                alertas de performance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Críticos</CardTitle>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.bySeverity.critical}</div>
              <p className="text-xs text-muted-foreground">
                severidade alta/crítica
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas Ativos</CardTitle>
          <CardDescription>
            Eventos em tempo real que requerem atenção
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Tudo sob controle!</h3>
              <p className="text-muted-foreground">
                Não há alertas ativos no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((alert) => (
                <Alert key={alert.id} className="relative">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getTypeIcon(alert.type)}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{alert.title}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getSeverityColor(alert.severity) as any}>
                            {getSeverityText(alert.severity)}
                          </Badge>
                          <Badge variant="outline">{alert.type}</Badge>
                        </div>
                      </div>
                      
                      <AlertDescription>
                        {alert.message}
                      </AlertDescription>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(alert.timestamp)}</span>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveAlert(alert.id)}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Resolver
                        </Button>
                      </div>
                      
                      {/* Details */}
                      {alert.details && Object.keys(alert.details).length > 0 && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Ver detalhes
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(alert.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}