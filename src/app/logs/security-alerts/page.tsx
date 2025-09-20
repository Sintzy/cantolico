'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Shield,
  AlertTriangle,
  AlertCircle,
  Clock,
  User,
  Eye,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Mail,
  MoreHorizontal
} from 'lucide-react';
import { useLogger } from '@/hooks/useLogger';

// ================================================
// INTERFACES
// ================================================

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: number;
  title: string;
  description: string;
  status: string;
  acknowledged_by: string | null; // ID do utilizador que reconheceu
  acknowledged_at: string;
  resolved_at: string;
  email_sent: boolean;
  email_sent_at: string;
  email_recipients: string[];
  created_at: string;
  updated_at: string;
  logs: {
    id: string;
    level: string;
    category: string;
    message: string;
    user_email: string;
    ip_address: string;
    created_at: string;
  };
}

interface AlertFilters {
  status: string;
  severity: string;
  alertType: string;
  search: string;
}

// ================================================
// CONSTANTES
// ================================================

const SEVERITY_COLORS = {
  1: 'bg-blue-100 text-blue-800 border-blue-300',
  2: 'bg-green-100 text-green-800 border-green-300',
  3: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  4: 'bg-orange-100 text-orange-800 border-orange-300',
  5: 'bg-red-100 text-red-800 border-red-300',
};

const SEVERITY_ICONS = {
  1: CheckCircle,
  2: CheckCircle,
  3: AlertTriangle,
  4: AlertCircle,
  5: XCircle,
};

const STATUS_COLORS = {
  ACTIVE: 'bg-red-100 text-red-800',
  ACKNOWLEDGED: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  IGNORED: 'bg-gray-100 text-gray-800',
};

const SEVERITY_LABELS = {
  1: 'Muito Baixa',
  2: 'Baixa',
  3: 'Média',
  4: 'Alta',
  5: 'Crítica',
};

// ================================================
// COMPONENTE PRINCIPAL
// ================================================

