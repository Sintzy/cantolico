'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  Brain,
  Target,
  Activity,
  Eye,
  Zap,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface SecurityInsight {
  type: 'THREAT' | 'ANOMALY' | 'TREND' | 'RECOMMENDATION';
  severity: number;
  title: string;
  description: string;
  evidence: any[];
  recommendation: string;
  confidence: number;
}

interface SecurityMetrics {
  totalThreats: number;
  totalAnomalies: number;
  criticalInsights: number;
  avgConfidence: number;
  recommendations: number;
}

export default function SecurityAnalysisPage() {
  const [insights, setInsights] = useState<SecurityInsight[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/logs/security-analysis?type=full');
      
      if (response.ok) {
        const data = await response.json();
        setInsights(data.data.insights);
        setMetrics(data.data.metrics);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Erro ao carregar análise de segurança:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      const response = await fetch('/api/logs/security-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-analysis' })
      });

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Erro ao executar análise:', error);
    } finally {
      setAnalyzing(false);
    }
  };

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
      case 'THREAT': return <Target className="w-4 h-4" />;
      case 'ANOMALY': return <AlertTriangle className="w-4 h-4" />;
      case 'TREND': return <TrendingUp className="w-4 h-4" />;
      case 'RECOMMENDATION': return <Brain className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'THREAT': return 'text-red-500';
      case 'ANOMALY': return 'text-yellow-500';
      case 'TREND': return 'text-blue-500';
      case 'RECOMMENDATION': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString('pt-PT');
  };

  const filterInsightsByType = (type: string) => {
    return insights.filter(insight => insight.type === type);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Executando análise de segurança...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Análise de Segurança Avançada</h1>
          <p className="text-sm text-muted-foreground">
            Última análise: {formatTime(lastUpdate)}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          
          <Button
            size="sm"
            onClick={runAnalysis}
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <Zap className="w-4 h-4 mr-2 animate-pulse" />
                Analisando...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Executar Análise
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ameaças</CardTitle>
              <Target className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.totalThreats}</div>
              <p className="text-xs text-muted-foreground">ativas detectadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Anomalias</CardTitle>
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{metrics.totalAnomalies}</div>
              <p className="text-xs text-muted-foreground">comportamentais</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Críticos</CardTitle>
              <Shield className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.criticalInsights}</div>
              <p className="text-xs text-muted-foreground">alta prioridade</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confiança</CardTitle>
              <BarChart3 className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{metrics.avgConfidence}%</div>
              <p className="text-xs text-muted-foreground">média de precisão</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recomendações</CardTitle>
              <Brain className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.recommendations}</div>
              <p className="text-xs text-muted-foreground">sugestões geradas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analysis Results */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">Todos ({insights.length})</TabsTrigger>
          <TabsTrigger value="threats">
            Ameaças ({filterInsightsByType('THREAT').length})
          </TabsTrigger>
          <TabsTrigger value="anomalies">
            Anomalias ({filterInsightsByType('ANOMALY').length})
          </TabsTrigger>
          <TabsTrigger value="trends">
            Tendências ({filterInsightsByType('TREND').length})
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            Recomendações ({filterInsightsByType('RECOMMENDATION').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <InsightsList insights={insights} />
        </TabsContent>

        <TabsContent value="threats">
          <InsightsList insights={filterInsightsByType('THREAT')} />
        </TabsContent>

        <TabsContent value="anomalies">
          <InsightsList insights={filterInsightsByType('ANOMALY')} />
        </TabsContent>

        <TabsContent value="trends">
          <InsightsList insights={filterInsightsByType('TREND')} />
        </TabsContent>

        <TabsContent value="recommendations">
          <InsightsList insights={filterInsightsByType('RECOMMENDATION')} />
        </TabsContent>
      </Tabs>
    </div>
  );

  function InsightsList({ insights }: { insights: SecurityInsight[] }) {
    if (insights.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-8">
            <Eye className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum item encontrado</h3>
            <p className="text-muted-foreground">
              Não há insights desta categoria no momento.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {insights
          .sort((a, b) => b.severity - a.severity)
          .map((insight, index) => (
          <Alert key={index} className="relative">
            <div className="flex items-start space-x-3">
              <div className={`flex-shrink-0 mt-1 ${getTypeColor(insight.type)}`}>
                {getTypeIcon(insight.type)}
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{insight.title}</h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getSeverityColor(insight.severity) as any}>
                      {getSeverityText(insight.severity)}
                    </Badge>
                    <Badge variant="outline">{insight.type}</Badge>
                    <Badge variant="secondary">{insight.confidence}% confiança</Badge>
                  </div>
                </div>
                
                <AlertDescription>
                  {insight.description}
                </AlertDescription>
                
                {insight.recommendation && (
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Recomendação:
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {insight.recommendation}
                    </p>
                  </div>
                )}
                
                {insight.evidence && insight.evidence.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Ver evidências ({insight.evidence.length})
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                      {JSON.stringify(insight.evidence, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </Alert>
        ))}
      </div>
    );
  }
}