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
  AlertCircle, 
  Info, 
  AlertTriangle, 
  Bug, 
  Skull,
  Shield,
  Clock,
  User,
  Globe,
  Search,
  Filter,
  Download,
  Trash2,
  Archive,
  Eye,
  RefreshCw,
  Settings
} from 'lucide-react';
import { useLogger } from '@/hooks/useLogger';

// ================================================
// INTERFACES E TIPOS
// ================================================

interface LogEntry {
  id: string;
  level: string;
  category: string;
  status: string;
  message: string;
  details: any;
  user_id: string;
  user_email: string;
  user_role: string;
  ip_address: string;
  user_agent: string;
  url: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  server_instance: string;
  environment: string;
  tags: string[];
  correlation_id: string;
  created_at: string;
  updated_at: string;
}

interface LogFilters {
  search: string;
  level: string;
  category: string;
  userId: string;
  startDate: string;
  endDate: string;
  ip: string;
}

// ================================================
// CONFIGURAÇÕES E CONSTANTES
// ================================================

const LOG_LEVEL_COLORS = {
  DEBUG: 'bg-gray-100 text-gray-800 border-gray-300',
  INFO: 'bg-blue-100 text-blue-800 border-blue-300',
  WARNING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  ERROR: 'bg-red-100 text-red-800 border-red-300',
  CRITICAL: 'bg-purple-100 text-purple-800 border-purple-300',
  SECURITY: 'bg-orange-100 text-orange-800 border-orange-300',
};

const LOG_LEVEL_ICONS = {
  DEBUG: Bug,
  INFO: Info,
  WARNING: AlertTriangle,
  ERROR: AlertCircle,
  CRITICAL: Skull,
  SECURITY: Shield,
};

const STATUS_COLORS = {
  SUCCESS: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  TIMEOUT: 'bg-orange-100 text-orange-800',
};

// ================================================
// COMPONENTE PRINCIPAL
// ================================================

