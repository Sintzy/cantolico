'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  Globe, 
  Server, 
  Code,
  AlertCircle,
  Info,
  AlertTriangle,
  Bug,
  Skull,
  Shield,
  Copy,
  Eye,
  Archive
} from 'lucide-react';
import { useLogger } from '@/hooks/useLogger';

// ================================================
// INTERFACES
// ================================================

interface LogEntry {
  id: string;
  level: string;
  category: string;
  status: string;
  message: string;
  details: any;
  stack_trace: string;
  user_id: string;
  user_email: string;
  user_role: string;
  session_id: string;
  ip_address: string;
  user_agent: string;
  country_code: string;
  city: string;
  url: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  request_size_bytes: number;
  response_size_bytes: number;
  server_instance: string;
  environment: string;
  version: string;
  tags: string[];
  correlation_id: string;
  parent_log_id: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
}

interface RelatedLog {
  id: string;
  level: string;
  category: string;
  message: string;
  created_at: string;
  user_email: string;
}

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

// ================================================
// CONSTANTES
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

export default function LogDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const logger = useLogger();
  
  const [log, setLog] = useState<LogEntry | null>(null);
  const [relatedLogs, setRelatedLogs] = useState<RelatedLog[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  // ================================================
  // VERIFICAÇÕES E EFEITOS
  // ================================================

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || !['ADMIN', 'REVIEWER'].includes(session.user.role)) {
      router.push('/');
      return;
    }

    fetchLogDetails();
  }, [session, status, router, params.id]);

  // ================================================
  // FUNÇÕES DE DADOS
  // ================================================

  const fetchLogDetails = async () => {
    try {
      const response = await fetch(`/api/logs/${params.id}`);
      const data = await response.json();

      if (response.ok) {
        setLog(data.log);
        setRelatedLogs(data.relatedLogs || []);
        setSecurityAlerts(data.securityAlerts || []);
        
        // Log da visualização
        // logger.adminLog('Visualização de log detalhado', `log-${params.id}`, {
        //   logLevel: data.log.level,
        //   logCategory: data.log.category,
        //   hasSecurityAlerts: data.securityAlerts?.length > 0
        // });
      } else {
        console.error('Erro ao carregar log:', data.error);
        if (response.status === 404) {
          router.push('/logs');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar log:', error);
      // logger.error('SYSTEM', 'Erro ao carregar detalhes do log', {
      //   logId: params.id,
      //   error: error instanceof Error ? error.message : 'Erro desconhecido'
      // });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(text);
      // Aqui você pode adicionar um toast de sucesso
    } catch (error) {
      console.error('Erro ao copiar:', error);
    } finally {
      setCopying(false);
    }
  };

  const toggleArchive = async () => {
    if (!log) return;

    try {
      const response = await fetch(`/api/logs/${log.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !log.archived })
      });

      if (response.ok) {
        setLog(prev => prev ? { ...prev, archived: !prev.archived } : null);
        // logger.adminLog(
        //   log.archived ? 'Log desarquivado' : 'Log arquivado', 
        //   `log-${log.id}`,
        //   { action: log.archived ? 'unarchive' : 'archive' }
        // );
      }
    } catch (error) {
      console.error('Erro ao arquivar/desarquivar log:', error);
    }
  };

  // ================================================
  // FUNÇÕES AUXILIARES
  // ================================================

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-PT');
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getStatusCodeColor = (code: number) => {
    if (code >= 500) return 'text-red-600 bg-red-50';
    if (code >= 400) return 'text-yellow-600 bg-yellow-50';
    if (code >= 300) return 'text-blue-600 bg-blue-50';
    return 'text-green-600 bg-green-50';
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 4) return 'bg-red-100 text-red-800';
    if (severity >= 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  // ================================================
  // RENDERIZAÇÃO
  // ================================================

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || !['ADMIN', 'REVIEWER'].includes(session.user.role)) {
    return null;
  }

  if (!log) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Log não encontrado</h1>
          <Link href="/logs">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar aos logs
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const Icon = LOG_LEVEL_ICONS[log.level as keyof typeof LOG_LEVEL_ICONS];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/logs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar aos logs
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detalhes do Log</h1>
            <p className="text-gray-500">ID: {log.id}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            onClick={() => copyToClipboard(log.id)} 
            variant="outline" 
            size="sm"
            disabled={copying}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar ID
          </Button>
          <Button 
            onClick={toggleArchive} 
            variant="outline" 
            size="sm"
          >
            <Archive className="h-4 w-4 mr-2" />
            {log.archived ? 'Desarquivar' : 'Arquivar'}
          </Button>
        </div>
      </div>

      {/* Informações Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Icon className="h-5 w-5" />
              <span>Informações Básicas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
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
              {log.archived && (
                <Badge variant="outline" className="bg-gray-100 text-gray-800">
                  Arquivado
                </Badge>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Mensagem</label>
              <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded border">
                {log.message}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Data/Hora</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(log.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Ambiente</label>
                <p className="mt-1 text-sm text-gray-900">{log.environment}</p>
              </div>
            </div>

            {log.tags && log.tags.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Tags</label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {log.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Informações do Utilizador</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="mt-1 text-sm text-gray-900">{log.user_email || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Role</label>
                <p className="mt-1 text-sm text-gray-900">{log.user_role || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Session ID</label>
                <p className="mt-1 text-gray-900 font-mono bg-gray-50 p-2 rounded text-xs">
                  {log.session_id || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">IP Address</label>
                <p className="mt-1 text-sm text-gray-900">{log.ip_address || 'N/A'}</p>
              </div>
              {(log.country_code || log.city) && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Localização</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {[log.city, log.country_code].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Informações HTTP */}
        {(log.method || log.url || log.status_code || log.response_time_ms) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Informações HTTP</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {log.method && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Método</label>
                  <p className="mt-1 text-sm text-gray-900">{log.method}</p>
                </div>
              )}
              {log.url && (
                <div>
                  <label className="text-sm font-medium text-gray-500">URL</label>
                  <p className="mt-1 text-sm text-gray-900 break-all bg-gray-50 p-2 rounded">
                    {log.url}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {log.status_code && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status Code</label>
                    <div className="mt-1">
                      <Badge 
                        variant="outline"
                        className={getStatusCodeColor(log.status_code)}
                      >
                        {log.status_code}
                      </Badge>
                    </div>
                  </div>
                )}
                {log.response_time_ms && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tempo de Resposta</label>
                    <p className="mt-1 text-sm text-gray-900">{log.response_time_ms}ms</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {log.request_size_bytes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tamanho Request</label>
                    <p className="mt-1 text-sm text-gray-900">{formatBytes(log.request_size_bytes)}</p>
                  </div>
                )}
                {log.response_size_bytes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tamanho Response</label>
                    <p className="mt-1 text-sm text-gray-900">{formatBytes(log.response_size_bytes)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informações Técnicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <span>Informações Técnicas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Servidor</label>
                <p className="mt-1 text-sm text-gray-900">{log.server_instance}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Versão</label>
                <p className="mt-1 text-sm text-gray-900">{log.version || 'N/A'}</p>
              </div>
              {log.correlation_id && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Correlation ID</label>
                  <p className="mt-1 text-gray-900 font-mono bg-gray-50 p-2 rounded text-xs">
                    {log.correlation_id}
                  </p>
                </div>
              )}
              {log.parent_log_id && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Log Pai</label>
                  <Link href={`/logs/${log.parent_log_id}`}>
                    <p className="mt-1 text-blue-600 hover:underline font-mono bg-gray-50 p-2 rounded text-xs">
                      {log.parent_log_id}
                    </p>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalhes Técnicos */}
      {log.details && Object.keys(log.details).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Code className="h-5 w-5" />
              <span>Detalhes Técnicos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Stack Trace */}
      {log.stack_trace && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span>Stack Trace</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-red-50 text-red-900 p-4 rounded-lg text-sm overflow-auto max-h-64 border border-red-200">
              {log.stack_trace}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* User Agent */}
      {log.user_agent && (
        <Card>
          <CardHeader>
            <CardTitle>User Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border break-all">
              {log.user_agent}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Alertas de Segurança */}
      {securityAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-orange-500" />
              <span>Alertas de Segurança</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {securityAlerts.map((alert) => (
                <div key={alert.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge className={getSeverityColor(alert.severity)}>
                        Severidade {alert.severity}
                      </Badge>
                      <Badge variant="outline">{alert.alert_type}</Badge>
                      <Badge variant="outline">{alert.status}</Badge>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(alert.created_at)}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">{alert.title}</h4>
                  <p className="text-sm text-gray-700">{alert.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs Relacionados */}
      {relatedLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Logs Relacionados</span>
              <span className="text-sm text-gray-500">
                (Correlation ID: {log.correlation_id?.substring(0, 8)}...)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {relatedLogs.map((relatedLog) => (
                <div key={relatedLog.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge 
                        variant="outline" 
                        className={LOG_LEVEL_COLORS[relatedLog.level as keyof typeof LOG_LEVEL_COLORS]}
                      >
                        {relatedLog.level}
                      </Badge>
                      <Badge variant="outline">{relatedLog.category}</Badge>
                      <span className="text-sm text-gray-900">{relatedLog.message}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-gray-500">
                        {formatDate(relatedLog.created_at)}
                      </span>
                      <Link href={`/logs/${relatedLog.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                  {relatedLog.user_email && (
                    <p className="text-xs text-gray-500 mt-1">
                      {relatedLog.user_email}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}