export default function SecurityAlertsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const logger = useLogger();
  
  // Estado
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    critical: 0,
    resolved: 0
  });
  
  // Filtros
  const [filters, setFilters] = useState<AlertFilters>({
    status: 'all',
    severity: 'all',
    alertType: '',
    search: ''
  });
  
  // Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  // ================================================
  // VERIFICAÇÕES DE AUTORIZAÇÃO
  // ================================================

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    // Log de acesso aos alertas
    // logger.security('Acesso aos alertas de segurança', {
    //   userRole: session.user.role,
    //   timestamp: new Date().toISOString()
    // });
  }, [session, status, router]);

  // ================================================
  // FUNÇÕES DE DADOS
  // ================================================

  const fetchAlerts = useCallback(async (resetPage = false) => {
    if (resetPage) setPage(1);
    
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: resetPage ? '1' : page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      });

      const response = await fetch(`/api/logs/security-alerts?${queryParams}`);
      const data = await response.json();

      if (response.ok) {
        setAlerts(data.alerts);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.totalCount);
        
        // Calcular estatísticas
        const newStats = {
          total: data.pagination.totalCount,
          active: data.alerts.filter((alert: SecurityAlert) => 
            alert.status === 'ACTIVE'
          ).length,
          critical: data.alerts.filter((alert: SecurityAlert) => 
            alert.severity >= 4
          ).length,
          resolved: data.alerts.filter((alert: SecurityAlert) => 
            alert.status === 'RESOLVED'
          ).length
        };
        setStats(newStats);
        
      } else {
        console.error('Erro ao carregar alertas:', data.error);
        // logger.error('SECURITY', 'Erro ao carregar alertas de segurança', { 
        //   error: data.error, 
        //   filters 
        // });
      }
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
      // logger.error('SECURITY', 'Erro ao carregar alertas de segurança', { 
      //   error: error instanceof Error ? error.message : 'Erro desconhecido',
      //   filters 
      // });
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  const refreshAlerts = async () => {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
    
    // logger.info('SECURITY', 'Alertas de segurança atualizados manualmente', {
    //   totalCount,
    //   filters
    // });
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/logs/security-alerts/${alertId}/acknowledge`, {
        method: 'PATCH'
      });

      if (response.ok) {
        await fetchAlerts();
        // logger.security('Alerta de segurança reconhecido', {
        //   alertId,
        //   acknowledgedBy: session?.user?.email
        // });
      }
    } catch (error) {
      console.error('Erro ao reconhecer alerta:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/logs/security-alerts/${alertId}/resolve`, {
        method: 'PATCH'
      });

      if (response.ok) {
        await fetchAlerts();
        // logger.security('Alerta de segurança resolvido', {
        //   alertId,
        //   resolvedBy: session?.user?.email
        // });
      }
    } catch (error) {
      console.error('Erro ao resolver alerta:', error);
    }
  };

  // ================================================
  // EFEITOS
  // ================================================

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchAlerts();
    }
  }, [fetchAlerts, session]);

  // ================================================
  // HANDLERS
  // ================================================

  const handleFilterChange = (key: keyof AlertFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSearch = () => {
    fetchAlerts(true);
  };

  const clearFilters = () => {
    setFilters({
      status: 'ACTIVE',
      severity: '',
      alertType: '',
      search: ''
    });
    setPage(1);
  };

  // ================================================
  // FUNÇÕES AUXILIARES
  // ================================================

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('pt-PT');
  };

  const getSeverityIcon = (severity: number) => {
    const Icon = SEVERITY_ICONS[severity as keyof typeof SEVERITY_ICONS] || AlertTriangle;
    return Icon;
  };

  // ================================================
  // RENDERIZAÇÃO
  // ================================================

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/logs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar aos logs
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-8 w-8 text-orange-500" />
              Alertas de Segurança
            </h1>
            <p className="text-gray-600 mt-1">
              Monitorização e gestão de eventos críticos de segurança
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={refreshAlerts} 
            variant="outline" 
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Link href="/logs/analytics">
            <Button variant="outline">
              Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alertas</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Período filtrado
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              Requerem atenção
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Críticos</CardTitle>
            <XCircle className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.critical}</div>
            <p className="text-xs text-muted-foreground">
              Severidade alta/crítica
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolvidos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">
              Tratados com sucesso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Pesquisar títulos ou descrições..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="ACTIVE">Ativo</SelectItem>
                <SelectItem value="ACKNOWLEDGED">Reconhecido</SelectItem>
                <SelectItem value="RESOLVED">Resolvido</SelectItem>
                <SelectItem value="IGNORED">Ignorado</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.severity} onValueChange={(value) => handleFilterChange('severity', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as severidades</SelectItem>
                <SelectItem value="1">1 - Muito Baixa</SelectItem>
                <SelectItem value="2">2 - Baixa</SelectItem>
                <SelectItem value="3">3 - Média</SelectItem>
                <SelectItem value="4">4 - Alta</SelectItem>
                <SelectItem value="5">5 - Crítica</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex gap-2">
              <Button onClick={handleSearch} className="flex-1">
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
              <Button onClick={clearFilters} variant="outline">
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Alertas */}
      <Card>
        <CardHeader>
          <CardTitle>
            Alertas de Segurança ({totalCount} registos)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-blue-500 bg-blue-100">
                <RefreshCw className="animate-spin -ml-1 mr-3 h-5 w-5" />
                Carregando alertas...
              </div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum alerta encontrado com os filtros aplicados</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {alerts.map((alert) => {
                const SeverityIcon = getSeverityIcon(alert.severity);
                return (
                  <div key={alert.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="flex-shrink-0">
                          <SeverityIcon 
                            className={`h-6 w-6 ${
                              alert.severity >= 4 ? 'text-red-500' : 
                              alert.severity >= 3 ? 'text-yellow-500' : 
                              'text-blue-500'
                            }`} 
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge 
                              variant="outline" 
                              className={SEVERITY_COLORS[alert.severity as keyof typeof SEVERITY_COLORS]}
                            >
                              Severidade {alert.severity} - {SEVERITY_LABELS[alert.severity as keyof typeof SEVERITY_LABELS]}
                            </Badge>
                            <Badge 
                              variant="outline"
                              className={STATUS_COLORS[alert.status as keyof typeof STATUS_COLORS]}
                            >
                              {alert.status}
                            </Badge>
                            <Badge variant="outline">{alert.alert_type}</Badge>
                            {alert.email_sent && (
                              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                <Mail className="h-3 w-3 mr-1" />
                                Email enviado
                              </Badge>
                            )}
                          </div>
                          
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {alert.title}
                          </h3>
                          
                          <p className="text-sm text-gray-700 mb-3">
                            {alert.description}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDate(alert.created_at)}
                            </span>
                            {alert.logs?.user_email && (
                              <span className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                {alert.logs.user_email}
                              </span>
                            )}
                            {alert.logs?.ip_address && (
                              <span>
                                IP: {alert.logs.ip_address}
                              </span>
                            )}
                            {alert.acknowledged_at && (
                              <span className="text-yellow-600">
                                Reconhecido em {formatDate(alert.acknowledged_at)}
                              </span>
                            )}
                            {alert.resolved_at && (
                              <span className="text-green-600">
                                Resolvido em {formatDate(alert.resolved_at)}
                              </span>
                            )}
                          </div>
                          
                          {alert.logs && (
                            <div className="mt-3 p-3 bg-gray-50 rounded border">
                              <p className="text-sm font-medium text-gray-900 mb-1">
                                Log Relacionado:
                              </p>
                              <p className="text-sm text-gray-700">
                                {alert.logs.message}
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {alert.logs.level}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {alert.logs.category}
                                </Badge>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {alert.logs?.id && (
                          <Link href={`/logs/${alert.logs.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        
                        {alert.status === 'ACTIVE' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Reconhecer
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => resolveAlert(alert.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Resolver
                            </Button>
                          </>
                        )}
                        
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, totalCount)} de {totalCount} alertas
          </p>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              Anterior
            </Button>
            <span className="flex items-center px-3 py-2 text-sm">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}