export default function LogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const logger = useLogger();
  
  // Estado
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    errors: 0,
    warnings: 0,
    security: 0
  });
  
  // Filtros
  const [filters, setFilters] = useState<LogFilters>({
    search: '',
    level: 'all',
    category: 'all',
    userId: '',
    startDate: '',
    endDate: '',
    ip: ''
  });
  
  // Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 50;

  // ================================================
  // VERIFICAÇÕES DE AUTORIZAÇÃO
  // ================================================

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || !['ADMIN', 'REVIEWER'].includes(session.user.role)) {
      router.push('/');
      return;
    }

    // Log de acesso ao sistema de logs
    // logger.adminLog('Acesso ao sistema de logs', 'logs-dashboard', {
    //   userRole: session.user.role,
    //   timestamp: new Date().toISOString()
    // });
  }, [session, status, router]);

  // ================================================
  // FUNÇÕES DE DADOS
  // ================================================

  const fetchLogs = useCallback(async (resetPage = false) => {
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

      const response = await fetch(`/api/logs?${queryParams}`);
      const data = await response.json();

      if (response.ok) {
        setLogs(data.logs);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.totalCount);
        
        // Calcular estatísticas
        const newStats = {
          total: data.pagination.totalCount,
          errors: data.logs.filter((log: LogEntry) => 
            ['ERROR', 'CRITICAL'].includes(log.level)
          ).length,
          warnings: data.logs.filter((log: LogEntry) => 
            log.level === 'WARNING'
          ).length,
          security: data.logs.filter((log: LogEntry) => 
            log.level === 'SECURITY' || log.category === 'SECURITY'
          ).length
        };
        setStats(newStats);
        
      } else {
        console.error('Erro ao carregar logs:', data.error);
        // logger.error('SYSTEM', 'Erro ao carregar logs', { 
        //   error: data.error, 
        //   filters 
        // });
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      // logger.error('SYSTEM', 'Erro ao carregar logs', { 
      //   error: error instanceof Error ? error.message : 'Erro desconhecido',
      //   filters 
      // });
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  const refreshLogs = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
    
    // logger.info('ADMIN', 'Logs atualizados manualmente', {
    //   totalCount,
    //   filters
    // });
  };

  // ================================================
  // EFEITOS
  // ================================================

  useEffect(() => {
    if (session?.user?.role && ['ADMIN', 'REVIEWER'].includes(session.user.role)) {
      fetchLogs();
    }
  }, [fetchLogs, session]);

  // ================================================
  // HANDLERS
  // ================================================

  const handleFilterChange = (key: keyof LogFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSearch = () => {
    fetchLogs(true);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      level: '',
      category: '',
      userId: '',
      startDate: '',
      endDate: '',
      ip: ''
    });
    setPage(1);
  };

  const exportLogs = async () => {
    try {
      const queryParams = new URLSearchParams({
        limit: '1000',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      });

      const response = await fetch(`/api/logs?${queryParams}`);
      const data = await response.json();

      if (response.ok) {
        const csv = convertToCSV(data.logs);
        downloadCSV(csv, `logs-${new Date().toISOString().split('T')[0]}.csv`);
        
        // logger.adminLog('Exportação de logs', 'export', {
        //   recordCount: data.logs.length,
        //   filters
        // });
      }
    } catch (error) {
      console.error('Erro ao exportar logs:', error);
      // logger.error('ADMIN', 'Erro ao exportar logs', { 
      //   error: error instanceof Error ? error.message : 'Erro desconhecido' 
      // });
    }
  };

  // ================================================
  // FUNÇÕES AUXILIARES
  // ================================================

  const convertToCSV = (logs: LogEntry[]) => {
    const headers = [
      'ID', 'Level', 'Category', 'Message', 'User Email', 'IP Address',
      'URL', 'Method', 'Status Code', 'Response Time', 'Created At'
    ];
    
    const rows = logs.map(log => [
      log.id,
      log.level,
      log.category,
      log.message.replace(/"/g, '""'),
      log.user_email || '',
      log.ip_address || '',
      log.url || '',
      log.method || '',
      log.status_code || '',
      log.response_time_ms || '',
      log.created_at
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-PT');
  };

  const getStatusCodeColor = (code: number) => {
    if (code >= 500) return 'text-red-600';
    if (code >= 400) return 'text-yellow-600';
    if (code >= 300) return 'text-blue-600';
    return 'text-green-600';
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

  if (!session || !['ADMIN', 'REVIEWER'].includes(session.user.role)) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sistema de Logs</h1>
          <p className="text-gray-600 mt-1">
            Monitorização e análise completa de eventos do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={refreshLogs} 
            variant="outline" 
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={exportLogs} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Link href="/logs/analytics">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
          {/* Alertas button removed (API deleted) */}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Logs</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Período filtrado
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erros</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
            <p className="text-xs text-muted-foreground">
              Críticos e erros
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avisos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
            <p className="text-xs text-muted-foreground">
              Warnings
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Segurança</CardTitle>
            <Shield className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.security}</div>
            <p className="text-xs text-muted-foreground">
              Eventos de segurança
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Pesquisar mensagens, emails ou URLs..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            
            <Select value={filters.level} onValueChange={(value) => handleFilterChange('level', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os níveis</SelectItem>
                <SelectItem value="DEBUG">DEBUG</SelectItem>
                <SelectItem value="INFO">INFO</SelectItem>
                <SelectItem value="WARNING">WARNING</SelectItem>
                <SelectItem value="ERROR">ERROR</SelectItem>
                <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                <SelectItem value="SECURITY">SECURITY</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                <SelectItem value="AUTH">AUTH</SelectItem>
                <SelectItem value="MUSIC">MUSIC</SelectItem>
                <SelectItem value="PLAYLIST">PLAYLIST</SelectItem>
                <SelectItem value="USER">USER</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
                <SelectItem value="SYSTEM">SYSTEM</SelectItem>
                <SelectItem value="API">API</SelectItem>
                <SelectItem value="SECURITY">SECURITY</SelectItem>
                <SelectItem value="EMAIL">EMAIL</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              type="datetime-local"
              placeholder="Data início"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
            
            <Input
              type="datetime-local"
              placeholder="Data fim"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
            
            <Input
              placeholder="IP Address"
              value={filters.ip}
              onChange={(e) => handleFilterChange('ip', e.target.value)}
            />
            
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

      {/* Lista de Logs */}
      <Card>
        <CardHeader>
          <CardTitle>
            Logs do Sistema ({totalCount.toLocaleString()} registos)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-blue-500 bg-blue-100">
                <RefreshCw className="animate-spin -ml-1 mr-3 h-5 w-5" />
                A carregar as  logs...
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum log encontrado com os filtros aplicados</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {logs.map((log) => {
                const Icon = LOG_LEVEL_ICONS[log.level as keyof typeof LOG_LEVEL_ICONS];
                return (
                  <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <Icon className="h-5 w-5 mt-0.5 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge 
                              variant="outline" 
                              className={LOG_LEVEL_COLORS[log.level as keyof typeof LOG_LEVEL_COLORS]}
                            >
                              {log.level}
                            </Badge>
                            <Badge variant="outline">{log.category}</Badge>
                            {log.status && (
                              <Badge 
                                variant="outline"
                                className={STATUS_COLORS[log.status as keyof typeof STATUS_COLORS]}
                              >
                                {log.status}
                              </Badge>
                            )}
                            {log.method && (
                              <Badge variant="outline">{log.method}</Badge>
                            )}
                            {log.status_code && (
                              <Badge 
                                variant="outline"
                                className={getStatusCodeColor(log.status_code)}
                              >
                                {log.status_code}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {log.message}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDate(log.created_at)}
                            </span>
                            {log.user_email && (
                              <span className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                {log.user_email}
                              </span>
                            )}
                            {log.ip_address && (
                              <span className="flex items-center">
                                <Globe className="h-3 w-3 mr-1" />
                                {log.ip_address}
                              </span>
                            )}
                            {log.response_time_ms && (
                              <span>
                                {log.response_time_ms}ms
                              </span>
                            )}
                            {log.correlation_id && (
                              <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                                {log.correlation_id.substring(0, 8)}...
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Link href={`/logs/${log.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
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
            Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, totalCount)} de {totalCount.toLocaleString()} logs
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